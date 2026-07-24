import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  logout,
  me,
  refresh,
  signin,
  signup,
  updatePassword,
} from "../controllers/auth.controller.js";

const router = Router();
router.post("/signup", signup);
router.post("/signin", signin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.patch("/password", requireAuth, updatePassword);

export default router;
