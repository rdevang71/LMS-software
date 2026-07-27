import "dotenv/config";
import mongoose from "mongoose";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { seedDatabase } from "../src/seed.js";

const databaseReady = connectDatabase().then(async () => {
  if (mongoose.connection.readyState === 1) await seedDatabase();
});

export default async function handler(request, response) {
  await databaseReady;
  return app(request, response);
}
