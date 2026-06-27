import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('todo')
    .setDescription("Add a to-do item to a forum channel's list")
    .addStringOption(opt =>
      opt.setName('item').setDescription('What needs doing').setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('channel')
        .setDescription('Forum channel to add to (defaults to current channel)')
        .setAutocomplete(true)
    )
    .toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID;

(async () => {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Commands deployed to guild (instant).');
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Commands deployed globally (may take up to 1 hour to propagate).');
  }
})();
