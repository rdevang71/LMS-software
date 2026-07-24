import { Router } from "express";
import { verifyCertificate } from "../controllers/certificate.controller.js";
const router = Router();
router.get("/certificates/verify/:certificateId", verifyCertificate);
export default router;
