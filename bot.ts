import { Telegraf, Markup } from "telegraf";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { walletAddresses } from "./wallets";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const bot = new Telegraf(process.env.TOKEN!);

const lastMessages = new Map<number, number>();
const userStates = new Map<number, string>();

async function startClaimProcess(ctx: any, address: string) {
  const userId = ctx.from.id;
  userStates.set(userId, "claiming");

  await ctx.reply(
    "⏳ *Processing your claim\\.\\.\\.* ⏳\n\nPlease wait while we verify and process your rewards\\. 🔍",
    {
      parse_mode: "MarkdownV2",
    }
  );

  // Imitate processing delay
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await ctx.reply(
    "🎉 *Claim Successful\\!* 🎉\n\nCongratulations\\! You have successfully claimed your rewards\\. 💰\n\n*Reward Details:*\n• 100 SOL Tokens\n• 50 Bonus Points\n\nThank you for participating\\! 🚀",
    {
      parse_mode: "MarkdownV2",
    }
  );

  userStates.delete(userId);
}

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
    "Welcome!\n\nTest test test.\nTest test test:\n\n1. Item one.\n2. Item two.\n3. Item three.",
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
      keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Back", "back")],
      ]);
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

// Instructions for claiming, DM the bot your address after registering etc.
bot.action("claim", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  userStates.set(userId, "awaiting_wallet");
  await ctx.reply(
    "🚀 *Claim Your Rewards\\!* 🚀\n\nPlease provide your Solana wallet address to start the claiming process\\. 💰\n\nMake sure it's a valid address\\!",
    {
      parse_mode: "MarkdownV2",
    }
  );
});

// !!!! Get the stats from DB, and cache it for 15 minutes to avoid spamming DB (mention its not 100% realtime)!!!!
bot.action("rewards_claimed", async (ctx) => {
  await ctx.answerCbQuery();
  await sendSubMenu(ctx, "X paid out: 1000\nY users: 500"); // Replace with actual stats
});

// Leaderboard data -- FROM DB!!!!
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
        return `${idx + 1}\. ${medal} ${user.name} \- ${user.points} points`;
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
        return `${idx + 1}\\. ${medal} ${user.name} \\- ${user.points} points`;
      })
      .join("\n");
  await sendSubMenu(ctx, leaderboardStr);
});

// claim process -> input address -> check if in walletAddresses (if not, write doublecheck, etc..) -> reply with instructions, and a button to 'CLAIM'
// which starts the process -> we add the wallet address to a database collection 'claimed' with a timestamp, and send out the tokens.
bot.on("text", async (ctx) => {
  if (ctx.chat.type === "private") {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const state = userStates.get(userId);

    if (state === "awaiting_wallet") {
      if (solanaAddressRegex.test(text)) {
        if (walletAddresses.includes(text)) {
          await startClaimProcess(ctx, text);
        } else {
          await ctx.reply(
            "❌ *Address Not Found* ❌\n\nThis wallet address is not eligible for claiming\\. Please double\\-check or try another address\\. 🔄",
            {
              parse_mode: "MarkdownV2",
            }
          );
          // Keep state to allow re-entering
        }
      } else {
        await ctx.reply(
          "❌ *Invalid Address* ❌\n\nPlease provide a valid Solana wallet address\\. 🔄",
          {
            parse_mode: "MarkdownV2",
          }
        );
        // Keep state
      }
    } else if (solanaAddressRegex.test(text)) {
      // Direct address input
      if (walletAddresses.includes(text)) {
        await startClaimProcess(ctx, text);
      } else {
        await ctx.reply("NOT_FOUND");
      }
    } else {
      await sendMainMenu(ctx);
    }
  }
});
