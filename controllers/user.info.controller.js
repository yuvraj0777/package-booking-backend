import my_db from "../module/db.js";

const userInfo = async (req, res) => {
  const userId = req?.user?.id || null;
  const { name, email, subject, message } = req.body;

  try {
    const [row] = await my_db.query(
      `INSERT INTO userInfo(user_id, name, email, subject, message) 
        VALUE(?, ?, ?, ?, ?)`,
      [userId, name, email, subject, message],
    );

    if (row.affectedRows === 0) {
      return res.status(401).json({ message: "User info not submitted!" });
    }

    return res
      .status(201)
      .json({ success: true, message: "User enquiry submitted successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error!",
      error: error.message,
    });
  }
};

export default {
  userInfo,
};
