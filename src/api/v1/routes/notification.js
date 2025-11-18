const express = require("express");
const NotificationController = require("../controller/NotificationController");
const {
  isAuthenticated,
  restrictTo,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.post(
  "/broadcast",
  isAuthenticated,
  restrictTo("ADMIN"),
  NotificationController.sendBroadcast
);

router.get("/", isAuthenticated, NotificationController.getNotifications);

router.patch(
  "/:notificationId/read",
  isAuthenticated,
  NotificationController.markAsRead
);

module.exports = router;

