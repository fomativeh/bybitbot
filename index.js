const { Telegraf } = require("telegraf");
require("dotenv/config");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const Queue = require("queue-promise");
const User = require("./models/userModel");
const handleError = require("./helpers/handleError");
const Task = require("./models/taskModel");
const StartMessage = require("./models/startMessageModel");

let isBroadcasting = false;
let isTakingTask = false;
let isTakingStartMessage = false;
// Create a queue instance
const queue = new Queue({
  concurrent: 25, // Process one request at a time
  interval: 3000, // Interval between dequeue operations (1 second)
});

// const handleNewTask = async (ctx) => {
//   try {
//     ctx.reply(
//       "Send me task text and url seperated by a comma.\nE.g: Click me to join channel, t.me/blahblah"
//     );
//     isTakingTask = true;
//   } catch (error) {
//     console.log(error);
//     handleError(ctx);
//   }
// };

const handleNewBroadcast = async (ctx) => {
  try {
    ctx.reply("Send me a message to broadcast.");
    isBroadcasting = true;
  } catch (error) {
    console.log(error);
    handleError(ctx);
  }
};

const handleSetMessage = async (ctx) => {
  try {
    ctx.reply("Send me a message to reply people when they start the bot.");
    isTakingStartMessage = true;
  } catch (error) {
    console.log(error);
    handleError(ctx);
  }
};

bot.start(async (ctx) => {
  queue.enqueue(async () => {
    try {
      const { first_name, last_name, username, id } = ctx.from;

      const fullname = `${first_name} ${last_name}`;
      //CHECK IF USER EXISTS
      const userExists = await User.findOne({ chatId: id });

      //CREATE USER IF NONEXISTENT
      if (!userExists) {
        const newUser = new User({
          fullname,
          username,
          chatId: id,
        });

        await newUser.save();
      }

      const startMessage = await StartMessage.find();

      let replyText = ``;
      if (startMessage[0]) {
        replyText = `Hey there, *${username || fullname}*
${startMessage[0].message}`;
      } else {
        replyText = `Hey there, *${username || fullname}*`;
      }

      // const allTasks = await Task.find();
      // //   console.log(allTasks)

      // if (allTasks.length > 0) {
      //   const replyMarkup = {
      //     reply_markup: {
      //       inline_keyboard: allTasks.map((eachTask) => [
      //         {
      //           text: eachTask.text,
      //           url: eachTask.link.trim(),
      //         },
      //       ]),
      //     },
      //   };

      //   // console.log(replyMarkup.reply_markup.inline_keyboard[0])

      //   return await ctx.reply(replyText, {
      //     ...replyMarkup,
      //     parse_mode: "Markdown",
      //   });
      // }

      ctx.reply(replyText, { parse_mode: "Markdown" });
    } catch (error) {
      console.log(error);
      await handleError(ctx);
    }
  });
});

bot.on("message", async (ctx) => {
  try {
    let message = ctx.message.text.trim();
    if (!message) return;

    if (message.startsWith("/new-task")) {
      return await handleNewTask(ctx);
    }

    if (message.startsWith("/set-message")) {
      return await handleSetMessage(ctx);
    }

    if (message.startsWith("/broadcast")) {
      return await handleNewBroadcast(ctx);
    }

    if (isBroadcasting) {
      const allUsers = await User.find();
      ctx.reply("Broadcast started 🟢");
      isBroadcasting = false; //To prevent dupilcates
      let counter = 0;
      let lastLogged = 0;

      allUsers.forEach(async (eachUser) => {
        if (eachUser.chatId !== ctx.from.id) {
          const now = Date.now();
          let lastLogged;
          if (now - lastLogged >= 1000) {
            // 1000ms = 1 second
            counter = 0;
            lastLogged = now;
          }
          if (counter < 30) {
            await bot.telegram.sendMessage(eachUser.chatId, message);
            counter++;
          }
        }
      });

      ctx.reply("Broadcast ended ✅");
    }

    // if (isTakingTask) {
    //   if (!message.includes(",")) {
    //     return await ctx.reply(
    //       "Invalid task format. Send me task text and url seperated by a comma.\nE.g: Click me to join channel, t.me/blahblah"
    //     );
    //   }

    //   const taskDetails = message.split(",");
    //   const newTask = new Task({ text: taskDetails[0], link: taskDetails[1] });
    //   await newTask.save();
    //   ctx.reply(
    //     "Task saved to database. Use the /start command to see updated tasks."
    //   );
    //   isTakingTask = false;
    // }

    if (isTakingStartMessage) {
      const previousMessage = await StartMessage.find();

      //Delete previous messages if available
      if (previousMessage || previousMessage?.length > 0) {
        await StartMessage.deleteMany(previousMessage);
      }

      const newMessage = new StartMessage({ message });
      await newMessage.save();
      ctx.reply("Message saved. Use the /start command to see the update.");
    }
  } catch (error) {
    console.log(error);
    handleError(error);
  }
});
// SET THE BOT COMMANDS
bot.telegram.setMyCommands([
  { command: "start", description: "Start Cryptosignals_bybitbot" },
]);

app.get("/", (req, res) => {
  res.send("Hello world");
});

const PORT = process.env.PORT || 6000;
//INITIATE SERVER LISTENER
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

//LAUNCH THE BOT
bot.launch();

//CONNECT THE SERVER TO THE DATABASE
mongoose
  .connect(process.env.URI)
  .then(() => console.log("Connected to db"))
  .catch((error) => console.log(error));
