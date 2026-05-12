const { Router } = require("express");
const prisma = require("../db/prisma");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = Router();

// Get all clients (admin only)
router.get("/", requireAuth, async (req, res) => {
  try {
    console.log("Fetching clients");

    const clients = await prisma.clients.findMany({
      where: { role: "client" },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        createdAt: true
      }
    });

    res.json(clients);
  } catch (err) {
    console.error("Clients error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
