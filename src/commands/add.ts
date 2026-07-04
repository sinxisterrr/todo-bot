import {
  ChatInputCommandInteraction,
  ChannelType,
  ThreadChannel,
  GuildMember,
} from 'discord.js';
import { formatTimestamp } from '../utils';

function getDisplayName(interaction: ChatInputCommandInteraction): string {
  return (interaction.member as GuildMember)?.displayName ?? interaction.user.username;
}

const SUB_TASKS_HEADER = '\n\n**Sub-tasks:**';

export async function handleAdd(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const itemText = interaction.options.getString('item', true).trim();
  const displayName = getDisplayName(interaction);
  const addedAt = formatTimestamp(new Date());

  const channel = interaction.channel;
  if (
    !channel ||
    (channel.type !== ChannelType.PublicThread && channel.type !== ChannelType.PrivateThread)
  ) {
    return interaction.editReply('Use `/add` inside a forum post thread.');
  }

  const thread = channel as ThreadChannel;

  if (thread.name === '📋 To-Do List') {
    return interaction.editReply('Use `/todo` to add items to the main to-do list.');
  }

  // Always fetch fresh — no cache, so redeploys don't break anything
  const starterMessage = await thread.fetchStarterMessage({ force: true }).catch(() => null);
  if (!starterMessage) {
    return interaction.editReply('Could not find the top message in this thread.');
  }

  if (starterMessage.author.id !== interaction.client.user?.id) {
    return interaction.editReply("The top message wasn't posted by me, so I can't edit it.");
  }

  const existing = starterMessage.content;
  const newLine = `\n- ☐ **${itemText}** *(${displayName} • ${addedAt})*`;

  const updatedContent = existing.includes(SUB_TASKS_HEADER)
    ? existing + newLine
    : existing + SUB_TASKS_HEADER + newLine;

  await starterMessage.edit(updatedContent);
  await interaction.editReply(`Added sub-task: **"${itemText}"**`);
}
