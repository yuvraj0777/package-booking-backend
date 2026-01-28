import my_db from "../module/db.js";

const addReviews = async (req, res) => {
  const { packageId } = req.params;
  const userId = req.user.id;
  const { rating, review } = req.body;

  if (!rating || !review) {
    return res.status(400).json({ message: "All field required!" });
  }

  try {
    const [row] = await my_db.query(
      `
       INSERT INTO reviews (package_id, user_id, rating, review) 
       VALUES (?, ?, ?, ?)
      `,
      [packageId, userId, rating, review],
    );

    if (row.affectedRows === 0) {
      return res.status(401).json({ message: "Review can't added!" });
    }

    return res
      .status(201)
      .json({ success: true, message: "Review added successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error!",
      error: error.message,
      success: false,
    });
  }
};

const moderateReview = async (req, res) => {
  const { packageId } = req.params;
  const { status, admin_note } = req.body;
  const adminId = req.user.id;

  const ALLOWED_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const [result] = await my_db.query(
      `
      UPDATE reviews
      SET status = ?,
          moderated_by = ?,
          moderated_at = NOW(),
          admin_note = ?
      WHERE id = ?
      `,
      [status, adminId, admin_note || null, packageId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.json({
      success: true,
      message: `Review status changed to ${status}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Review moderation failed",
      error: error.message,
    });
  }
};

const serviceReview = async (req, res) => {
  const { rating, review } = req.body;
  const userId = req.user.id;

  if (!rating || !review) {
    return res.status(400).json({ message: "All fields required!" });
  }

  try {
    const [row] = await my_db.query(
      `INSERT INTO serviceReview (user_id, rating, review) VALUES
       (?, ?, ?)`,
      [userId, rating, review],
    );

    if (row.affectedRows === 0) {
      return res.status(401).json({ message: "Review can't added!" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Review added successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Review not submitted successfully!",
      error: error.message,
    });
  }
};

const moderateServiceReview = async (req, res) => {
  const { status, admin_note } = req.body;
  const adminId = req.user.id;
  const ALLOWED_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status!" });
  }

  try {
    const [row] = await my_db.query(
      `
      UPDATE serviceReview
      SET status = ?, 
      moderate_by = ?,
      moderate_at = NOW(),
      admin_note = ?`,
      [status, adminId, admin_note || null],
    );

    if (row.affectedRows === 0) {
      return res
        .status(500)
        .json({ message: "Review status not updated successfully!" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    return (
      res,
      status(500).json({
        success: false,
        message: "Review moderation failed!",
        error: error.message,
      })
    );
  }
};

export default {
  addReviews,
  moderateReview,
  serviceReview,
  moderateServiceReview,
};
