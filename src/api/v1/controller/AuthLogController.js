const AuthLogService = require("../services/authLog.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class AuthLogController {
  /**
   * Get authentication logs
   * GET /api/v1/auth-logs
   * No authentication required
   */
  static getAuthLogs = catchAsyncHandler(async (req, res) => {
    const result = await AuthLogService.getAuthLogs(req.query);
    return res.status(200).json(result);
  });

  /**
   * Get authentication statistics
   * GET /api/v1/auth-logs/stats
   * No authentication required
   */
  static getAuthStats = catchAsyncHandler(async (req, res) => {
    const result = await AuthLogService.getAuthStats();
    return res.status(200).json(result);
  });
}

module.exports = AuthLogController;

