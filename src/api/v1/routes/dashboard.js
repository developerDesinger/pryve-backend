const express = require("express");
const DashboardController = require("../controller/DashboardController");
const { isAuthenticated, restrictTo } = require("../middlewares/auth.middleware");

const router = express.Router();

// All dashboard routes require authentication
// Optionally restrict to ADMIN role if needed
// router.use(isAuthenticated, restrictTo("ADMIN"));

// Dashboard Routes
router.get("/", isAuthenticated, DashboardController.getDashboard);
router.get("/activity-trends", isAuthenticated, DashboardController.getActivityTrends);
router.get("/user-engagement", isAuthenticated, DashboardController.getUserEngagement);
router.get("/emotional-topics", isAuthenticated, DashboardController.getEmotionalTopics);
router.get("/recent-activity", isAuthenticated, DashboardController.getRecentActivity);

module.exports = router;

