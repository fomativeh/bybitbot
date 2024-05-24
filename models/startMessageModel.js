const { Schema, model } = require("mongoose");

const startMessageSchema = new Schema(
  {
    message:String,
  },
  { timestamps: true }
);

const StartMessage = model("StartMessage", startMessageSchema)
module.exports = StartMessage
