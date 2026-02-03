const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");

dotenv.config();

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

if (!token) {
  throw new Error("BOT_TOKEN is required to start the bot.");
}

const bot = new TelegramBot(token, { polling: true });
const adminModeByUser = new Map();

const buildStartKeyboard = () => {
  if (!webAppUrl) {
    return undefined;
  }

  return {
    inline_keyboard: [
      [
        {
          text: "Open Mini App",
          web_app: { url: webAppUrl },
        },
      ],
    ],
  };
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "there";
  const replyMarkup = buildStartKeyboard();
  const message = `Hi ${firstName}! Welcome to Gater Robot. Tap below to open the Mini App.`;

  bot.sendMessage(chatId, message, replyMarkup ? { reply_markup: replyMarkup } : undefined);
});

bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, "Unable to determine your user ID.");
    return;
  }

  const currentMode = adminModeByUser.get(userId) ?? false;
  const nextMode = !currentMode;

  adminModeByUser.set(userId, nextMode);

  const status = nextMode ? "enabled" : "disabled";
  bot.sendMessage(chatId, `Admin mode ${status}.`);
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

console.log("Gater Robot bot is running in polling mode.");
