const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");

dotenv.config();

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

if (!token) {
  throw new Error("BOT_TOKEN is required to start the bot.");
}

const bot = new TelegramBot(token, { polling: true });
// Note: admin mode is stored in-memory and resets on restart.
const adminModeByUser = new Map();

const adminIds = (process.env.ADMIN_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const sendMessageSafe = (chatId, text, options) =>
  bot.sendMessage(chatId, text, options).catch((error) => {
    console.error("Failed to send message:", error);
  });

const buildStartKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "Open Mini App",
          web_app: { url: webAppUrl },
        },
      ],
    ],
  },
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "there";
  const message = `Hi ${firstName}! Welcome to Gater Robot.`;

  if (!webAppUrl) {
    sendMessageSafe(
      chatId,
      `${message} The Mini App URL is not configured yet. Please set WEBAPP_URL in the bot environment.`,
    );
    return;
  }

  sendMessageSafe(
    chatId,
    `${message} Tap below to open the Mini App.`,
    buildStartKeyboard(),
  );
});

bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    sendMessageSafe(chatId, "Unable to determine your user ID.");
    return;
  }

  if (adminIds.length === 0) {
    sendMessageSafe(
      chatId,
      "Admin mode is not configured. Please set ADMIN_IDS in the bot environment.",
    );
    return;
  }

  if (!adminIds.includes(String(userId))) {
    sendMessageSafe(chatId, "You are not authorized to use admin mode.");
    return;
  }

  const currentMode = adminModeByUser.get(userId) ?? false;
  const nextMode = !currentMode;

  adminModeByUser.set(userId, nextMode);

  const status = nextMode ? "enabled" : "disabled";
  sendMessageSafe(chatId, `Admin mode ${status}. Use /admin again to toggle.`);
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

console.log("Gater Robot bot is running in polling mode.");
