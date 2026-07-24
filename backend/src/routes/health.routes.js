import { Router } from "express";
import { getDatabaseStatus } from "../config/database.js";

const router = Router();

router.get("/", (_request, response) => {
  response.json({
    success: true,
    message: "KnowledgePath API is running",
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
