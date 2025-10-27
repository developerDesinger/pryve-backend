const EmotionalRuleService = require("../services/emotionalRule.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class EmotionalRuleController {
  /**
   * Get all emotional rules
   * GET /api/v1/emotional-rules
   */
  static getAllEmotionalRules = catchAsyncHandler(async (req, res) => {
    const result = await EmotionalRuleService.getAllEmotionalRules();
    return res.status(200).json(result);
  });

  /**
   * Get single emotional rule by ID
   * GET /api/v1/emotional-rules/:id
   */
  static getEmotionalRuleById = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EmotionalRuleService.getEmotionalRuleById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Create new emotional rule
   * POST /api/v1/emotional-rules
   */
  static createEmotionalRule = catchAsyncHandler(async (req, res) => {
    console.log("req.body<><>><><>><>", req.body);
    const result = await EmotionalRuleService.createEmotionalRule(req.body);
    return res.status(201).json(result);
  });

  /**
   * Update emotional rule
   * PATCH /api/v1/emotional-rules/:id
   */
  static updateEmotionalRule = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EmotionalRuleService.updateEmotionalRule(id, req.body);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Delete emotional rule
   * DELETE /api/v1/emotional-rules/:id
   */
  static deleteEmotionalRule = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EmotionalRuleService.deleteEmotionalRule(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Toggle emotional rule status
   * PATCH /api/v1/emotional-rules/:id/toggle
   */
  static toggleEmotionalRuleStatus = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EmotionalRuleService.toggleEmotionalRuleStatus(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Get emotional rules by trigger
   * GET /api/v1/emotional-rules/trigger/:trigger
   */
  static getEmotionalRulesByTrigger = catchAsyncHandler(async (req, res) => {
    const { trigger } = req.params;
    const result = await EmotionalRuleService.getEmotionalRulesByTrigger(
      trigger
    );
    return res.status(200).json(result);
  });
}

module.exports = EmotionalRuleController;
