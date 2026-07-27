import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { seedDatabase } from "./seed.js";

const port = Number(process.env.PORT) || 5000;

await connectDatabase();
if (mongoose.connection.readyState === 1) await seedDatabase();

const server = app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
