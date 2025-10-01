import mongoose from "mongoose";

// const eventSchema = new mongoose.Schema(
//   {
//     apiKey: String,
//     type: String,
//     level: String,
//     message: String,
//     url: String,
//     path: String,
//     status: Number,
//     durationMs: Number,
//     error: String,
//     timestamp: { type: Date, default: Date.now },
//     requestId: String,
//     requestPath: String,
//     response: mongoose.Schema.Types.Mixed,
//   },
//   { timestamps: true }
// );

const eventSchema = new mongoose.Schema(
  {
    apiKey: { type: String, required: true }, // key of your tracked app
    type: { type: String, default: "incoming" }, // incoming API request
    method: String, // HTTP method (GET, POST, DELETE, etc.)
    path: String, // API path
    status: Number, // HTTP status code
    durationMs: Number, // request duration in ms
    timestamp: { type: Date, default: Date.now }, // request start time
    response: mongoose.Schema.Types.Mixed, // response body

    // --- Capture all console outputs during request ---
    consoleLogs: [
      {
        level: String, // log, info, debug, warn, error, table, time, timeEnd
        message: String, // the console message
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // --- Capture all external backend calls (axios/fetch) ---
    externalCalls: [
      {
        method: String, // GET, POST, etc.
        url: String, // external API URL
        status: Number, // HTTP status code
        durationMs: Number, // request duration
        response: mongoose.Schema.Types.Mixed, // response body
        error: String, // if request failed
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true } // createdAt, updatedAt
);

const configSchema = new mongoose.Schema({
  apiKey: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  scheduling: {
    enabled: { type: Boolean, default: false },
    startTime: String,
    endTime: String,
  },
  requestLimit: {
    enabled: { type: Boolean, default: false },
    maxRequests: Number,
    rate: { type: String, enum: ["sec", "min", "hour", "day"] },
  },
  tracer: { type: Boolean, default: true },
  apiEnabled: { type: Boolean, default: false },
});

configSchema.index({ apiKey: 1, path: 1 }, { unique: true });

export default mongoose.model("Config", configSchema);

const Event = mongoose.model("Event", eventSchema);
const Config = mongoose.model("Config", configSchema);

export { Event, Config };
