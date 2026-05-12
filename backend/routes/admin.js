const { Router } = require("express");
const { requireAuth, requireFullAdmin } = require("../middleware/auth");
const { clientsRouter, typesRouter } = require("./misc");

const router = Router();

// requireFullAdmin allows both admin and super_admin
router.use(requireAuth, requireFullAdmin);
router.use("/clients", clientsRouter);
router.use("/types", typesRouter);

module.exports = router;
