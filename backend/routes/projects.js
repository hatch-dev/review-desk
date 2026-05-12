const router = require("express").Router();
const prisma  = require("../db/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

function mapProject(p) {
  return {
    id: p.id,
    name: p.name,
    client: p.client,
    owner: p.owner,
    description: p.description || "",
    clientUsers: p.clientUsers || [],
    createdAt: p.createdAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const role = req.user.role;
    const where = (role === "admin" || role === "super_admin")
      ? {}
      : { clientUsers: { has: req.user.email } };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json(projects.map(mapProject));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all promotion types
router.get("/types", requireAuth, async (req, res) => {
  try {
    console.log("Fetching promotion types"); // Debug log

    const types = await prisma.promotion_types.findMany({
      orderBy: { id: "asc" }
    });

    res.json(types);
  } catch (err) {
    console.error("Error fetching types:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const role = req.user.role;
    if (role !== "admin" && role !== "super_admin" && !project.clientUsers.includes(req.user.email))
      return res.status(403).json({ error: "Access denied" });

    res.json(mapProject(project));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, client, owner = "Growth Team", description, clientUsers = [] } = req.body;
  if (!name || !client) return res.status(400).json({ error: "name and client required" });

  try {
    const project = await prisma.project.create({
      data: { name: name.trim(), client: client.trim(), owner, description: description?.trim() || "", clientUsers },
    });
    res.status(201).json(mapProject(project));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, client, owner, description, clientUsers } = req.body;
  try {
    const project = await prisma.project.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: name?.trim(),
        client: client?.trim(),
        owner: owner || "Growth Team",
        description: description?.trim() || "",
        clientUsers: clientUsers || [],
      },
    });
    res.json(mapProject(project));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Project not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Project not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
