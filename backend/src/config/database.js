import dns from "node:dns";
import mongoose from "mongoose";

export async function connectDatabase() {
  const uri =
    process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/knowledgepath";
  const databaseName = process.env.MONGODB_DB_NAME ?? "knowledgepath";
  const dnsServers = process.env.MONGODB_DNS_SERVERS
    ?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (uri.startsWith("mongodb+srv://") && dnsServers?.length) {
    dns.setServers(dnsServers);
  }

  try {
    await mongoose.connect(uri, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(
      `MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`,
    );
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

export function getDatabaseStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] ?? "unknown";
}
