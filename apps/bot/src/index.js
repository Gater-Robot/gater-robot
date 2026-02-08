const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");

dotenv.config();

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

if (!token) {
  throw new Error("BOT_TOKEN is required to start the bot.");
}

const bot = new TelegramBot(token, { polling: true });

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

  if (adminIds.length > 0) {
    const userId = msg.from?.id;
    if (!userId || !adminIds.includes(String(userId))) {
      sendMessageSafe(chatId, "You are not authorized to use admin mode.");
      return;
    }
  }

  const adminUrl = "https://t.me/GaterRobot/admin";
  sendMessageSafe(chatId, "Tap below to open the admin panel.", {
    reply_markup: {
      inline_keyboard: [[{ text: "Open Admin Panel", url: adminUrl }]],
    },
  });
});

const buildHealthKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "Open Health Diagnostics",
          web_app: { url: new URL("/health?access=admin", webAppUrl).href },
        },
      ],
    ],
  },
});

bot.onText(/\/health/, (msg) => {
  const chatId = msg.chat.id;

  if (!webAppUrl) {
    sendMessageSafe(
      chatId,
      "Health diagnostics unavailable. WEBAPP_URL is not configured.",
    );
    return;
  }

  sendMessageSafe(
    chatId,
    "Tap below to view system health and diagnostics.",
    buildHealthKeyboard(),
  );
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

console.log("Gater Robot bot is running in polling mode.");
