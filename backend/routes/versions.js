const router  = require("express").Router();
const prisma  = require("../db/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { v4: uuidv4 } = require("uuid");

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file,  cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase()))
      return cb(null, true);
    cb(new Error("Only JPG, PNG, and PDF files are allowed"));
  },
});

function mapVersion(v) {
  return {
    id: v.id,
    promotionId: v.promotionId,
    version: v.version,
    label: v.label,
    fileName: v.fileName,
    fileType: v.fileType,
    uploadedBy: v.uploadedBy,
    uploadedAt: v.uploadedAt,
    url: v.url,
    htmlCode: v.htmlCode || "",
    notes: v.notes || "",
  };
}

// GET /api/versions?promotionId=xxx
router.get("/", requireAuth, async (req, res) => {
  const { promotionId } = req.query;
  if (!promotionId) return res.status(400).json({ error: "promotionId required" });

  try {
    const versions = await prisma.version.findMany({
      where:   { promotionId: parseInt(promotionId) },
      orderBy: { version: "asc" },
    });
    res.json(versions.map(mapVersion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/versions/upload/html
router.post("/upload/html", requireAuth, requireAdmin, async (req, res) => {
  const { promotionId, label, notes, htmlCode } = req.body;
  if (!promotionId || !htmlCode?.trim()) {
    return res.status(400).json({ error: "promotionId and htmlCode required" });
  }
  try {
    const pid = parseInt(promotionId);
    const agg = await prisma.version.aggregate({
      where: { promotionId: pid },
      _max: { version: true },
    });
    const versionNum = (agg._max.version ?? 0) + 1;
    const newVersion = await prisma.version.create({
      data: {
        promotionId: pid,
        version: versionNum,
        label: label || `Option ${versionNum}`,
        fileName: "HTML Version",
        fileType: "html",
        htmlCode,
        uploadedBy: ["admin","super_admin"].includes(req.user.role) ? "Admin" : "Client",
        url: "",
        notes: notes || "",
      },
    });
    await prisma.promotion.update({
      where: { id: pid },
      data: {
        currentVersionId: newVersion.id,
        status: "Pending_Approval",
      },
    });
    return res.status(201).json([mapVersion(newVersion)]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/versions/upload  (file)
router.post("/upload", requireAuth, requireAdmin, upload.array("files", 10), async (req, res) => {
  const { promotionId, label, notes } = req.body;

  if (!promotionId || !req.files?.length) {
    return res.status(400).json({ error: "promotionId and at least one file required" });
  }

  try {
    const pid = parseInt(promotionId);
    const agg = await prisma.version.aggregate({
      where: { promotionId: pid },
      _max: { version: true },
    });

    let versionNum = agg._max.version ?? 0;
    const uploadedBy = ["admin","super_admin"].includes(req.user.role) ? "Admin" : "Client";
    const created = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      versionNum += 1;

      const fileType = path.extname(file.originalname).toLowerCase() === ".pdf" ? "pdf" : "image";
      const versionLabel = req.files.length > 1
        ? `${(label || "Creative option").trim()} ${i + 1}`
        : (label || "Creative option").trim();

      const version = await prisma.version.create({
        data: {
          promotionId: pid,
          version: versionNum,
          label: versionLabel,
          fileName: file.originalname,
          fileType,
          uploadedBy,
          url: `/uploads/${file.filename}`,
          notes: notes?.trim() || "",
        },
      });

      created.push(mapVersion(version));
    }

    await prisma.promotion.update({
      where: { id: pid },
      data: {
        currentVersionId: created[0].id,
        status: "Pending_Approval",
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/versions/:id  (edit HTML version)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { htmlCode, label, notes } = req.body;
    const vid = parseInt(req.params.id);

    const version = await prisma.version.findUnique({ where: { id: vid } });
    if (!version) return res.status(404).json({ error: "Version not found" });

    if (version.fileType !== "html") {
      return res.status(400).json({ error: "Only HTML versions can be edited here" });
    }

    const updated = await prisma.version.update({
      where: { id: vid },
      data: {
        htmlCode,
        label: label || version.label,
        notes: notes || version.notes,
      }
    });

    res.json(mapVersion(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/versions/:id
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const vid = parseInt(req.params.id);
    const version = await prisma.version.findUnique({ where: { id: vid } });
    if (!version) return res.status(404).json({ error: "Version not found" });

    if (version.url) {
      const filePath = path.join(__dirname, "..", version.url);
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.version.delete({ where: { id: vid } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Version not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
