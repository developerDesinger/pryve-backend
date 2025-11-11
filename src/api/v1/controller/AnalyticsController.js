const AnalyticsService = require("../services/analytics.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class AnalyticsController {
  /**
   * GET /api/v1/analytics/emotions
   * Returns aggregated message counts grouped by emotion.
   */
  static getEmotionSummary = catchAsyncHandler(async (req, res) => {
    const { userId, chatId, startDate, endDate, includeAI } = req.query;

    const result = await AnalyticsService.getEmotionSummary({
      userId,
      chatId,
      startDate,
      endDate,
      includeAI: includeAI === "true",
    });

    return res.status(200).json(result);
  });
}

module.exports = AnalyticsController;
