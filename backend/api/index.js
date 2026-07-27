import "dotenv/config";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";

const databaseReady = connectDatabase();

export default async function handler(request, response) {
  await databaseReady;
  return app(request, response);
}
