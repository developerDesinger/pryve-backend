const ApiKeyService = require("../services/apiKey.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class ApiKeyController {
  /**
   * Create or update API key
   * POST /api/v1/api-keys
   */
  static createOrUpdateApiKey = catchAsyncHandler(async (req, res) => {
    const result = await ApiKeyService.createOrUpdateApiKey(req.body);
    return res.status(201).json(result);
  });

  /**
   * Get all API keys
   * GET /api/v1/api-keys
   */
  static getAllApiKeys = catchAsyncHandler(async (req, res) => {
    const result = await ApiKeyService.getAllApiKeys();
    return res.status(200).json(result);
  });

  /**
   * Get API key by ID
   * GET /api/v1/api-keys/:id
   */
  static getApiKeyById = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ApiKeyService.getApiKeyById(id);
    return res.status(200).json(result);
  });

  /**
   * Update API key
   * PATCH /api/v1/api-keys/:id
   */
  static updateApiKey = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ApiKeyService.updateApiKey(id, req.body);
    return res.status(200).json(result);
  });

  /**
   * Delete API key
   * DELETE /api/v1/api-keys/:id
   */
  static deleteApiKey = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ApiKeyService.deleteApiKey(id);
    return res.status(200).json(result);
  });

  /**
   * Toggle API key status
   * PATCH /api/v1/api-keys/:id/toggle
   */
  static toggleApiKeyStatus = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ApiKeyService.toggleApiKeyStatus(id);
    return res.status(200).json(result);
  });
}

module.exports = ApiKeyController;

