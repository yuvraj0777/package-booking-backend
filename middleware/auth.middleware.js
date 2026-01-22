import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const verifyAdminToken = (req, res, next) => {
  if (!req.user || !["ADMIN", "MANAGER", "SUPPORT"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin access required!!!!" });
  }
  next();
};

export default {
  verifyToken,
  verifyAdminToken,
};
