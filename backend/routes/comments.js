const { Router } = require("express");
const prisma = require("../db/prisma");
const { requireAuth } = require("../middleware/auth");

const commentsRouter = Router();

function mapComment(c) {
  return {
    id: c.id,
    promotionId: c.promotionId,
    authorId: c.authorId,
    author: c.author,
    role: c.role,
    body: c.body,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// GET /api/comments?promotionId=xxx
commentsRouter.get("/", requireAuth, async (req, res) => {
  const { promotionId } = req.query;
  if (!promotionId) return res.status(400).json({ error: "promotionId required" });
  try {
    const comments = await prisma.comment.findMany({
      where: { promotionId: parseInt(promotionId) },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments.map(mapComment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/comments
commentsRouter.post("/", requireAuth, async (req, res) => {
  const { promotionId, body } = req.body;
  if (!promotionId || !body) return res.status(400).json({ error: "promotionId and body required" });
  try {
    const comment = await prisma.comment.create({
      data: {
        promotionId: parseInt(promotionId),
        body,
        author: req.user.name,
        authorId: req.user.id,
        role: req.user.role,
      },
    });
    res.status(201).json(mapComment(comment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/comments/:id  (edit own comment)
commentsRouter.put("/:id", requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: "body required" });

  try {
    const comment = await prisma.comment.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    // Allow: own comment (by authorId) OR super_admin
    const isOwn = comment.authorId === req.user.id;
    const isSuperAdmin = req.user.role === "super_admin";

    if (!isOwn && !isSuperAdmin) {
      return res.status(403).json({ error: "You can only edit your own comments" });
    }

    const updated = await prisma.comment.update({
      where: { id: parseInt(req.params.id) },
      data: { body: body.trim() },
    });
    res.json(mapComment(updated));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Comment not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/comments/:id
commentsRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    // Allow: own comment OR admin/super_admin
    const isOwn = comment.authorId === req.user.id;
    const isAdmin = ["admin", "super_admin"].includes(req.user.role);

    if (!isOwn && !isAdmin) {
      return res.status(403).json({ error: "Cannot delete this comment" });
    }

    await prisma.comment.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Comment not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = commentsRouter;
