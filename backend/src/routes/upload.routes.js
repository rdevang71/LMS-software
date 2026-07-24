import { Router } from "express";
import {
  createUploadSignature,
  deleteUpload,
} from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.post("/uploads/signature", requireAuth, createUploadSignature);
router.delete("/uploads/asset", requireAuth, deleteUpload);
export default router;
