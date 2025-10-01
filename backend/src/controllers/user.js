import { start } from "repl";
import { Event, Config } from "../models/apistore.js";

const track = async (req, res) => {
  try {
    const apiKey = req.headers["x-track-api-key"];
    //console.log("new api hits");
    const starts = new Date();
    let events = [];
    if (Array.isArray(req.body.events)) {
      events = req.body.events;
    } else if (req.body && Object.keys(req.body).length > 0) {
      events = [req.body]; // single event
    }
    //console.log(events);
    if (events.length === 0) {
      return res.json({ success: true, count: 0, note: "No events to track" });
    }
    for (let e of events) {
      const { path } = e;
      if (e.type === "console") {
        await Event.create({ ...e, apiKey });
        continue; // go to next event
      }
      if (!path) {
        //console.log("st");
        await Event.create({
          apiKey,
          type: "Server Started",
          message: "Server starting",
          timestamp: new Date(),
        });

        continue;
      }
      let config = await Config.findOne({ apiKey, path });

      if (!config) {
        config = await Config.create({
          apiKey,
          path,
          tracer: true, // default ON
          apiEnabled: false,
          scheduling: { enabled: false },
          requestLimit: { enabled: false },
          startDate: new Date(),
        });
      }

      // --- Apply config rules ---
      if (!config.tracer) {
        await Event.create({
          apiKey,
          path,
          method: "GET",
          status: 400,
          type: "Tracking",
          response: { error: "API tracking is turned off" },
          timestamp: new Date(),
          durationMs: new Date() - starts,
        });

        continue;
      } // skip logging

      if (config.apiEnabled) {
        await Event.create({
          apiKey,
          path,
          method: "GET",
          status: 403,
          type: "api-disabled",
          response: { error: "API Enabled by config" },
          timestamp: new Date(),
          durationMs: new Date() - starts,
        });
        continue;
      }

      //console.log(config);
      if (config.scheduling?.enabled) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(
          2,
          "0"
        )}:${String(now.getMinutes()).padStart(2, "0")}`;

        if (
          currentTime < config.scheduling.startTime ||
          currentTime > config.scheduling.endTime
        ) {
          //console.log("hi");
          await Event.create({
            apiKey,
            path,
            method: "GET",
            status: 403,
            type: "Schedule1",
            response: { error: "Outside schedule window" },
            timestamp: new Date(),
            durationMs: new Date() - starts,
          });
          continue; // skip event outside schedule
        }
      }

      if (config.requestLimit?.enabled) {
        const now = new Date();
        let windowStart = new Date();

        if (config.requestLimit.rate === "sec") {
          windowStart.setMilliseconds(0);
        } else if (config.requestLimit.rate === "min") {
          windowStart.setSeconds(0, 0);
        } else if (config.requestLimit.rate === "hour") {
          windowStart.setMinutes(0, 0, 0);
        } else if (config.requestLimit.rate === "day") {
          windowStart.setHours(0, 0, 0, 0);
        }

        const requestCount = await Event.countDocuments({
          apiKey,
          path,
          method: "GET",
          status: 429,
          type: "Limiter",
          response: { error: "Rate limited API" },
          timestamp: { $gte: windowStart },
        });

        if (requestCount >= config.requestLimit.maxRequests) {
          continue;
        }
      }

      //console.log(e);
      await Event.create({ ...e, apiKey, path });
    }

    res.json({ success: true, count: events.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const uniqueapi = async (req, res) => {
  try {
    const logs = await Event.find();

    // Map with composite key "path|apiKey"
    const uniqueMap = new Map();

    logs.forEach((log) => {
      // Skip logs without a valid path
      if (!log.path) return;

      const key = `${log.path}|${log.apiKey}`;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          apiName: log.path,
          apiKey: log.apiKey,
          startDate: log.timestamp, // first seen timestamp
        });
      } else {
        // keep earliest date
        const existing = uniqueMap.get(key);
        if (new Date(log.timestamp) < new Date(existing.startDate)) {
          existing.startDate = log.timestamp;
        }
      }
    });

    res.json(Array.from(uniqueMap.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const configTime = async (req, res) => {
  try {
    const { apiKey, path, ...settings } = req.body;

    // Find existing config
    const existingConfig = await Config.findOne({ apiKey, path });

    if (!existingConfig) {
      return res
        .status(404)
        .json({ success: false, message: "Config not found" });
    }

    // Update only provided fields
    Object.keys(settings).forEach((key) => {
      existingConfig[key] = settings[key];
    });

    await existingConfig.save();

    res.json({ success: true, config: existingConfig });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getMonthlyEvents = async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ error: "year and month are required" });
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  try {
    const events = await Event.find({
      timestamp: { $gte: startDate, $lt: endDate },
      path: { $exists: true, $ne: "" },
    }).sort({ timestamp: 1 });

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getMyConfig = async (req, res) => {
  try {
    const { apiKey } = req.params;
    const { path } = req.query;

    if (!apiKey || !path) {
      return res.status(400).json({ error: "apiKey and path are required" });
    }

    // Find config for given apiKey + path
    const config = await Config.findOne({ apiKey, path });

    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const metrics = async (req, res) => {
  try {
    const logs = await Event.find();

    if (logs.length === 0) {
      return res.json({
        totalRequestVolume: 0,
        avgResponseTime: 0,
        uptime: 0,
        errorRate: 0,
        mostFrequentErrorCode: null,
        latestErrorTimestamp: null,
        avgPerDay: 0,
        peak: 0,
      });
    }

    const totalRequests = logs.length;
    const totalResponseTime = logs.reduce(
      (sum, log) => sum + (log.durationMs || 0),
      0
    );
    const successfulResponses = logs.filter(
      (log) => log.status >= 200 && log.status < 300
    ).length;

    const errorResponses = logs.filter(
      (log) => log.status >= 400 && log.status < 600
    ).length;

    const totalRequestVolume = totalRequests;

    const avgResponseTime = totalResponseTime / totalRequests;

    const uptime = (successfulResponses / totalRequests) * 100;

    const errorRate = (errorResponses / totalRequests) * 100;

    const errorCodes = logs.filter(
      (log) => log.status >= 400 && log.status < 600
    );
    let mostFrequentErrorCode = null;

    if (errorCodes.length > 0) {
      const freqMap = {};
      for (let log of errorCodes) {
        freqMap[log.status] = (freqMap[log.status] || 0) + 1;
      }
      mostFrequentErrorCode = Object.entries(freqMap).sort(
        (a, b) => b[1] - a[1]
      )[0][0];
    }
    const latestError = errorCodes.sort((a, b) => b.timestamp - a.timestamp)[0];
    const latestErrorTimestamp = latestError ? latestError.timestamp : null;
    const dailyCounts = {};

    logs.forEach((hit) => {
      const day = new Date(hit.timestamp).toISOString().split("T")[0]; // "YYYY-MM-DD"
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    // Step 2: Compute average
    const totalDays = Object.keys(dailyCounts).length;
    const totalHits = Object.values(dailyCounts).reduce((a, b) => a + b, 0);

    const avgPerDay = totalHits / totalDays;

    const peak = logs.reduce(
      (max, h) => (h.durationMs > max ? h.durationMs : max),
      0
    );

    //console.log(peak);
    res.json({
      totalRequestVolume,
      avgResponseTime,
      uptime,
      errorRate,
      mostFrequentErrorCode,
      latestErrorTimestamp,
      avgPerDay,
      peak,
    });
  } catch (err) {
    //console.error("Error fetching metrics:", err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
};

const graphdata = async (req, res) => {
  try {
    // Fetch all logs
    const logs = await Event.find();
    if (!logs) {
      return res.json({
        totalRequests: 0,
        successfulResponses: 0,
        uptime: 0,
        uptimeData: 0,
      });
    }
    const totalRequests = logs.length;
    const successfulResponses = logs.filter(
      (log) => log.status >= 200 && log.status < 300
    ).length;

    const uptime =
      totalRequests > 0 ? (successfulResponses / totalRequests) * 100 : 0;

    // Daily uptime aggregation
    const dailyLogs = await Event.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          total: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [
                {
                  $and: [{ $gte: ["$status", 200] }, { $lt: ["$status", 300] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const uptimeData = dailyLogs.map((day) => ({
      time: day._id,
      uptime: (day.successful / day.total) * 100,
    }));

    res.json({
      totalRequests,
      successfulResponses,
      uptime: uptime.toFixed(2),
      uptimeData, // ready for graph plotting
    });
  } catch (error) {
    //console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
const getRequestCount = async (req, res) => {
  try {
    const apiKey = req.headers["x-track-api-key"];
    const { path } = req.query;

    if (!apiKey || !path) {
      return res
        .status(400)
        .json({ success: false, message: "apiKey and path required" });
    }

    const config = await Config.findOne({ apiKey, path });
    if (!config || !config.requestLimit?.enabled) {
      return res.json({ blocked: false });
    }

    let windowStart = new Date();
    if (config.requestLimit.rate === "sec") windowStart.setMilliseconds(0);
    else if (config.requestLimit.rate === "min") windowStart.setSeconds(0, 0);
    else if (config.requestLimit.rate === "hour")
      windowStart.setMinutes(0, 0, 0);
    else if (config.requestLimit.rate === "day")
      windowStart.setHours(0, 0, 0, 0);

    const requestCount = await Event.countDocuments({
      apiKey,
      path,
      timestamp: { $gte: windowStart },
    });

    if (requestCount >= config.requestLimit.maxRequests) {
      return res.json({ blocked: true, reason: "Rate limit exceeded" });
    }

    res.json({ blocked: false });
  } catch (err) {
    res.status(500).json({ blocked: false, error: err.message });
  }
};
const getConfig = async (req, res) => {
  try {
    const apiKey = req.headers["x-track-api-key"];
    const { path } = req.query;

    if (!apiKey || !path) {
      return res
        .status(400)
        .json({ success: false, message: "apiKey and path required" });
    }

    const config = await Config.findOneAndUpdate(
      { apiKey, path }, // find query
      {
        $setOnInsert: {
          // only set these if inserting
          tracer: true,
          apiEnabled: false,
          scheduling: { enabled: false },
          requestLimit: { enabled: false },
          startDate: new Date(),
        },
      },
      { new: true, upsert: true } // create if not exist and return new doc
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
const trackedapis = async (req, res) => {
  const apis = await Event.find();

  if (!apis) {
    return res.json({ message: "No data available for this apikey" });
  }

  return res.json(apis);
};
export {
  track,
  uniqueapi,
  configTime,
  getMonthlyEvents,
  getMyConfig,
  metrics,
  graphdata,
  getRequestCount,
  getConfig,
  trackedapis,
};
