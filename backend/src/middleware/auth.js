import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

const secret = () => process.env.JWT_SECRET ?? "development-only-secret";

export function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, secret(), {
    expiresIn: "30d",
  });
}

export async function requireAuth(request, response, next) {
  try {
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
      return response.status(401).json({ message: "Authentication required" });

    const payload = jwt.verify(token, secret());
    const user = await User.findById(payload.sub);
    if (!user)
      return response.status(401).json({ message: "Account no longer exists" });
    request.user = user;
    next();
  } catch {
    response.status(401).json({ message: "Invalid or expired session" });
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
