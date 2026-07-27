import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import {
  createAccessToken,
  createRefreshToken,
  getTokenExpiration,
  verifyRefreshToken,
} from "../middleware/auth.js";
import { User } from "../models/index.js";

const refreshCookieName = "lms_refresh_token";
const maxRefreshSessions = 5;

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  bio: user.bio,
  expertise: user.expertise,
  preferences: user.preferences,
});

const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

function refreshCookieOptions(remember = true, expiresAt) {
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure,
    sameSite: process.env.COOKIE_SAME_SITE ?? (secure ? "none" : "lax"),
    path: "/api/auth",
  };
  if (remember && expiresAt) options.expires = expiresAt;
  return options;
}

function clearRefreshCookie(response) {
  response.clearCookie(refreshCookieName, refreshCookieOptions(false));
}

async function issueSession(user, response, remember = true) {
  const refreshToken = createRefreshToken(user, remember);
  const expiresAt = getTokenExpiration(refreshToken);
  const now = new Date();
  const activeTokens = (user.refreshTokens ?? [])
    .filter((entry) => entry.expiresAt > now)
    .slice(-(maxRefreshSessions - 1));
  user.refreshTokens = [
    ...activeTokens,
    {
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  ];
  await user.save();
  response.cookie(
    refreshCookieName,
    refreshToken,
    refreshCookieOptions(remember, expiresAt),
  );
  return {
    accessToken: createAccessToken(user),
    user: publicUser(user),
  };
}

export async function signin(request, response, next) {
  try {
    const { email, password, role, remember = true } = request.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select(
      "+passwordHash +refreshTokens",
    );
    if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash)))
      return response
        .status(401)
        .json({ message: "Incorrect email or password" });
    if (role && user.role !== role)
      return response
        .status(403)
        .json({ message: `This account is registered as ${user.role}` });
    response.json(await issueSession(user, response, remember));
  } catch (error) {
    next(error);
  }
}

export async function refresh(request, response) {
  const token = request.cookies?.[refreshCookieName];
  if (!token)
    return response.status(401).json({ message: "Refresh token is missing" });

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub).select("+refreshTokens");
    const tokenHash = hashToken(token);
    const storedToken = user?.refreshTokens?.find(
      (entry) =>
        entry.tokenHash === tokenHash && entry.expiresAt > new Date(),
    );
    if (!user || !storedToken) {
      clearRefreshCookie(response);
      return response
        .status(401)
        .json({ message: "Refresh token is invalid or has been revoked" });
    }

    user.refreshTokens = user.refreshTokens.filter(
      (entry) => entry.tokenHash !== tokenHash,
    );
    response.json(
      await issueSession(user, response, payload.remember !== false),
    );
  } catch {
    clearRefreshCookie(response);
    response.status(401).json({ message: "Refresh token is invalid or expired" });
  }
}

export async function logout(request, response) {
  const token = request.cookies?.[refreshCookieName];
  try {
    if (token) {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.sub).select("+refreshTokens");
      if (user) {
        const tokenHash = hashToken(token);
        user.refreshTokens = user.refreshTokens.filter(
          (entry) => entry.tokenHash !== tokenHash,
        );
        await user.save();
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn(error.message);
  } finally {
    clearRefreshCookie(response);
  }

  response.status(204).end();
}

export function me(request, response) {
  response.json({ user: publicUser(request.user) });
}

export async function updatePassword(request, response, next) {
  try {
    const { currentPassword, newPassword } = request.body;
    const user = await User.findById(request.user.id).select(
      "+passwordHash +refreshTokens",
    );
    if (!(await bcrypt.compare(currentPassword ?? "", user.passwordHash)))
      return response
        .status(400)
        .json({ message: "Current password is incorrect" });
    if (!newPassword || newPassword.length < 6)
      return response
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.refreshTokens = [];
    const session = await issueSession(user, response, true);
    response.json({ message: "Password updated", ...session });
  } catch (error) {
    next(error);
  }
}
