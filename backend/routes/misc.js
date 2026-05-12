const { Router } = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../db/prisma");
const { requireAuth, requireAdmin, requireSuperAdmin, requireFullAdmin } = require("../middleware/auth");

// Clients
const clientsRouter = Router();

function mapClient(c) {
  return { id: c.id, name: c.name, email: c.email, company: c.company || "", createdAt: c.createdAt };
}

clientsRouter.get("/", requireAuth, async (_req, res) => {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  res.json(clients.map(mapClient));
});

clientsRouter.post("/", requireAuth, async (req, res) => {
  const { name, email, company, password } = req.body;
  if (!name || !email) return res.status(400).json({ error: "name and email required" });
  if (!password || !password.trim()) return res.status(400).json({ error: "password required" });

  try {
    const hashed = await bcrypt.hash(password, 10);

    const client = await prisma.client.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), company: company?.trim() || "", password: hashed },
    });

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role: "client",
        company: company?.trim() || "",
      },
    }).catch(() => {});

    res.status(201).json(mapClient(client));
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

clientsRouter.put("/:id", requireAuth, async (req, res) => {
  const { name, email, company, password } = req.body;
  try {
    const old = await prisma.client.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!old) return res.status(404).json({ error: "Client not found" });

    const newEmail = email.trim().toLowerCase();
    const updateData = { name: name.trim(), email: newEmail, company: company?.trim() || "" };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });

    const userUpdate = { name: name.trim(), email: newEmail };
    if (password) userUpdate.password = updateData.password;

    await prisma.user.updateMany({
      where: { email: old.email },
      data: userUpdate,
    }).catch(() => {});

    if (old.email !== newEmail) {
      const projects = await prisma.project.findMany({
        where: { clientUsers: { has: old.email } },
      });
      for (const p of projects) {
        await prisma.project.update({
          where: { id: p.id },
          data: { clientUsers: p.clientUsers.map(e => e === old.email ? newEmail : e) },
        });
      }
    }

    res.json(mapClient(client));
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

clientsRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!client) return res.status(404).json({ error: "Client not found" });

    await prisma.client.delete({ where: { id: parseInt(req.params.id) } });

    const projects = await prisma.project.findMany({
      where: { clientUsers: { has: client.email } },
    });
    for (const p of projects) {
      await prisma.project.update({
        where: { id: p.id },
        data: { clientUsers: p.clientUsers.filter(e => e !== client.email) },
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// ── Promotion Types ──
const typesRouter = Router();

// This function formats DB data into API response shape
function mapType(t) {
  return {
    id: t.id,
    name: t.name,
    description: t.description || "",
    createdAt: t.createdAt
  };
}

// GET all promotion types
typesRouter.get("/", requireAuth, async (_req, res) => {
  try {
    console.log("==== GET /api/types HIT ====");

    // Fetch types from DB
    const types = await prisma.promotionType.findMany({
      orderBy: { name: "asc" }
    });

    console.log("Types fetched from DB:", types);
    console.log("Total types count:", types.length);

    res.json(types.map(mapType));
  } catch (err) {
    console.error("ERROR in GET /api/types:", err);
    res.status(500).json({
      error: "Failed to fetch promotion types",
      message: err.message
    });
  }
});

// CREATE new promotion type
typesRouter.post("/", requireAuth, async (req, res) => {
  try {
    console.log("==== POST /api/types HIT ====");
    console.log("Request body:", req.body);

    const { name, description } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      console.log("Validation failed: name missing");
      return res.status(400).json({ error: "name required" });
    }

    // Create new type
    const type = await prisma.promotionType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || ""
      }
    });

    console.log("Created type:", type);

    res.status(201).json(mapType(type));
  } catch (err) {
    console.error("ERROR in POST /api/types:", err);
    res.status(500).json({
      error: "Failed to create promotion type",
      message: err.message
    });
  }
});

// UPDATE promotion type
typesRouter.put("/:id", requireAuth, async (req, res) => {
  try {
    console.log("==== PUT /api/types/:id HIT ====");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    const { name, description } = req.body;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      console.log("Invalid ID:", req.params.id);
      return res.status(400).json({ error: "Invalid ID" });
    }

    const type = await prisma.promotionType.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim() || ""
      }
    });

    console.log("Updated type:", type);

    res.json(mapType(type));
  } catch (err) {
    if (err.code === "P2025") {
      console.log("Type not found for update");
      return res.status(404).json({ error: "Type not found" });
    }

    console.error("ERROR in PUT /api/types:", err);
    res.status(500).json({
      error: "Failed to update promotion type",
      message: err.message
    });
  }
});

// DELETE promotion type
typesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    console.log("==== DELETE /api/types/:id HIT ====");
    console.log("Params:", req.params);

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      console.log("Invalid ID:", req.params.id);
      return res.status(400).json({ error: "Invalid ID" });
    }

    // Check if type is used in promotions
    const count = await prisma.promotion.count({
      where: { typeId: id }
    });

    console.log("Usage count for type:", count);

    if (count > 0) {
      console.log("Cannot delete, type in use");
      return res.status(409).json({
        error: "Type is used by promotions. Remove those first."
      });
    }

    await prisma.promotionType.delete({
      where: { id }
    });

    console.log("Type deleted successfully");

    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") {
      console.log("Type not found for delete");
      return res.status(404).json({ error: "Type not found" });
    }

    console.error("ERROR in DELETE /api/types:", err);
    res.status(500).json({
      error: "Failed to delete promotion type",
      message: err.message
    });
  }
});

//  DEBUG ROUTE (TEMPORARY - check DB directly)
typesRouter.get("/debug/all", async (_req, res) => {
  try {
    console.log("==== DEBUG TYPES + PROMOTIONS ====");

    const types = await prisma.promotionType.findMany();
    const promotions = await prisma.promotion.findMany();

    console.log("ALL TYPES:", types);
    console.log("ALL PROMOTIONS:", promotions);

    res.json({
      types,
      promotions,
      typesCount: types.length,
      promotionsCount: promotions.length
    });
  } catch (err) {
    console.error("DEBUG ERROR:", err);
    res.status(500).json(err);
  }
});

module.exports = { clientsRouter, typesRouter };
