const ChatSettingsService = require("../services/chatSettings.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class ChatSettingsController {
  static getChatSettings = catchAsyncHandler(async (req, res) => {
    const result = await ChatSettingsService.getChatSettings();
    return res.status(200).json(result);
  });

  static updateChatSettings = catchAsyncHandler(async (req, res) => {
    const result = await ChatSettingsService.updateChatSettings(req.body);
    return res.status(200).json(result);
  });
}

module.exports = ChatSettingsController;
