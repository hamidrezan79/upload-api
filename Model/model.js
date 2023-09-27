const mongoose = require("mongoose");
const Buffer = require("buffer").Buffer;
const imageSchema = mongoose.Schema({
  Name: String,
  Path:String,
  Size:Number,
  ContentType:String,
  CreateAt:Date
});

module.exports = mongoose.model("image",imageSchema);
