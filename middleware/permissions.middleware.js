import my_db from "../module/db.js";

const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const role = req.user.role;

      const [rows] = await my_db.query(
        `SELECT r.name AS role, p.name AS permission
          FROM role_permissions rp
          JOIN roles r ON r.id = rp.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE r.name = ? AND p.name = ?;`,
        [role, permission]
      );

      const [db] = await my_db.query("SELECT DATABASE() AS db");

      if (rows.length === 0) {
        return res.status(403).json({ message: "Permission denied!" });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        message: "Internal server error!",
      });
    }
  };
};

export default { checkPermission };
