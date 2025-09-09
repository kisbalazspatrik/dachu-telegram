import { Telegraf, Markup } from "telegraf";
import * as dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.TOKEN!);

const lastMessages = new Map<number, number>();

async function sendMainMenu(ctx: any) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  if (ctx.chat.type === "private") {
    const lastMessageId = lastMessages.get(userId);
    if (lastMessageId) {
      try {
        await ctx.deleteMessage(lastMessageId);
      } catch (e) {
        // ignore errors
      }
    }
  }

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("🎁 Claim", "claim"),
      Markup.button.callback("💰 Rewards Claimed", "rewards_claimed"),
    ],
    [Markup.button.callback("🏆 Leaderboard", "leaderboard")],
  ]);

  const message = await ctx.reply(
    "Welcome!\n\n Test test test.\n Test test test:\n\n1. Item one.\n2. Item two.\n3. Item three.",
    keyboard,
    {
      parse_mode: "MarkdownV2",
    }
  );
  lastMessages.set(userId, message.message_id);
}

async function sendSubMenu(ctx: any, text: string, extraKeyboard?: any) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  if (ctx.chat.type === "private") {
    const lastMessageId = lastMessages.get(userId);
    if (lastMessageId) {
      try {
        await ctx.deleteMessage(lastMessageId);
      } catch (e) {
        // ignore errors
      }
    }
  }

  let keyboard;
  if (ctx.chat.type === "private") {
    if (extraKeyboard) {
      keyboard = Markup.inlineKeyboard([
        ...extraKeyboard,
        [Markup.button.callback("⬅️ Back", "back")],
      ]);
    } else {
      keyboard = Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "back")]]);
    }
  } else {
    if (extraKeyboard) {
      keyboard = Markup.inlineKeyboard(extraKeyboard);
    } else {
      keyboard = Markup.inlineKeyboard([]);
    }
  }

  const message = await ctx.reply(text, keyboard, {
    parse_mode: "MarkdownV2",
  });
  lastMessages.set(userId, message.message_id);
}

bot.start((ctx) => {
  if (ctx.chat.type === "private") {
    sendMainMenu(ctx);
  } else {
    ctx.reply("Please message me in a private chat (DM) to use this bot!");
  }
});

bot.action("claim", async (ctx) => {
  await ctx.answerCbQuery();
  const extraKeyboard = [
    [Markup.button.url("🌐 Website", "https://example.com")], // Replace with actual website URL
  ];
  await sendSubMenu(ctx, "claim help", extraKeyboard);
});

bot.action("rewards_claimed", async (ctx) => {
  await ctx.answerCbQuery();
  await sendSubMenu(ctx, "X paid out: 1000\nY users: 500"); // Replace with actual stats
});

// Leaderboard data
const leaderboard = [
  { name: "User1", points: 100 },
  { name: "User2", points: 90 },
  { name: "User3", points: 80 },
  { name: "User4", points: 70 },
];

bot.action("leaderboard", async (ctx) => {
  await ctx.answerCbQuery();
  const leaderboardStr =
    "Mock Leaderboard:\n" +
    leaderboard
      .map((user, idx) => {
        let medal = "";
        if (idx === 0) medal = "🥇";
        else if (idx === 1) medal = "🥈";
        else if (idx === 2) medal = "🥉";
        return `${idx + 1}. ${medal} ${user.name} - ${user.points} points`;
      })
      .join("\n");
  await sendSubMenu(ctx, leaderboardStr);
});

bot.action("back", async (ctx) => {
  await ctx.answerCbQuery();
  await sendMainMenu(ctx);
});

bot.launch();

console.log("Bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.command("claim", async (ctx) => {
  const extraKeyboard = [
    [Markup.button.url("🌐 Website", "https://example.com")], // Replace with actual website URL
  ];
  await sendSubMenu(ctx, "claim help", extraKeyboard);
});

bot.command("rewards", async (ctx) => {
  await sendSubMenu(ctx, "X paid out: 1000\nY users: 500"); // Replace with actual stats
});

bot.command("leaderboard", async (ctx) => {
  const leaderboardStr =
    "Mock Leaderboard:\n" +
    leaderboard
      .map((user, idx) => {
        let medal = "";
        if (idx === 0) medal = "🥇";
        else if (idx === 1) medal = "🥈";
        else if (idx === 2) medal = "🥉";
        return `${idx + 1}. ${medal} ${user.name} - ${user.points} points`;
      })
      .join("\n");
  await sendSubMenu(ctx, leaderboardStr);
});

bot.on("text", async (ctx) => {
  if (ctx.chat.type === "private") {
    await sendMainMenu(ctx);
  }
});
