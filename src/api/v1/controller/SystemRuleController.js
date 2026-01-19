const SystemRuleService = require("../services/systemRule.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class SystemRuleController {
  /**
   * Get all system rules
   * GET /api/v1/system-rules
   */
  static getAllSystemRules = catchAsyncHandler(async (req, res) => {
    const result = await SystemRuleService.getAllSystemRules();
    return res.status(200).json(result);
  });

  /**
   * Get single system rule by ID
   * GET /api/v1/system-rules/:id
   */
  static getSystemRuleById = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await SystemRuleService.getSystemRuleById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Create new system rule
   * POST /api/v1/system-rules
   */
  static createSystemRule = catchAsyncHandler(async (req, res) => {
    console.log("Creating system rule with data:", req.body);
    const result = await SystemRuleService.createSystemRule(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(201).json(result);
  });

  /**
   * Update system rule
   * PATCH /api/v1/system-rules/:id
   */
  static updateSystemRule = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await SystemRuleService.updateSystemRule(id, req.body);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Delete system rule
   * DELETE /api/v1/system-rules/:id
   */
  static deleteSystemRule = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await SystemRuleService.deleteSystemRule(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Toggle system rule status
   * PATCH /api/v1/system-rules/:id/toggle
   */
  static toggleSystemRuleStatus = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await SystemRuleService.toggleSystemRuleStatus(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Get system rules by category
   * GET /api/v1/system-rules/category/:category
   */
  static getSystemRulesByCategory = catchAsyncHandler(async (req, res) => {
    const { category } = req.params;
    const result = await SystemRuleService.getSystemRulesByCategory(category);
    return res.status(200).json(result);
  });

  /**
   * Get active system rules
   * GET /api/v1/system-rules/active
   */
  static getActiveSystemRules = catchAsyncHandler(async (req, res) => {
    const result = await SystemRuleService.getActiveSystemRules();
    return res.status(200).json(result);
  });
}

module.exports = SystemRuleController;