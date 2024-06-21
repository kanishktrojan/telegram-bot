require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');

// Start the Express server
const PORT = process.env.PORT || 5000;
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const app = express();
app.use(bodyParser.json());

const debounceTime = 30000; // 30 seconds debounce period
const recentJoins = new Map();

const approveJoinRequest = async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  // Check if the user has rejoined within the debounce period
  if (recentJoins.has(userId) && (Date.now() - recentJoins.get(userId)) < debounceTime) {
    console.log(`Ignoring repeated join request from user ${userId}`);
    return;
  }

  try {
    // Automatically approve the join request
    await bot.approveChatJoinRequest(chatId, userId);

    // Record the join time
    recentJoins.set(userId, Date.now());

    // Send welcome message
    const sentMsg = await bot.sendMessage(chatId, `Hi ${msg.from.first_name}, Welcome to our Channel...`);

    // Schedule the message for deletion after 10 seconds
    setTimeout(async () => {
      try {
        await bot.deleteMessage(sentMsg.chat.id, sentMsg.message_id);
      } catch (err) {
        console.error(`Failed to delete message: ${err.message}`);
      }
    }, 5000);

  } catch (err) {
    console.error(`Failed to approve join request or send message: ${err.message}`);
  }
};

// Handle new member join requests with debouncing
bot.on('chat_join_request', _.debounce(approveJoinRequest, 1000, { 'leading': true }));

// Handle commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `Hello, ${msg.from.first_name}! Welcome to the bot.`);
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `List of available commands:
/start - Start using the bot
/help - Get help
`);
});

// Set up a route for health checks
app.get('/health', (req, res) => {
  res.send('Bot is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
