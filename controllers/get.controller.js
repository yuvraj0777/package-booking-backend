import my_db from "../module/db.js";

const showPackages = async (req, res) => {
  try {
    const [row] = await my_db.query(`SELECT * FROM packages`);

    if (row.length === 0) {
      return res.status(404).json({ message: "Package not found!" });
    }
    res.json(row);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error!", error: error.message });
  }
};

const showUsers = async (req, res) => {
  try {
    const [row] = await my_db.query(`SELECT * FROM users`);

    if (row.length === 0) {
      return res.status(404).json({ message: "User not found!" });
    }
    res.json(row);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error!", error: error.message });
  }
};

const permissions = async (req, res) => {
  try {
    const [row] = await my_db.query(
      `SELECT p.name from roles r
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = ?`,
      [req.user.role],
    );

    res.json(row.map((r) => r.name));
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error!", error: error.message });
  }
};

const showMedia = async (req, res) => {
  try {
    const [row] = await my_db.query(`SELECT * FROM package_media`);

    if (row.length === 0) {
      return res.status(404).json({ message: "Package media not found!" });
    }

    res.json(row);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error!", error: error.message });
  }
};

const logUser = (req, res) => {
  return res.json({
    name: req.user.name,
    email: req.user.email,
    id: req.user.id,
    role: req.user.role,
    phone: req.user.phone,
  });
};

const fetchPendingReviews = async (req, res) => {
  try {
    const [rows] = await my_db.query(
      `
      SELECT r.*, u.name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.status = 'PENDING'
      ORDER BY r.created_at DESC
      `,
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No pending reviews found!" });
    }

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error!",
      error: error.message,
    });
  }
};

const fetchApprovedReviews = async (req, res) => {
  try {
    const [row] = await my_db.query(`
      SELECT r.*, u.name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.status= "APPROVED"
      ORDER BY r.created_at DESC 
      `);

    if (row.affectedRows === 0) {
      return res.status(401).json({ message: "Approved reviews not found!" });
    }

    return res.json(row);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "internal server error!", error: error.message });
  }
};

const pendingServiceReview = async (req, res) => {
  try {
    const [row] = await my_db.query(`
      SELECT sr.*, u.name
      FROM serviceReview sr
      JOIN users u ON u.id = sr.user_id
      WHERE status = "PENDING"
      ORDER BY sr.created_at DESC`);

    if (row.affectedRows === 0) {
      return res.status(404).json({ message: "Pending reviews not found!" });
    }

    return res.json(row);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error!",
      error: error.message,
    });
  }
};

const approvedServiceReview = async (req, res) => {
  try {
    const [row] = await my_db.query(`
    SELECT sr.*, u.name
    FROM serviceReview sr
    JOIN users u ON u.id = sr.user_id
    WHERE status = "APPROVED"
    ORDER BY sr.created_at DESC`);

    if (row.affectedRows === 0) {
      return res.status(404).json({ message: "Approved reviews not found!" });
    }

    return res.json(row);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error!",
      error: error.message,
    });
  }
};

export default {
  showPackages,
  showUsers,
  permissions,
  showMedia,
  logUser,
  fetchPendingReviews,
  fetchApprovedReviews,
  pendingServiceReview,
  approvedServiceReview,
};
