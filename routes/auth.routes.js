import express from "express";
import authController from "../controllers/auth.controller.js";
import permissionsMiddleware from "../middleware/permissions.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import packageController from "../controllers/package.controller.js";
import upload from "../middleware/upload.middleware.js";
import getController from "../controllers/get.controller.js";
import reviewsController from "../controllers/reviews.controller.js";
import userInfoController from "../controllers/user.info.controller.js";
import packageBooking from "../controllers/booking.controller.js";

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
  "/review/approve/:reviewId",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("MANAGE_USERS"),
  reviewsController.moderateReview,
);

router.post(
  "/add-review/:packageId",
  authMiddleware.verifyToken,
  reviewsController.addReviews,
);

router.post(
  "/service-review",
  authMiddleware.verifyToken,
  reviewsController.serviceReview,
);

router.put(
  "/moderate-service-review",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("MANAGE_USERS"),
  reviewsController.moderateServiceReview,
);

router.post("/logout", authMiddleware.verifyToken, authController.loggedOut);

router.patch(
  "/update-profile",
  authMiddleware.verifyToken,
  authController.updateUser,
);

router.delete(
  "/delete-activity",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("MANAGE_USERS"),
  authController.deleteUserActivity,
);

router.put(
  "/mark-popular/:packageId",
  authMiddleware.verifyToken,
  permissionsMiddleware.checkPermission("UPDATE_PACKAGE"),
  packageController.markPopularPackage,
);

router.post("/user-enquiry", userInfoController.userInfo);

router.post(
  "/create-order",
  authMiddleware.verifyToken,
  packageBooking.createOrder,
);
router.post(
  "/verify-payment",
  authMiddleware.verifyToken,
  packageBooking.verifyPayment,
);

router.post(
  "/reset-password",
  authMiddleware.verifyToken,
  authController.resetPassword,
);

router.post(
  "/forget-password",
  authMiddleware.verifyToken,
  authController.generateOTP,
);

router.get("/packages", authMiddleware.verifyToken, getController.showPackages);
router.get("/users", authMiddleware.verifyToken, getController.showUsers);
router.get(
  "/permission",
  authMiddleware.verifyToken,
  getController.permissions,
);
router.get("/media", getController.showMedia);
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
router.get("/approved-service-reviews", getController.approvedServiceReview);
router.get(
  "/pending-service-reviews",
  authMiddleware.verifyToken,
  getController.pendingServiceReview,
);
router.get(
  "/user-log-activity",
  authMiddleware.verifyToken,
  getController.fetchUserLogActivity,
);
router.get("/packages/:packageId/:packageSlug", getController.getSinglePackage);
router.get("/media/:packageId", getController.getPackageMedia);
router.get("/reviews/:packageId", getController.getPackageReview);
router.get("/active-packages", getController.getActivePackages);
router.get("/get-popular-package", getController.getPopularPackages);
router.get(
  "/get-user-enquiry",
  authMiddleware.verifyToken,
  getController.getUserEnquiry,
);
router.get(
  "/show-booking",
  authMiddleware.verifyToken,
  authMiddleware.verifyAdminToken,
  packageBooking.getUserBookings,
);
router.get(
  "/payment-info",
  authMiddleware.verifyToken,
  authMiddleware.verifyAdminToken,
  packageBooking.getPaymetDetail,
);

router.get(
  "/my-bookings",
  authMiddleware.verifyToken,
  getController.getAllBooking,
);

export default router;
