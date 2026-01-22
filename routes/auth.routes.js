import express from "express";
import authController from "../controllers/auth.controller.js";
import permissionsMiddleware from "../middleware/permissions.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import packageController from "../controllers/package.controller.js";
import upload from "../middleware/upload.middleware.js";
import getController from "../controllers/get.controller.js";
import reviewsController from "../controllers/reviews.controller.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Auth route working");
});

router.post("/signup", authController.userSignUp);
router.post("/adminSingup", authController.adminSignUp);
router.post("/loggin", authController.userLogin);
router.post("/admin-login", authController.adminLogin);
router.post(
  "/create-package",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("CREATE_PACKAGE"),
  packageController.createPackage,
);

router.post(
  "/packages/:packageId/media",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("CREATE_PACKAGE"),
  upload.array("media", 10),
  packageController.savePackageMedia,
);

router.put(
  "/update-package/:packageId",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("UPDATE_PACKAGE"),
  packageController.updatePackage,
);

router.delete(
  "/package/:packageId",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("DELETE_PACKAGE"),
  packageController.deletePackage,
);

router.put(
  "/package-status/:packageId",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("UPDATE_BOOKING_STATUS"),
  packageController.updatePackageStatus,
);

router.put(
  "/review/approve/:packageId",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("MANAGE_USERS"),
  reviewsController.moderateReview,
);

router.post(
  "/add-review/:packageId",
  authMiddleware.verifyToken,
  reviewsController.addReviews,
);

router.post("/logout", authMiddleware.verifyToken, authController.loggedOut);

router.get("/packages", authMiddleware.verifyToken, getController.showPackages);
router.get("/users", authMiddleware.verifyToken, getController.showUsers);
router.get(
  "/permission",
  authMiddleware.verifyToken,
  getController.permissions,
);
router.get("/media", authMiddleware.verifyToken, getController.showMedia);
router.get("/me", authMiddleware.verifyToken, getController.logUser);
router.get(
  "/reviews",
  authMiddleware.verifyToken,
  getController.fetchPendingReviews,
);
router.get(
  "/approved-reviews",
  authMiddleware.verifyToken,
  getController.fetchApprovedReviews,
);

export default router;
