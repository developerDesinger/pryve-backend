const SupportService = require("../services/support.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class SupportController {
  /**
   * Create support message
   * POST /api/v1/support
   */
  static createSupportMessage = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await SupportService.createSupportMessage(userId, req.body);
    return res.status(201).json(result);
  });

  /**
   * Get all support messages
   * GET /api/v1/support
   */
  static getSupportMessages = catchAsyncHandler(async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const result = await SupportService.getSupportMessages(
      userId,
      userRole,
      req.query
    );
    return res.status(200).json(result);
  });

  /**
   * Get single support message
   * GET /api/v1/support/:id
   */
  static getSupportMessage = catchAsyncHandler(async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const { id } = req.params;
    const result = await SupportService.getSupportMessage(
      id,
      userId,
      userRole
    );
    return res.status(200).json(result);
  });

  /**
   * Update support message
   * PATCH /api/v1/support/:id
   */
  static updateSupportMessage = catchAsyncHandler(async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const { id } = req.params;
    const result = await SupportService.updateSupportMessage(
      id,
      userId,
      userRole,
      req.body
    );
    return res.status(200).json(result);
  });

  /**
   * Delete support message
   * DELETE /api/v1/support/:id
   */
  static deleteSupportMessage = catchAsyncHandler(async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const { id } = req.params;
    const result = await SupportService.deleteSupportMessage(
      id,
      userId,
      userRole
    );
    return res.status(200).json(result);
  });
}

module.exports = SupportController;

