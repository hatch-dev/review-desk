const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev_secret";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Only super_admin and admin
function requireAdmin(req, res, next) {
  const role = req.user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Only super_admin
function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin only" });
  }
  next();
}

// super_admin OR admin
function requireFullAdmin(req, res, next) {
  const role = req.user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "Full admin access required" });
  }
  next();
}

function requireRoles(allowedRoles = []) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

module.exports = { requireAuth, requireAdmin, requireSuperAdmin, requireFullAdmin, requireRoles };
