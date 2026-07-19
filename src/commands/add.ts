import {
  ChatInputCommandInteraction,
  ChannelType,
  ThreadChannel,
  GuildMember,
} from 'discord.js';
import { store, PostTodoItem } from '../store';
import {
  formatTimestamp,
  buildPostTodoContent,
  buildPostTodoSelectRow,
  parsePostTodoContent,
  generateId,
} from '../utils';

function getDisplayName(interaction: ChatInputCommandInteraction): string {
  return (interaction.member as GuildMember)?.displayName ?? interaction.user.username;
}

export async function handleAdd(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const itemText = interaction.options.getString('item', true).trim();
  const displayName = getDisplayName(interaction);
  const addedAt = formatTimestamp(new Date());
  const guildId = interaction.guildId!;

  const channel = interaction.channel;
  if (
    !channel ||
    (channel.type !== ChannelType.PublicThread && channel.type !== ChannelType.PrivateThread) ||
    channel.parent?.type !== ChannelType.GuildForum
  ) {
    return interaction.editReply('Use `/add` inside a forum post thread.');
  }

  const thread = channel as ThreadChannel;
  const threadId = thread.id;

  if (thread.archived) await thread.setArchived(false);

  let postList = store.getPostTodoList(guildId, threadId);
  let message;

  if (postList) {
    try {
      message = await thread.messages.fetch(postList.messageId);
    } catch {
      postList = undefined;
    }
  }

  // Scan recent messages after a redeploy when the store is missing
  if (!postList) {
    const fetched = await thread.messages.fetch({ limit: 20 });
    const botId = interaction.client.user!.id;
    const candidate = fetched.find(
      m => m.author.id === botId && m.content.startsWith('## 📋 To-Do')
    );
    if (candidate) {
      const items = parsePostTodoContent(candidate.content);
      postList = { messageId: candidate.id, threadId, guildId, items };
      store.setPostTodoList(postList);
      message = candidate;
    }
  }

  const newItem: PostTodoItem = {
    itemId: generateId(),
    itemText,
    addedByName: displayName,
    addedAt,
    checked: false,
  };

  if (postList && message) {
    if (postList.items.length >= 25) {
      return interaction.editReply(
        'This post\'s to-do list is full (25 items max). Mark some items done first!'
      );
    }
    postList.items.push(newItem);
    store.setPostTodoList(postList);
    await message.edit({
      content: buildPostTodoContent(postList.items),
      components: [buildPostTodoSelectRow(postList.items, threadId)],
    });
  } else {
    const items = [newItem];
    const sent = await thread.send({
      content: buildPostTodoContent(items),
      components: [buildPostTodoSelectRow(items, threadId)],
    });
    store.setPostTodoList({ messageId: sent.id, threadId, guildId, items });
  }

  await interaction.editReply(`Added **"${itemText}"** to this post's to-do list!`);
}
