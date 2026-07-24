import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

function tokenSecret(name, legacyFallback) {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be configured in production`);
  }
  return process.env.JWT_SECRET ?? legacyFallback;
}

const accessSecret = () =>
  tokenSecret("ACCESS_TOKEN_SECRET", "development-access-token-secret");
const refreshSecret = () =>
  tokenSecret("REFRESH_TOKEN_SECRET", "development-refresh-token-secret");

export function createAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, type: "access" },
    accessSecret(),
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m",
    },
  );
}

export function createRefreshToken(user, remember = true) {
  return jwt.sign(
    { sub: user.id, type: "refresh", remember: Boolean(remember) },
    refreshSecret(),
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",
      jwtid: randomUUID(),
    },
  );
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, refreshSecret());
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return payload;
}

export function getTokenExpiration(token) {
  const payload = jwt.decode(token);
  if (!payload?.exp) throw new Error("Token expiration is missing");
  return new Date(payload.exp * 1000);
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, accessSecret());
  if (payload.type !== "access") throw new Error("Invalid token type");
  return payload;
}

export async function requireAuth(request, response, next) {
  try {
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
      return response.status(401).json({ message: "Authentication required" });

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user)
      return response.status(401).json({ message: "Account no longer exists" });
    request.user = user;
    next();
  } catch {
    response.status(401).json({ message: "Invalid or expired access token" });
  }
}

export function allowRoles(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return response
        .status(403)
        .json({ message: "You do not have permission for this action" });
    }
    next();
  };
}
