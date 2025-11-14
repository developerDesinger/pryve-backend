const DashboardService = require("../services/dashboard.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class DashboardController {
  /**
   * Get User Activity Trends
   * GET /api/v1/dashboard/activity-trends
   */
  static getActivityTrends = catchAsyncHandler(async (req, res) => {
    const { period = "monthly" } = req.query;
    const result = await DashboardService.getUserActivityTrends(period);
    return res.status(200).json(result);
  });

  /**
   * Get User Engagement
   * GET /api/v1/dashboard/user-engagement
   */
  static getUserEngagement = catchAsyncHandler(async (req, res) => {
    const result = await DashboardService.getUserEngagement();
    return res.status(200).json(result);
  });

  /**
   * Get Emotional Topics Analysis
   * GET /api/v1/dashboard/emotional-topics
   */
  static getEmotionalTopics = catchAsyncHandler(async (req, res) => {
    const result = await DashboardService.getEmotionalTopicsAnalysis();
    return res.status(200).json(result);
  });

  /**
   * Get Recent Activity
   * GET /api/v1/dashboard/recent-activity
   */
  static getRecentActivity = catchAsyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const result = await DashboardService.getRecentActivity(limit);
    return res.status(200).json(result);
  });

  /**
   * Get Complete Dashboard Data
   * GET /api/v1/dashboard
   */
  static getDashboard = catchAsyncHandler(async (req, res) => {
    const { period = "monthly", activityLimit = 10 } = req.query;
    const result = await DashboardService.getDashboardData(period, activityLimit);
    return res.status(200).json(result);
  });
}

module.exports = DashboardController;

