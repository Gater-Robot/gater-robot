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
    return null;
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

bot.onText(/^\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "there";
  const replyMarkup = buildStartKeyboard();
  const message = replyMarkup
    ? `Hi ${firstName}! Welcome to Gater Robot. Tap below to open the Mini App.`
    : `Hi ${firstName}! Welcome to Gater Robot. Configure WEBAPP_URL to enable the Mini App button.`;

  bot.sendMessage(chatId, message, replyMarkup ? { reply_markup: replyMarkup } : undefined);
});

bot.onText(/^\/admin(?:\s+(on|off|status))?/i, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, "Unable to determine your user ID.");
    return;
  }

  const currentMode = adminModeByUser.get(userId) ?? false;
  const command = match?.[1]?.toLowerCase();
  let nextMode = currentMode;

  if (command === "on") {
    nextMode = true;
  } else if (command === "off") {
    nextMode = false;
  } else if (!command || command === "status") {
    nextMode = command === "status" ? currentMode : !currentMode;
  }

  adminModeByUser.set(userId, nextMode);

  const status = nextMode ? "enabled" : "disabled";
  const suffix = command === "status" ? " (no change)" : "";
  bot.sendMessage(chatId, `Admin mode ${status}.${suffix}`);
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

console.log("Gater Robot bot is running in polling mode.");
