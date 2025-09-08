import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TOKEN!);

bot.start((ctx) => ctx.reply('Welcome!'));

bot.on('text', (ctx) => {
  console.log('Received message:', ctx.message.text);
});

bot.launch();

console.log('Bot started');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
