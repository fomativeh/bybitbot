const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    username: String,
    chatId: String,
    fullname: String,
  },
  { timestamps: true }
);

const User = model("User", userSchema)
module.exports = User
