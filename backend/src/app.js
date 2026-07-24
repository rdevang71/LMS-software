import cors from "cors";
import express from "express";
import morgan from "morgan";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import lmsRoutes from "./routes/lms.routes.js";
import learningRoutes from "./routes/learning.routes.js";
import discussionRoutes from "./routes/discussion.routes.js";
import certificateRoutes from "./routes/certificate.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const app = express();
const allowedOrigins = (
  process.env.FRONTEND_URL ??
  "http://localhost:3000,http://localhost:5173,http://localhost:8080"
)
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

app.get("/", (_request, response) => {
  response.json({ message: "KnowledgePath backend" });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", uploadRoutes);
app.use("/api", certificateRoutes);
app.use("/api", learningRoutes);
app.use("/api", discussionRoutes);
app.use("/api", lmsRoutes);

app.use((_request, response) => {
  response.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  const status =
    error.status ??
    (error.code === 11000
      ? 409
      : error.name === "ValidationError" || error.name === "CastError"
        ? 400
        : 500);
  response.status(status).json({
    success: false,
    message:
      error.code === 11000
        ? "A record with that value already exists"
        : (error.message ?? "Internal server error"),
  });
});

export default app;
