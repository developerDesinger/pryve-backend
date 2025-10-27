const AIConfigService = require("../services/aiConfig.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class AIConfigController {
  static updateAIConfig = catchAsyncHandler(async (req, res) => {
    const result = await AIConfigService.createOrUpdateAIConfig(req.body);
    return res.status(200).json(result);
  });

  static getAIConfig = catchAsyncHandler(async (req, res) => {
    const result = await AIConfigService.getAIConfig();
    return res.status(200).json(result);
  });

  static deleteAIConfig = catchAsyncHandler(async (req, res) => {
    const result = await AIConfigService.deleteAIConfig();
    return res.status(200).json(result);
  });
}

module.exports = AIConfigController;
