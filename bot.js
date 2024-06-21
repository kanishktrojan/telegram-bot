require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const winston = require('winston');

// Environment variables
const PORT = process.env.PORT || 10000;
const token = process.env.TELEGRAM_BOT_TOKEN;

// Telegram bot
const bot = new Telegraf(token);

// Express app
const app = express();
app.use(bodyParser.json());

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Handle new member join requests
bot.on('chat_join_request', async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;

  try {
    await bot.telegram.approveChatJoinRequest(chatId, userId);
    const welcomeMessage = await ctx.reply(`Welcome, ${ctx.from.first_name}!`);
    setTimeout(() => {
      ctx.deleteMessage(welcomeMessage.message_id)
        .catch((err) => {
          logger.error(`Failed to delete message: ${err}`);
        });
    }, 5000);
  } catch (err) {
    logger.error(`Failed to approve join request: ${err}`);
  }
});

// Command handling
bot.start((ctx) => ctx.reply('Welcome! I am your friendly bot. Use /help to see what I can do.'));
bot.help((ctx) => ctx.reply('Here are some commands you can use:\n/start - Start the bot\n/help - Show this help message'));

// Additional Commands
bot.command('ping', (ctx) => ctx.reply('Pong!'));
bot.command('info', (ctx) => {
  const infoMessage = `
  Bot Info:
  - Name: Friendly Bot
  - Creator: Kanishk
  - Version: 1.0.0
  `;
  ctx.reply(infoMessage);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('Bot is running');
});

// Middleware for error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Start bot with long polling
bot.launch().then(() => {
  logger.info('Bot started with long polling');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
