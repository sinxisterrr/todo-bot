import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
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

function normalizeForSearch(name: string): string {
  // Strip leading emoji/symbols like "👖│" to get the plain channel name
  return name.replace(/^[\s\S]*?│/, '').trim().toLowerCase();
}

export async function handleTodoAutocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const guild = interaction.guild;
  if (!guild) return interaction.respond([]);

  // Find the category the command is being run from
  const channel = interaction.channel;
  let categoryId: string | null = null;

  if (channel?.type === ChannelType.PublicThread || channel?.type === ChannelType.PrivateThread) {
    // Inside a forum post: thread → forum → category
    const thread = channel as ThreadChannel;
    categoryId = thread.parent?.parentId ?? null;
  } else if (channel && 'parentId' in channel) {
    categoryId = (channel as any).parentId ?? null;
  }

  if (!categoryId) return interaction.respond([]);

  const allChannels = await guild.channels.fetch();
  const results = [...allChannels.values()]
    .filter(ch => {
      if (!ch || ch.type !== ChannelType.GuildForum) return false;
      if ((ch as ForumChannel).parentId !== categoryId) return false;
      const raw = ch.name.toLowerCase();
      const normalized = normalizeForSearch(ch.name);
      return !focused || raw.includes(focused) || normalized.includes(focused);
    })
    .map(ch => ({ name: ch!.name, value: ch!.id }))
    .slice(0, 25);

  await interaction.respond(results);
}

export async function handleTodo(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const itemText = interaction.options.getString('item', true).trim();
  const targetChannelId = interaction.options.getString('channel');
  const displayName = getDisplayName(interaction);
  const addedAt = formatTimestamp(new Date());
  const guildId = interaction.guildId!;

  let forumChannel: ForumChannel;

  if (targetChannelId) {
    const fetched = await interaction.client.channels.fetch(targetChannelId).catch(() => null);
    if (!fetched || fetched.type !== ChannelType.GuildForum) {
      return interaction.editReply('Could not find the specified forum channel.');
    }
    forumChannel = fetched as ForumChannel;
  } else {
    const channel = interaction.channel;
    if (!channel) return interaction.editReply('Could not resolve channel.');

    if (
      (channel.type !== ChannelType.PublicThread && channel.type !== ChannelType.PrivateThread) ||
      channel.parent?.type !== ChannelType.GuildForum
    ) {
      return interaction.editReply(
        'Use this command inside a forum post, or pick a channel from the `channel` option.'
      );
    }
    forumChannel = channel.parent as ForumChannel;
  }

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

  // Store had no record (e.g. after redeploy) — scan existing threads before creating a new one
  if (!todoThread) {
    const active = await forumChannel.threads.fetchActive();
    todoThread = (active.threads.find(t => t.name === '📋 To-Do List') ?? null) as ThreadChannel | null;

    if (!todoThread) {
      const archived = await forumChannel.threads.fetchArchived({ type: 'public' });
      todoThread = (archived.threads.find(t => t.name === '📋 To-Do List') ?? null) as ThreadChannel | null;
    }

    if (todoThread) {
      store.setTodoThread(guildId, forumChannel.id, todoThread.id);
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

  const channelMention = targetChannelId ? ` to <#${forumChannel.id}>` : '';
  await interaction.editReply(
    `Added **"${itemText}"**${channelMention} and created a discussion thread!`
  );
}
