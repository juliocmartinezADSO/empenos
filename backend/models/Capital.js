// models/Capital.js
import mongoose from "mongoose";

const capitalSchema = new mongoose.Schema({
  saldo: {
    type: Number,
    required: true,
    default: 0,
  },
});

const Capital = mongoose.model("Capital", capitalSchema);

export default Capital;
