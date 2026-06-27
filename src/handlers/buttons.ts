import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  ComponentType,
  ThreadChannel,
} from 'discord.js';
import { store, TodoItem } from '../store';
import { formatTimestamp, buildItemContent } from '../utils';

function reconstructItem(itemId: string, interaction: ButtonInteraction): TodoItem | null {
  const msg = interaction.message;
  const content = msg.content;

  const checked = content.startsWith('✅');
  const textMatch = checked
    ? content.match(/^✅ ~~(.+?)~~/)
    : content.match(/^☐ \*\*(.+?)\*\*/);
  if (!textMatch) return null;

  const addedMatch = content.match(/Added by \*\*(.+?)\*\* • (.+)/m);
  if (!addedMatch) return null;

  let discussionThreadId: string | undefined;
  for (const row of msg.components) {
    if (row.type !== ComponentType.ActionRow) continue;
    for (const comp of row.components) {
      if (comp.type === ComponentType.Button && comp.url) {
        const urlMatch = comp.url.match(/channels\/\d+\/(\d+)$/);
        if (urlMatch) discussionThreadId = urlMatch[1];
      }
    }
  }

  const guildId = interaction.guildId!;
  const todoThreadId = msg.channelId;
  const channelId = (msg.channel as ThreadChannel).parentId ?? '';

  return {
    itemId,
    messageId: msg.id,
    guildId,
    channelId,
    todoThreadId,
    discussionThreadId,
    itemText: textMatch[1],
    addedById: '',
    addedByName: addedMatch[1],
    addedAt: addedMatch[2].split('\n')[0].trim(),
    checked,
  };
}

export async function handleButton(interaction: ButtonInteraction) {
  const [action, itemId] = interaction.customId.split(':');
  if (action !== 'todo_check') return;

  await interaction.deferUpdate();

  let item = store.getItem(itemId);
  if (!item) {
    const reconstructed = reconstructItem(itemId, interaction);
    if (!reconstructed) {
      await interaction.followUp({ content: 'Could not find this item.', ephemeral: true });
      return;
    }
    store.saveItem(reconstructed);
    item = reconstructed;
  }

  const displayName = (interaction.member as GuildMember)?.displayName ?? interaction.user.username;
  const now = formatTimestamp(new Date());
  const newChecked = !item.checked;

  store.updateItem(itemId, {
    checked: newChecked,
    checkedById: newChecked ? interaction.user.id : undefined,
    checkedByName: newChecked ? displayName : undefined,
    checkedAt: newChecked ? now : undefined,
  });

  const content = buildItemContent(
    item.itemText,
    item.addedByName,
    item.addedAt,
    newChecked,
    newChecked ? displayName : undefined,
    newChecked ? now : undefined,
  );

  const buttons = [
    new ButtonBuilder()
      .setCustomId(`todo_check:${itemId}`)
      .setLabel(newChecked ? 'Undo' : 'Mark Done')
      .setStyle(newChecked ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setEmoji(newChecked ? '↩️' : '✅'),
  ];

  if (item.discussionThreadId) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('Discussion')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${item.guildId}/${item.discussionThreadId}`)
        .setEmoji('💬'),
    );
  }

  await interaction.message.edit({
    content,
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)],
  });
}
