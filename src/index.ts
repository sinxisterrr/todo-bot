import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { handleTodo } from './commands/todo';
import { handleButton } from './handlers/buttons';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

client.once('clientReady', () => {
  console.log(`Ready: ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'todo') {
      await handleTodo(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
