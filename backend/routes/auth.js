const router  = require("express").Router();
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcrypt");
const prisma  = require("../db/prisma");
const { requireAuth } = require("../middleware/auth");

const SECRET = process.env.JWT_SECRET || "dev_secret";

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
  console.log("Login request:", req.body);

  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    console.log("Missing fields");
    return res.status(400).json({ error: "Email and password required" });
  }

  console.log("Finding user:", email);

  const user = await prisma.user.findFirst({
    where: { email: email },
  });

  console.log("User result:", user);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  let isValidPassword = false;

  if (user.password && user.password.startsWith("$2")) {
    console.log("Using bcrypt");
    isValidPassword = await bcrypt.compare(password, user.password);
  } else {
    console.log("Using plain password");
    isValidPassword = password === user.password;
  }

  console.log("Password match:", isValidPassword);

  if (!isValidPassword) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = jwt.sign(payload, SECRET, { expiresIn: "7d" });

  return res.json({ token, session: payload });

} catch (err) {
  console.error("LOGIN ERROR for user table:", err);
  return res.status(500).json({
    error: err.message || "Server error",
  });
}
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, SECRET);
    res.json({ session: { id: payload.id, email: payload.email, role: payload.role, name: payload.name } });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
