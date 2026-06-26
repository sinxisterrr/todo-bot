import {
  ChatInputCommandInteraction,
  ChannelType,
  ChannelFlags,
  ThreadAutoArchiveDuration,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  ThreadChannel,
  ForumChannel,
} from 'discord.js';
import { store } from '../store';
import { formatTimestamp, buildItemContent, generateId } from '../utils';

function getDisplayName(interaction: ChatInputCommandInteraction): string {
  return (interaction.member as GuildMember)?.displayName ?? interaction.user.username;
}

export async function handleTodo(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const itemText = interaction.options.getString('item', true).trim();
  const displayName = getDisplayName(interaction);
  const addedAt = formatTimestamp(new Date());
  const guildId = interaction.guildId!;

  // Resolve which forum channel this command is coming from
  const channel = interaction.channel;
  if (!channel) return interaction.editReply('Could not resolve channel.');

  // Slash commands in forum channels are always run from within a thread (post)
  if (
    (channel.type !== ChannelType.PublicThread && channel.type !== ChannelType.PrivateThread) ||
    channel.parent?.type !== ChannelType.GuildForum
  ) {
    return interaction.editReply('This command only works inside forum channel posts.');
  }
  const forumChannel = channel.parent as ForumChannel;

  // Find or create the pinned to-do thread for this forum channel
  let todoThreadId = store.getTodoThread(guildId, forumChannel.id);
  let todoThread: ThreadChannel | null = null;

  if (todoThreadId) {
    try {
      const fetched = await interaction.client.channels.fetch(todoThreadId);
      if (fetched?.isThread()) todoThread = fetched as ThreadChannel;
    } catch {
      todoThreadId = undefined;
    }
  }

  if (!todoThread) {
    todoThread = await forumChannel.threads.create({
      name: '📋 To-Do List',
      message: {
        content:
          `# 📋 To-Do List — ${forumChannel.name}\n` +
          `Use \`/todo <item>\` to add tasks. Click **Mark Done** on any item to check it off.`,
      },
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    });
    await todoThread.edit({ flags: ChannelFlags.Pinned });
    store.setTodoThread(guildId, forumChannel.id, todoThread.id);
  }

  if (todoThread.archived) await todoThread.setArchived(false);

  // Create a discussion forum post for this specific item
  const threadName = itemText.length > 100 ? itemText.slice(0, 97) + '...' : itemText;
  const discussionThread = await forumChannel.threads.create({
    name: threadName,
    message: {
      content:
        `## ${itemText}\n` +
        `> Added by **${displayName}** • ${addedAt}\n\n` +
        `Use this thread to discuss and track progress on this task.`,
    },
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
  });

  // Post the item to the to-do thread
  const itemId = generateId();
  const content = buildItemContent(itemText, displayName, addedAt, false);
  const discussionUrl = `https://discord.com/channels/${guildId}/${discussionThread.id}`;

  const msg = await todoThread.send({
    content,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`todo_check:${itemId}`)
          .setLabel('Mark Done')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setLabel('Discussion')
          .setStyle(ButtonStyle.Link)
          .setURL(discussionUrl)
          .setEmoji('💬'),
      ),
    ],
  });

  store.saveItem({
    itemId,
    messageId: msg.id,
    guildId,
    channelId: forumChannel.id,
    todoThreadId: todoThread.id,
    discussionThreadId: discussionThread.id,
    itemText,
    addedById: interaction.user.id,
    addedByName: displayName,
    addedAt,
    checked: false,
  });

  await interaction.editReply(
    `Added **"${itemText}"** to the list and created a discussion thread!`
  );
}
