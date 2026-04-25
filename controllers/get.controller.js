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

const logUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await my_db.query(
      "SELECT id, name, email, phone, role FROM users WHERE id = ?",
      [userId],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
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

    if (rows.affectedRows === 0) {
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

const fetchUserLogActivity = async (req, res) => {
  try {
    const [row] = await my_db.query(`SELECT * FROM user_activity_log`);

    if (row.affectedRows === 0) {
      return res.status(404).json({ message: "Logged in users not found!" });
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

const getSinglePackage = async (req, res) => {
  const { packageId, packageSlug } = req.params;

  try {
    const [rows] = await my_db.query(
      "SELECT id, title, slug, description, base_price, sell_price, duration_value, duration_unit, location, min_group_size, max_group_size, featured FROM packages WHERE id = ? AND slug = ?",
      [packageId, packageSlug],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Package not found!",
      });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server error",
      error: error.message,
    });
  }
};

const getPackageMedia = async (req, res) => {
  const { packageId } = req.params;

  try {
    const [rows] = await my_db.query(
      "SELECT id, package_id, media_type, created_at, media_url FROM package_media WHERE package_id = ?",
      [packageId],
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server error",
      error: error.message,
    });
  }
};

const getPackageReview = async (req, res) => {
  const { packageId } = req.params;

  try {
    const [row] = await my_db.query(
      `
      SELECT r.*, u.name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.status= "APPROVED" AND package_id = ?
      ORDER BY r.created_at DESC 
      `,
      [packageId],
    );

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

const getActivePackages = async (req, res) => {
  try {
    const [row] = await my_db.query(
      `SELECT id, title, slug, description, base_price, sell_price, duration_value, duration_unit, location, min_group_size, max_group_size, featured, status FROM packages WHERE status = "ACTIVE"`,
    );

    if (row.length === 0) {
      return res.status(404).json({ message: "Avtive Package not found!" });
    }
    res.json(row);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error!", error: error.message });
  }
};

const getPopularPackages = async (req, res) => {
  try {
    const [row] = await my_db.query(
      `SELECT id, title, slug, description, base_price, sell_price, duration_value, duration_unit, location, min_group_size, max_group_size, featured, status FROM packages WHERE featured = "1"`,
    );

    if (row.length === 0) {
      return res.status(404).json({ message: "Popular Package not found!" });
    }
    res.json(row);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error!", error: error.message });
  }
};

const getUserEnquiry = async (req, res) => {
  try {
    const [result] = await my_db.query(
      `SELECT user_id, name, email, subject, message FROM userInfo`,
    );

    if (result.length === 0) {
      return res.status(404).json({ message: "User enquiry not found!" });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error!",
      error: error.message,
    });
  }
};

const getAllBooking = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = req.user.id;

  try {
    const query = `
    SELECT 
      b.id as booking_id,
      b.travel_date,
      b.persons,
      b.total_amount,
      b.status,
      b.created_at,
      p.id as package_id,
      p.title as package_name,
      p.duration_value,
      p.duration_unit,
      p.sell_price,
      pay.payment_status,
      pay.transaction_id,
      u.id as user_id,
      u.name,
      u.email,
      u.phone
    FROM bookings b
    INNER JOIN packages p ON b.package_id = p.id
    LEFT JOIN payments pay ON b.id = pay.booking_id
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC;`;

    const [bookings] = await my_db.query(query, [userId]);

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Booking fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
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
  fetchUserLogActivity,
  getSinglePackage,
  getPackageMedia,
  getPackageReview,
  getActivePackages,
  getPopularPackages,
  getUserEnquiry,
  getAllBooking,
};
