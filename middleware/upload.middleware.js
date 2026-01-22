import multer from "multer";
import fs from "fs";
import path from "path";

/* ================= UTIL ================= */
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/* ================= STORAGE ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // 🔒 HARD GUARDS
      if (!file || !file.mimetype) {
        return cb(new Error("Invalid file"));
      }

      const { packageId } = req.params;
      if (!packageId) {
        return cb(new Error("Package ID missing in URL"));
      }

      let baseDir = path.join("uploads", "packages", `package_${packageId}`);

      if (file.mimetype.startsWith("image/")) {
        baseDir = path.join(baseDir, "images");
      } else if (file.mimetype.startsWith("video/")) {
        baseDir = path.join(baseDir, "videos");
      } else {
        return cb(new Error("Unsupported file type"));
      }

      ensureDir(baseDir);
      cb(null, baseDir);
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

/* ================= FILE FILTER ================= */
const fileFilter = (req, file, cb) => {
  if (!file || !file.mimetype) {
    return cb(null, false);
  }

  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image & video files allowed"));
  }
};

/* ================= EXPORT ================= */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export default upload;
