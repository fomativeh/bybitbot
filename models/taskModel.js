const { Schema, model } = require("mongoose");

const taskSchema = new Schema(
  {
    text:String,
    link:String,
  },
  { timestamps: true }
);

const Task = model("Task", taskSchema)
module.exports = Task
