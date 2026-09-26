import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  plan: { type: String, enum: ["free", "bronze", "silver", "gold"], default: "free" },
  planexpires: { type: Date },
  theme: { type: String, enum: ["light", "dark"], default: "dark" },
  themesource: { type: String, enum: ["auto", "manual"], default: "auto" },
  knownlocations: [
    {
      city: String,
      state: String,
      country: String,
      lastseen: { type: Date, default: Date.now },
    },
  ],
  knowndevices: [
    {
      deviceid: String,
      label: String,
      lastseen: { type: Date, default: Date.now },
    },
  ],
  pendingotp: {
    hash: String,
    expires: Date,
    attempts: { type: Number, default: 0 },
    city: String,
    state: String,
    country: String,
    deviceid: String,
    devicelabel: String,
    sentat: Date,
  },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
