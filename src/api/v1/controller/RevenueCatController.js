const RevenueCatService = require("../services/revenuecat.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class RevenueCatController {
  /**
   * Handle RevenueCat webhook
   * POST /api/v1/webhooks/revenuecat
   */
  static handleWebhook = catchAsyncHandler(async (req, res) => {
    // RevenueCat sends webhook data in req.body
    const webhookData = req.body;

    // Process the webhook
    const result = await RevenueCatService.processWebhook(webhookData);

    // Always return 200 to RevenueCat to acknowledge receipt
    // RevenueCat will retry if it doesn't receive a 200 response
    return res.status(200).json({
      success: true,
      message: "Webhook received and processed",
      ...result,
    });
  });

  /**
   * Get user payment history (authenticated endpoint)
   * GET /api/v1/webhooks/revenuecat/payments
   */
  static getUserPayments = catchAsyncHandler(async (req, res) => {
    const userId = req.user.id; // Get from authenticated user
    const result = await RevenueCatService.getUserPayments(userId);
    return res.status(200).json(result);
  });

  /**
   * Get active subscription for user (authenticated endpoint)
   * GET /api/v1/webhooks/revenuecat/active-subscription
   */
  static getActiveSubscription = catchAsyncHandler(async (req, res) => {
    const userId = req.user.id; // Get from authenticated user
    const result = await RevenueCatService.getActiveSubscription(userId);
    return res.status(200).json(result);
  });
}

module.exports = RevenueCatController;

