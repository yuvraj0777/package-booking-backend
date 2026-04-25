import bcrypt from "bcrypt";
import my_db from "../module/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import transporter from "../config/mailer.js";

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
    const [rows] = await my_db.query(
      `DELETE FROM user_activity_log WHERE action IN("SIGNUP", "LOGIN", "ADD_REVIEW")`,
    );

    if (rows.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "User activity delation failed!" });
    }

    return res.status(200).json({
      success: true,
      message: "User Activity successfully deleted!",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const generateOTP = async (req, res) => {
  // const email = req.body?.email?.trim()?.toLowerCase();
  const { email } = req.body;
  try {
    const [rows] = await my_db.query(
      `SELECT * FROM users WHERE LOWER(email) = ?`,
      [email],
    );

    console.log("Row data:", rows);
    console.log("User Email :", email);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid email, please enter registered email",
      });
    }

    const [result] = await my_db.query(`SELECT id FROM users WHERE email = ?`, [
      email,
    ]);

    const user_id = result[0].id;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let otp = "";
    const length = 6;

    for (let i = 0; i < length; i++) {
      const index = crypto.randomInt(0, chars.length);
      otp += chars[index];
    }

    const hashOTP = await bcrypt.hash(otp, 6);

    const excitedAt = new Date(Date.now() + 5 * 60 * 1000);

    const attempts = 0;

    const otp_generate = await my_db.query(
      `INSERT INTO  password_resets(user_id, otp_hash, expires_at, attemptS) 
      VALUES (?, ?, ?, ?)`,
      [user_id, hashOTP, excitedAt, attempts],
    );

    if (otp_generate.affectedRows === 0) {
      return res
        .status(401)
        .json({ seccess: false, message: "OTP not generated successfully!" });
    }

    try {
      await transporter.sendMail({
        from: '"TravelYatra" <deepaktourandtravels970@gmail.com>',
        to: email,
        subject: "Reset Your Password",
        html: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Password Reset</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; margin:30px auto; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          
            <tr>
              <td style="background:linear-gradient(90deg, #4f46e5, #7c3aed); padding:20px; text-align:center;">
                <h1 style="color:#ffffff; margin:0;">TravelYatra</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:30px;">
                <h2 style="margin-top:0; color:#333;">Reset Your Password</h2>
                
                <p style="color:#555; font-size:16px;">
                  Hello,
                </p>

                <p style="color:#555; font-size:16px;">
                  We received a request to reset your password. Use the OTP below to proceed:
                </p>

                <div style="text-align:center; margin:30px 0;">
                  <span style="display:inline-block; padding:15px 25px; font-size:24px; letter-spacing:4px; background:#f3f4f6; border-radius:8px; font-weight:bold; color:#111;">
                    ${otp}
                  </span>
                </div>

                <p style="color:#777; font-size:14px;">
                  This OTP is valid for <strong>5 minutes</strong>.
                </p>

                <p style="color:#777; font-size:14px;">
                  If you did not request this, please ignore this email.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f9fafb; padding:20px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#999;">
                  © ${new Date().getFullYear()} TravelYatra. All rights reserved.
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `,
      });
      console.log("✅ Email sent successfully");
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ success: false, message: "Email failed!" });
    }

    return res
      .status(200)
      .json({ success: true, message: "OTP generated successfully!" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const salt_round = 10;

  try {
    if (!otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "OTP and new password required!" });
    }

    const [result] = await my_db.query(`SELECT id FROM users WHERE email = ?`, [
      email,
    ]);

    const user_id = result[0].id;

    const [rows] = await my_db.query(
      `
      SELECT * FROM password_resets WHERE user_id = ? 
      ORDER BY created_at DESC LIMIT 1`,
      [user_id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "OTP not found!" });
    }

    const record = rows[0];

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: "OTP expired!" });
    }

    if (record.attemptS >= 5) {
      return res.status(429).json({ message: "Too many attempts" });
    }

    const isMatch = await bcrypt.compare(otp, record.otp_hash);

    if (!isMatch) {
      await my_db.query(
        `UPDATE password_resets SET attemptS = attemptS + 1 
         WHERE id = ?`,
        [record.id],
      );
      return res.status(401).json({ success: false, message: "Invalid OTP!" });
    }

    const hashPassword = await bcrypt.hash(newPassword, salt_round);

    await my_db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      hashPassword,
      user_id,
    ]);

    await my_db.query(`DELETE FROM password_resets WHERE user_id = ?`, [
      user_id,
    ]);

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });

    try {
      await transporter.sendMail({
        from: '"TravelYatra" <deepaktourandtravels970@gmail.com>',
        to: email,
        subject: "Password reset successfully",
        html: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Password Reset Seccessfully</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; margin:30px auto; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          
            <tr>
              <td style="background:linear-gradient(90deg, #4f46e5, #7c3aed); padding:20px; text-align:center;">
                <h1 style="color:#ffffff; margin:0;">TravelYatra</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:30px;">
                <h2 style="margin-top:0; color:#333;">Password Reset Successfully</h2>
                
                <p style="color:#555; font-size:16px;">
                  Hello,
                </p>

                <p style="color:#777; font-size:14px; margin-left:5px;">
                  Your password has been updated successfully. You can now log in using your new password.
                </p>

                <p style="color:#777; font-size:14px; margin-left:5px;">
                   Your password has been successfully reset. If this wasn’t you, please secure your account immediately.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f9fafb; padding:20px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#999;">
                  © ${new Date().getFullYear()} TravelYatra. All rights reserved.
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `,
      });
      console.log("Password reset email send successfully");
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ success: false, message: "Email failed!" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error!",
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
  resetPassword,
  generateOTP,
};
