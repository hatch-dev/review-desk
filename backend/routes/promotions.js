const router = require("express").Router();
const prisma  = require("../db/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

function mapPromotion(p) {
  return {
    id: p.id,
    projectId: p.projectId,
    title: p.title,
    type: p.typeId,
    scheduledDate: p.scheduledDate,
    status: p.status.replace("_", " "),
    description: p.description || "",
    subjectLine: p.subjectLine || "",
    contactList: p.contactList || "",
    captions: p.captions || [],
    currentVersionId: p.currentVersionId || null,
    createdAt: p.createdAt,
  };
}

function toDbStatus(s) {
  return s.replace(" ", "_");
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.query;
    const role = req.user.role;

    let where = {};
    if (role === "admin" || role === "super_admin") {
      if (projectId) where.projectId = parseInt(projectId);
    } else {
      where.project = { clientUsers: { has: req.user.email } };
      if (projectId) where.projectId = parseInt(projectId);
    }

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
    });
    res.json(promotions.map(mapPromotion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const promotion = await prisma.promotion.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!promotion) return res.status(404).json({ error: "Promotion not found" });
    res.json(mapPromotion(promotion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { projectId, title, type, scheduledDate, status = "Draft",
          description, subjectLine, contactList, captions = [] } = req.body;

  if (!projectId || !title || !type || !scheduledDate)
    return res.status(400).json({ error: "projectId, title, type, scheduledDate required" });

  try {
    const promotion = await prisma.promotion.create({
      data: {
        projectId: parseInt(projectId),
        title: title.trim(),
        typeId: parseInt(type),
        scheduledDate: new Date(scheduledDate),
        status: toDbStatus(status),
        description: description?.trim() || "",
        subjectLine: subjectLine?.trim() || "",
        contactList: contactList?.trim() || "",
        captions,
      },
    });
    res.status(201).json(mapPromotion(promotion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { title, type, scheduledDate, status, description,
          subjectLine, contactList, captions, currentVersionId } = req.body;
  try {
    const promotion = await prisma.promotion.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title: title?.trim(),
        typeId: type ? parseInt(type) : undefined,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        status: status ? toDbStatus(status) : undefined,
        description: description?.trim() || "",
        subjectLine: subjectLine?.trim() || "",
        contactList: contactList?.trim() || "",
        captions: captions || [],
        currentVersionId: currentVersionId ? parseInt(currentVersionId) : null,
      },
    });
    res.json(mapPromotion(promotion));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Promotion not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const allowed = ["Draft", "Pending Approval", "Approved", "Revision Required", "Published"];
  const { status } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    // Fetch current promotion to read existing captions
    const current = await prisma.promotion.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!current) return res.status(404).json({ error: "Promotion not found" });

    // When sending for approval or publishing, merge Caption 1 + Caption 2 into one
    let finalCaptions = current.captions;
    if (
      (status === "Pending Approval" || status === "Published") &&
      current.captions?.length > 1
    ) {
      finalCaptions = [current.captions.join("\n\n")];
    }

    const promotion = await prisma.promotion.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: toDbStatus(status),
        captions: finalCaptions,
      },
    });
    res.json(mapPromotion(promotion));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Promotion not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/version", requireAuth, async (req, res) => {
  const { currentVersionId } = req.body;
  try {
    const promotion = await prisma.promotion.update({
      where: { id: parseInt(req.params.id) },
      data: { currentVersionId: currentVersionId ? (currentVersionId) : null },
    });
    res.json(mapPromotion(promotion));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Promotion not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.promotion.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Promotion not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;