const NotificationService = require("../services/notification.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");
const HttpStatusCodes = require("../enums/httpStatusCode");

class NotificationController {
  static sendBroadcast = catchAsyncHandler(async (req, res) => {
    const { title, message, recipientIds, sendToAll, filters, metadata } =
      req.body;

    const result = await NotificationService.sendBroadcast({
      title,
      message,
      recipientIds,
      sendToAll,
      filters,
      metadata,
      sentById: req.user.id,
    });

    return res.status(HttpStatusCodes.CREATED).json(result);
  });

  static getNotifications = catchAsyncHandler(async (req, res) => {
    const { scope, page, pageSize, category, eventType } = req.query;

    const result = await NotificationService.getNotifications({
      userId: req.user.id,
      role: req.user.role,
      scope,
      page,
      pageSize,
      category,
      eventType,
    });

    return res.status(HttpStatusCodes.OK).json(result);
  });

  static markAsRead = catchAsyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const result = await NotificationService.markAsRead(
      notificationId,
      req.user.id
    );

    return res.status(HttpStatusCodes.OK).json(result);
  });
}

module.exports = NotificationController;

