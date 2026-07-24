import mongoose from "mongoose";

export async function connectDatabase() {
  const uri =
    process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/knowledgepath";

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(
      `MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`,
    );
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    console.error("Start your local MongoDB server, then restart the backend.");
  }
}

export function getDatabaseStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] ?? "unknown";
}
