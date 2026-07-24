import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  addReply,
  getDiscussion,
  toggleAnswered,
  toggleLike,
} from "../controllers/discussion.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/discussions/:discussionId/thread", getDiscussion);
router.post("/discussions/:discussionId/replies", addReply);
router.patch("/discussions/:discussionId/like", toggleLike);
router.patch("/discussions/:discussionId/answered", toggleAnswered);
export default router;
