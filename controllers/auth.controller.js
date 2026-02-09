import bcrypt from "bcrypt";
import my_db from "../module/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const salt_round = 10;

const genToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

const setToken = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

// USER SIGNUP
const userSignUp = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const hash = await bcrypt.hash(password, salt_round);

    const [result] = await my_db.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES (?, ?, ?, ?, 'USER')`,
      [name, email, hash, phone],
    );

    try {
      await my_db.query(
        `INSERT INTO user_activity_log
         (user_id, action, description, entity_type, entity_id, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          "SIGNUP",
          "User signed up successfully",
          "AUTH",
          null,
          req.ip || null,
          req.headers["user-agent"] || "UNKNOWN",
        ],
      );
    } catch (logErr) {
      console.error("Signup activity log failed:", logErr.message);
    }

    const token = genToken({
      id: result.insertId,
      email,
      role: "USER",
      phone,
    });

    setToken(res, token);

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

// ADMIN SIGNUP
const adminSignUp = async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!["ADMIN", "MANAGER", "SUPPORT"].includes(role)) {
    return res.status(403).json({ message: "Invalid admin role" });
  }

  try {
    const hash = await bcrypt.hash(password, salt_round);

    const [result] = await my_db.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, hash, phone, role],
    );

    res.status(201).json({ message: `${role} created successfully` });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

// USER LOGIN
const userLogin = async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await my_db.query(
    `SELECT id, name, email, password_hash, role, phone
     FROM users WHERE email = ? AND is_active = TRUE`,
    [email],
  );

  if (!rows.length) {
    return res.status(404).json({ message: "User not found!" });
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch || user.role !== "USER") {
    return res.status(401).json({ message: "Invalid credentials!" });
  }

  try {
    await my_db.query(
      `INSERT INTO user_activity_log
   (user_id, description, action, entity_type, entity_id, ip_address, user_agent)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        "User logged in successfully",
        "LOGIN",
        "AUTH",
        null,
        req.ip || null,
        req.headers["user-agent"] || "UNKNOWN",
      ],
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "USER log activity failed!",
      error: error.message,
    });
  }

  const token = genToken(user);
  setToken(res, token);

  res.json({ message: "User login successful", user });
};

// ADMIN LOGIN
const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await my_db.query(
    `SELECT id, name, email, password_hash, role, phone
     FROM users
     WHERE email = ? AND role IN ('ADMIN','MANAGER','SUPPORT')
     AND is_active = TRUE`,
    [email],
  );

  if (!rows.length) {
    return res.status(401).json({ message: "User not found!" });
  }

  const admin = rows[0];
  const isMatch = await bcrypt.compare(password, admin.password_hash);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  await my_db.query(
    `INSERT INTO admin_sessions (admin_id, ip_address, user_agent)
     VALUES (?, ?, ?)`,
    [admin.id, req.ip || null, req.headers["user-agent"] || "UNKNOWN"],
  );

  // const token = genToken(admin);

  const token = genToken({
    name: admin.name,
    id: admin.id,
    email: admin.email,
    role: admin.role,
    phone: admin.phone,
  });

  setToken(res, token);

  res.json({ message: "Admin login successful", admin });
};

const loggedOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logged out failed!",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  const userId = req.user.id;
  const { name, phone } = req.body;

  try {
    const [result] = await my_db.query(
      "UPDATE users SET name = ?, phone = ? WHERE id = ?",
      [name, phone, userId],
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Profile update failed",
      });
    }

    const [rows] = await my_db.query(
      "SELECT id, name, email, phone, role FROM users WHERE id = ?",
      [userId],
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const deleteUserActivity = async (req, res) => {
  try {
    const [result] = await my_db.query(`
        SELECT * FROM user_activity_log 
        WHERE action IN ("SIGNUP", "LOGIN", "ADD_REVIEW")`);

    if (result.length === 0) {
      return res.status(404).json({ message: "User activity not found!" });
    } else {
      const [row] = await my_db.query(
        `DELETE FROM user_activity_log WHERE action IN("SIGNUP", "LOGIN", "ADD_REVIEW")`,
      );

      if (row.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "User activity delation failed!" });
      }

      return res.status(200).json({
        success: true,
        message: "User Activity successfully deleted!",
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

export default {
  userSignUp,
  adminSignUp,
  userLogin,
  adminLogin,
  loggedOut,
  updateUser,
  deleteUserActivity,
};
