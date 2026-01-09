import "dotenv/config";
import express from "express";
import cors from "cors";
import bookRoutes from "./routes/bookRoutes.js";
import connectDb from "./lib/db.js";
import router from "./routes/authRoutes.js";
import jobs from "./lib/cron.js";

const app = express();

const API_URL = process.env.API_URL || "https://book-backend-dt7d.onrender.com";

jobs.start();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:8082");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
}); */

app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", router);
app.use("/api/books", bookRoutes);

app.listen(API_URL, () => {
  connectDb();
  console.log(`server is running at port ${API_URL}...`);
});
