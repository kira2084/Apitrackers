import {
  uniqueapi,
  track,
  configTime,
  getMonthlyEvents,
  getMyConfig,
  metrics,
  graphdata,
  getRequestCount,
  getConfig,
  trackedapis,
} from "../controllers/user.js";
import express from "express";
const router = express.Router();

router.post("/api/track", track);
router.get("/api/unique-routes", uniqueapi);
router.post("/api/config", configTime);
router.get("/api/all", getMonthlyEvents);
router.get("/api/setconfig/:apiKey", getMyConfig);
router.get("/api/metric", metrics);
router.get("/api/graph", graphdata);
router.get("/api/requestCount", getRequestCount);
router.get("/api/config", getConfig);
router.get("/api/alls", trackedapis);
export default router;
