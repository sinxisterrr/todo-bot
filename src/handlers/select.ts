import { StringSelectMenuInteraction, GuildMember } from 'discord.js';
import { store } from '../store';
import {
  formatTimestamp,
  buildPostTodoContent,
  buildPostTodoSelectRow,
  parsePostTodoContent,
} from '../utils';

export async function handleSelect(interaction: StringSelectMenuInteraction) {
  const colonIdx = interaction.customId.indexOf(':');
  const action = interaction.customId.slice(0, colonIdx);
  const threadId = interaction.customId.slice(colonIdx + 1);
  if (action !== 'post_todo_toggle') return;

  await interaction.deferUpdate();

  const guildId = interaction.guildId!;
  const selectedIndex = parseInt(interaction.values[0], 10);

  let postList = store.getPostTodoList(guildId, threadId);

  // Reconstruct from message content after a redeploy
  if (!postList) {
    const items = parsePostTodoContent(interaction.message.content);
    if (!items.length) {
      await interaction.followUp({ content: 'Could not load the to-do list.', ephemeral: true });
      return;
    }
    postList = { messageId: interaction.message.id, threadId, guildId, items };
    store.setPostTodoList(postList);
  }

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= postList.items.length) {
    await interaction.followUp({ content: 'Invalid selection.', ephemeral: true });
    return;
  }

  const item = postList.items[selectedIndex];
  const displayName = (interaction.member as GuildMember)?.displayName ?? interaction.user.username;
  const now = formatTimestamp(new Date());

  item.checked = !item.checked;
  if (item.checked) {
    item.checkedByName = displayName;
    item.checkedAt = now;
  } else {
    delete item.checkedByName;
    delete item.checkedAt;
  }

  store.setPostTodoList(postList);

  await interaction.message.edit({
    content: buildPostTodoContent(postList.items),
    components: [buildPostTodoSelectRow(postList.items, threadId)],
  });
}
