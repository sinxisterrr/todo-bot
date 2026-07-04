import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { handleTodo, handleTodoAutocomplete } from './commands/todo';
import { handleAdd } from './commands/add';
import { handleButton } from './handlers/buttons';

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
  new SlashCommandBuilder()
    .setName('add')
    .setDescription("Add a sub-task to the top message of this forum thread")
    .addStringOption(opt =>
      opt.setName('item').setDescription('The sub-task to add').setRequired(true)
    )
    .toJSON(),
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

client.once('clientReady', async (c) => {
  console.log(`Ready: ${c.user.tag}`);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  const guildId = process.env.GUILD_ID;

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(c.user.id, guildId), { body: commands });
      console.log('Slash commands registered (guild).');
    } else {
      await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
      console.log('Slash commands registered (global).');
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isAutocomplete() && interaction.commandName === 'todo') {
      await handleTodoAutocomplete(interaction);
    } else if (interaction.isChatInputCommand() && interaction.commandName === 'todo') {
      await handleTodo(interaction);
    } else if (interaction.isChatInputCommand() && interaction.commandName === 'add') {
      await handleAdd(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
