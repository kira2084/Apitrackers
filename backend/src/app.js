import express from "express";
import cors from "cors";
import router from "./routers/router.js";
import dotenv from "dotenv";
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", router);
export default app;
