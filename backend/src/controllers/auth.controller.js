import bcrypt from "bcryptjs";
import { createToken } from "../middleware/auth.js";
import { User } from "../models/index.js";

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

export async function signup(request, response, next) {
  try {
    const { name, email, password, role = "student" } = request.body;
    if (!name || !email || !password)
      return response
        .status(400)
        .json({ message: "Name, email, and password are required" });
    if (!/^\S+@\S+\.\S+$/.test(email))
      return response
        .status(400)
        .json({ message: "Enter a valid email address" });
    if (password.length < 6)
      return response
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    if (!/^(student|instructor)$/.test(role))
      return response
        .status(400)
        .json({ message: "Choose student or instructor" });
    if (await User.exists({ email: email.toLowerCase() }))
      return response
        .status(409)
        .json({ message: "An account with this email already exists" });
    const user = await User.create({
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 12),
    });
    response
      .status(201)
      .json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function signin(request, response, next) {
  try {
    const { email, password, role } = request.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select(
      "+passwordHash",
    );
    if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash)))
      return response
        .status(401)
        .json({ message: "Incorrect email or password" });
    if (role && user.role !== role)
      return response
        .status(403)
        .json({ message: `This account is registered as ${user.role}` });
    response.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

export function me(request, response) {
  response.json({ user: publicUser(request.user) });
}

export async function updatePassword(request, response, next) {
  try {
    const { currentPassword, newPassword } = request.body;
    const user = await User.findById(request.user.id).select("+passwordHash");
    if (!(await bcrypt.compare(currentPassword ?? "", user.passwordHash)))
      return response
        .status(400)
        .json({ message: "Current password is incorrect" });
    if (!newPassword || newPassword.length < 6)
      return response
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    response.json({ message: "Password updated" });
  } catch (error) {
    next(error);
  }
}
