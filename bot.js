require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const app = express();
app.use(bodyParser.json());

const debounceTime = 30000; // 30 seconds debounce period
const recentJoins = new Map();

// Function to approve join requests with debouncing
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
    console.log(`Join request approved for user ${userId}`);
  } catch (err) {
    console.error(`Failed to approve join request: ${err.message}`);
  }
};

// Handle new member join requests with debouncing
bot.on('chat_join_request', async (msg) => {
  try {
    await approveJoinRequest(msg);
  } catch (error) {
    console.error('Error handling join request:', error.message);
  }
});

// Handle commands
bot.onText(/\/start/, async (msg) => {
  try {
    const response = await bot.sendMessage(msg.chat.id, `Hello, ${msg.from.first_name}! Welcome to the bot.`);
    console.log('Message sent successfully:', response);
  } catch (error) {
    console.error('Error sending message:', error.message);
  }
});

bot.onText(/\/help/, async (msg) => {
  try {
    const response = await bot.sendMessage(msg.chat.id, `List of available commands:
/start - Start using the bot
/help - Get help
`);
    console.log('Help message sent successfully:', response);
  } catch (error) {
    console.error('Error sending help message:', error.message);
  }
});

// Set up a route for health checks
app.get('/health', (req, res) => {
  res.send('Bot is running');
});

// Error handling for polling errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
