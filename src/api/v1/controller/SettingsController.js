const SettingsService = require("../services/settings.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class SettingsController {
  /**
   * Get complete settings
   * GET /api/v1/settings
   */
  static getCompleteSettings = catchAsyncHandler(async (req, res) => {
    const result = await SettingsService.getCompleteSettings();
    return res.status(200).json(result);
  });

  /**
   * Get all feature toggles
   * GET /api/v1/settings/feature-toggles
   */
  static getAllFeatureToggles = catchAsyncHandler(async (req, res) => {
    const result = await SettingsService.getAllFeatureToggles();
    return res.status(200).json(result);
  });

  /**
   * Get feature toggle by name
   * GET /api/v1/settings/feature-toggles/:name
   */
  static getFeatureToggleByName = catchAsyncHandler(async (req, res) => {
    const { name } = req.params;
    const result = await SettingsService.getFeatureToggleByName(name);
    return res.status(200).json(result);
  });

  /**
   * Update feature toggle
   * PATCH /api/v1/settings/feature-toggles/:name
   */
  static updateFeatureToggle = catchAsyncHandler(async (req, res) => {
    const { name } = req.params;
    const result = await SettingsService.updateFeatureToggle(name, req.body);
    return res.status(200).json(result);
  });

  /**
   * Toggle feature on/off
   * PATCH /api/v1/settings/feature-toggles/:name/toggle
   */
  static toggleFeature = catchAsyncHandler(async (req, res) => {
    const { name } = req.params;
    const result = await SettingsService.toggleFeature(name);
    return res.status(200).json(result);
  });

  /**
   * Get system language
   * GET /api/v1/settings/system-language
   */
  static getSystemLanguage = catchAsyncHandler(async (req, res) => {
    const result = await SettingsService.getSystemLanguage();
    return res.status(200).json(result);
  });

  /**
   * Update system language
   * PATCH /api/v1/settings/system-language
   */
  static updateSystemLanguage = catchAsyncHandler(async (req, res) => {
    const { language } = req.body;
    const result = await SettingsService.updateSystemLanguage(language);
    return res.status(200).json(result);
  });

  /**
   * Get all system settings
   * GET /api/v1/settings/system
   */
  static getAllSystemSettings = catchAsyncHandler(async (req, res) => {
    const result = await SettingsService.getAllSystemSettings();
    return res.status(200).json(result);
  });

  /**
   * Initialize default feature toggles (Admin only)
   * POST /api/v1/settings/feature-toggles/initialize
   */
  static initializeFeatureToggles = catchAsyncHandler(async (req, res) => {
    const result = await SettingsService.initializeDefaultFeatureToggles();
    return res.status(200).json(result);
  });
}

module.exports = SettingsController;

