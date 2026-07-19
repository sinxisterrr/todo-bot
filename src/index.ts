import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { handleTodo, handleTodoAutocomplete } from './commands/todo';
import { handleAdd } from './commands/add';
import { handleButton } from './handlers/buttons';
import { handleSelect } from './handlers/select';

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
    .setDescription("Add a sub-task to this post's to-do list")
    .addStringOption(opt =>
      opt.setName('item').setDescription('What needs doing').setRequired(true)
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
  const guildIds = (process.env.GUILD_ID ?? '')
    .split(/[,|]/)
    .map(s => s.trim())
    .filter(Boolean);

  try {
    for (const guildId of guildIds) {
      await rest.put(Routes.applicationGuildCommands(c.user.id, guildId), { body: commands });
      console.log(`Slash commands registered (guild ${guildId}).`);
    }
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('Slash commands registered (global).');
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
    } else if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
