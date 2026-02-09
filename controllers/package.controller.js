import my_db from "../module/db.js";

// create package
const createPackage = async (req, res) => {
  const {
    title,
    slug,
    description,
    base_price,
    sell_price,
    duration_value,
    duration_unit,
    location,
    min_group_size,
    max_group_size,
  } = req.body;
  const createdBy = req.user.id;
  const featured = req.body.featured ? 1 : 0;

  if (
    !title ||
    !base_price ||
    !sell_price ||
    !duration_value ||
    !duration_unit ||
    !max_group_size
  ) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  try {
    const sql = `INSERT INTO packages(title, slug, description, base_price, sell_price, duration_value, duration_unit, location, min_group_size, max_group_size, featured, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [row] = await my_db.query(sql, [
      title,
      slug,
      description,
      base_price,
      sell_price,
      duration_value,
      duration_unit,
      location,
      min_group_size || 1,
      max_group_size,
      featured,
      createdBy,
    ]);

    try {
      await my_db.query(
        `INSERT INTO admin_activity_logs
      (admin_id, action, entity, entity_id, ip_address, user_agent)
      VALUES (?, 'CREATE', 'PACKAGE', ?, ?, ?)`,
        [
          createdBy,
          row.insertId,
          req.ip || null,
          req.headers["user-agent"] || "UNKNOWN",
        ],
      );
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal server error!", error: error.message });
    }

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      package_id: row.insertId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Package creation failed!",
      error: error.message,
    });
  }
};

// Create media
const savePackageMedia = async (req, res) => {
  const { packageId } = req.params;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded!" });
  }

  try {
    for (const file of req.files) {
      if (!file || !file.mimetype) {
        continue;
      }
      const mediaType = file.mimetype.startsWith("image/") ? "IMAGE" : "VIDEO";

      await my_db.query(
        `INSERT INTO package_media(package_id, media_type, media_url) VALUES(?, ?, ?)`,
        [packageId, mediaType, `/${file.path.replace(/\\/g, "/")}`],
      );

      res.status(201).json({
        success: true,
        message: "Media uploaded successfully",
        files: req.files.length,
        media_id: packageId,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Media uploaded failed!",
      error: error.message,
    });
  }
};

// update packages
const updatePackage = async (req, res) => {
  const { packageId } = req.params;
  const {
    title,
    slug,
    description,
    base_price,
    sell_price,
    duration_value,
    duration_unit,
    location,
    min_group_size,
    max_group_size,
    featured,
  } = req.body;
  const updatedBy = req.user.id;

  if (!packageId) {
    return res.status(400).json({ message: "Messing package Id!" });
  }

  if (
    !title ||
    !base_price ||
    !sell_price ||
    !duration_value ||
    !duration_unit ||
    !max_group_size
  ) {
    return res.status(400).json({ message: "All fields required!" });
  }

  try {
    const [row] = await my_db.query(
      `UPDATE packages 
      SET title = ?, slug = ?, description = ?, base_price = ?, sell_price = ?, duration_value = ?, duration_unit = ?, location = ?, min_group_size = ?, max_group_size = ?, featured = ?, created_by = ? WHERE id = ?`,
      [
        title,
        slug,
        description,
        base_price,
        sell_price,
        duration_value,
        duration_unit,
        location,
        min_group_size,
        max_group_size,
        featured,
        updatedBy,
        packageId,
      ],
    );

    if (row.affectedRows === 0) {
      return res.status(400).json({ message: "Package not found!" });
    }

    try {
      await my_db.query(
        `INSERT INTO admin_activity_logs
        (admin_id, action, entity, entity_id, ip_address, user_agent)
        VALUES (?, 'UPDATE', 'PACKAGE', ?, ?, ?)`,
        [
          updatedBy,
          packageId,
          req.ip || null,
          req.headers["user_agent"] || "UNKNOWN",
        ],
      );
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Admin log field!", error: error.message });
    }
    res.status(200).json({
      success: true,
      message: "Package updated successfully",
      updated_id: packageId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Package updation failed!",
      error: error.message,
    });
  }
};

// package delete
const deletePackage = async (req, res) => {
  const { packageId } = req.params;
  const updatedBy = req.user.id;

  try {
    const [row] = await my_db.query(`DELETE FROM packages WHERE id = ?`, [
      packageId,
    ]);

    if (row.affectedRows === 0) {
      return res.status(404).json({ message: "Package not found!" });
    }

    try {
      await my_db.query(
        `INSERT INTO admin_activity_logs
        (admin_id, action, entity, entity_id, ip_address, user_agent)
        VALUES (?, 'DELETE', 'PACKAGE', ?, ?, ?)`,
        [
          updatedBy,
          packageId,
          req.ip || null,
          req.headers["user_agent"] || "UNKNOWN",
        ],
      );
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Admin log field!", error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: "Package deleted successfully!",
      deleted_id: packageId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Package deletion failed!",
      error: error.message,
    });
  }
};

const updatePackageStatus = async (req, res) => {
  const { packageId } = req.params;
  const { status } = req.body;
  const updatedBy = req.user.id;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res.status(400).json({ message: "Invalid status!" });
  }

  if (!packageId) {
    return res.status(404).json({ message: "Package not found!" });
  }

  try {
    const [row] = await my_db.query(
      `UPDATE packages SET status = ? WHERE id = ?`,
      [status, packageId],
    );

    if (row.affectedRows === 0) {
      return res.status(404).json({ message: "Package not found!" });
    }

    try {
      await my_db.query(
        `INSERT INTO admin_activity_logs
        (admin_id, action, entity, entity_id, ip_address, user_agent)
        VALUES (?, 'UPDATE', 'PACKAGE', ?, ?, ?)`,
        [
          updatedBy,
          packageId,
          req.ip || null,
          req.headers["user_agent"] || "UNKNOWN",
        ],
      );
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Admin log field!", error: error.message });
    }

    return res.status(201).json({
      success: true,
      message: "Status updated successfully",
      package_id: packageId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Status updation failed!",
      error: error.message,
    });
  }
};

export default {
  createPackage,
  savePackageMedia,
  updatePackage,
  deletePackage,
  updatePackageStatus,
};
