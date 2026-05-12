const { Router } = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../db/prisma");
const { requireAuth, requireSuperAdmin } = require("../middleware/auth");

const router = Router();

function mapUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company || "",
    createdAt: user.createdAt,
  };
}

function mapClient(c) {
  return { id: c.id, name: c.name, email: c.email, company: c.company || "", createdAt: c.createdAt };
}

function parseId(raw) {
  const asInt = parseInt(raw, 10);
  return Number.isNaN(asInt) ? raw : asInt;
}

// ── ADMINS ────────────────────────────────────────────────────────────────────

router.get("/admins", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const admins = await prisma.user.findMany({ where: { role: "admin" }, orderBy: { createdAt: "desc" } });
    res.json(admins.map(mapUser));
  } catch (err) {
    console.error("[GET /admins]", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/admins", requireAuth, requireSuperAdmin, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email and password are required" });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), password: hashedPassword, role: "admin" },
    });
    res.status(201).json(mapUser(admin));
  } catch (err) {
    console.error("[POST /admins]", err);
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/admins/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const { name, email, password } = req.body;
  if (!name && !email && !password)
    return res.status(400).json({ error: "Provide at least one field to update" });
  try {
    const data = {};
    if (name)  data.name  = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (password && password.trim()) data.password = await bcrypt.hash(password, 10);
    const admin = await prisma.user.update({ where: { id }, data });
    res.json(mapUser(admin));
  } catch (err) {
    console.error("[PUT /admins/:id]", err);
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    if (err.code === "P2025") return res.status(404).json({ error: "Admin not found" });
    res.status(500).json({ error: err.message || "Server error" });
  }
});

router.delete("/admins/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: "Admin deleted" });
  } catch (err) {
    console.error("[DELETE /admins/:id]", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Admin not found" });
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// ── CLIENTS (super_admin only) ────────────────────────────────────────────────

router.get("/clients", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
    res.json(clients.map(mapClient));
  } catch (err) {
    console.error("[GET /clients]", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/clients", requireAuth, requireSuperAdmin, async (req, res) => {
  const { name, email, company, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email and password are required" });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const client = await prisma.client.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), company: company?.trim() || "", password: hashed },
    });
    await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), password: hashed, role: "client", company: company?.trim() || "" },
    }).catch(() => {});
    res.status(201).json(mapClient(client));
  } catch (err) {
    console.error("[POST /clients]", err);
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/clients/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const { name, email, company, password } = req.body;
  try {
    const old = await prisma.client.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!old) return res.status(404).json({ error: "Client not found" });
    const newEmail = email.trim().toLowerCase();
    const updateData = { name: name.trim(), email: newEmail, company: company?.trim() || "" };
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const client = await prisma.client.update({ where: { id: parseInt(req.params.id) }, data: updateData });
    const userUpdate = { name: name.trim(), email: newEmail };
    if (password) userUpdate.password = updateData.password;
    await prisma.user.updateMany({ where: { email: old.email }, data: userUpdate }).catch(() => {});
    if (old.email !== newEmail) {
      const projects = await prisma.project.findMany({ where: { clientUsers: { has: old.email } } });
      for (const p of projects) {
        await prisma.project.update({
          where: { id: p.id },
          data: { clientUsers: p.clientUsers.map(e => e === old.email ? newEmail : e) },
        });
      }
    }
    res.json(mapClient(client));
  } catch (err) {
    console.error("[PUT /clients/:id]", err);
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/clients/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!client) return res.status(404).json({ error: "Client not found" });
    await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
    const projects = await prisma.project.findMany({ where: { clientUsers: { has: client.email } } });
    for (const p of projects) {
      await prisma.project.update({
        where: { id: p.id },
        data: { clientUsers: p.clientUsers.filter(e => e !== client.email) },
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /clients/:id]", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
