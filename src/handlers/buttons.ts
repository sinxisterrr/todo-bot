import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
} from 'discord.js';
import { store } from '../store';
import { formatTimestamp, buildItemContent } from '../utils';

export async function handleButton(interaction: ButtonInteraction) {
  const [action, itemId] = interaction.customId.split(':');
  if (action !== 'todo_check') return;

  await interaction.deferUpdate();

  const item = store.getItem(itemId);
  if (!item) {
    await interaction.followUp({ content: 'Could not find this item.', ephemeral: true });
    return;
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
