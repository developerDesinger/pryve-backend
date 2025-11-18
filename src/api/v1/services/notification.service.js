const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) {
    return;
  }

  try {
    const serviceAccountPath = path.join(
      __dirname,
      "../../../config/firebase-service-account.json"
    );
    const serviceAccount = require(serviceAccountPath);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error.message);
    // Don't throw - allow service to work without push notifications
  }
}

// Initialize on module load
initializeFirebase();

class NotificationService {
  static messaging = firebaseInitialized ? getMessaging() : null;
  static async sendBroadcast({
    title,
    message,
    sendToAll = false,
    recipientIds = [],
    filters = {},
    metadata,
    category = "BROADCAST",
    sentById,
  }) {
    if (!title || !message) {
      throw new AppError(
        "Notification title and message are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    let recipients = [];

    if (sendToAll) {
      recipients = await prisma.user.findMany({
        where: {
          ...this.#buildRecipientWhere(filters),
          status: "ACTIVE",
          isDeleted: false,
        },
        select: { id: true, email: true, role: true },
      });
    } else {
      const uniqueRecipientIds = [...new Set(recipientIds)].filter(Boolean);

      if (!uniqueRecipientIds.length) {
        throw new AppError(
          "Provide at least one recipient or enable sendToAll.",
          HttpStatusCodes.BAD_REQUEST
        );
      }

      recipients = await prisma.user.findMany({
        where: {
          id: { in: uniqueRecipientIds },
          isDeleted: false,
        },
        select: { id: true, email: true, role: true },
      });
    }

    if (!recipients.length) {
      throw new AppError("No matching recipients found.", HttpStatusCodes.NOT_FOUND);
    }

    const records = await this.#persistNotifications(
      recipients.map((recipient) => ({
        title,
        message,
        category,
        eventType: "MANUAL",
        metadata: this.#normalizeMetadata({
          ...metadata,
          recipientEmail: recipient.email,
        }),
        recipientId: recipient.id,
        sentById,
      }))
    );

    // Send push notifications
    await this.#sendPushNotifications(records);

    return {
      success: true,
      count: records.length,
      notifications: records,
    };
  }

  static async getNotifications({
    userId,
    role,
    scope = "inbox",
    page = 1,
    pageSize = 20,
    category,
    eventType,
  }) {
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedPageSize = Math.min(
      Math.max(parseInt(pageSize, 10) || 20, 1),
      100
    );

    const where = {};

    if (scope === "sent") {
      where.sentById = userId;
    } else if (scope === "all" && role === "ADMIN") {
      where.OR = [
        { recipientId: userId },
        { recipientId: null },
        { sentById: userId },
      ];
    } else {
      where.recipientId = userId;
    }

    if (category) {
      where.category = category;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsedPage - 1) * parsedPageSize,
        take: parsedPageSize,
        include: {
          recipient: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          sentBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      success: true,
      data: notifications,
      meta: {
        page: parsedPage,
        pageSize: parsedPageSize,
        total,
        totalPages: Math.ceil(total / parsedPageSize) || 0,
        hasNextPage: parsedPage * parsedPageSize < total,
      },
    };
  }

  static async markAsRead(notificationId, userId) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId },
    });

    if (!notification) {
      throw new AppError("Notification not found.", HttpStatusCodes.NOT_FOUND);
    }

    if (notification.deliveryStatus === "READ") {
      return { success: true, data: notification };
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
        deliveryStatus: "READ",
      },
    });

    return { success: true, data: updated };
  }

  static async notifyPaymentEvent({ user, payment, sentById = null }) {
    if (!user || !payment) {
      return;
    }

    const metadata = {
      paymentId: payment.id,
      productId: payment.productId,
      price: payment.price,
      currency: payment.currency,
      eventType: payment.eventType,
    };

    const userTitle = "Payment received";
    const userMessage = payment.isActive
      ? `Thanks${
          user.fullName ? `, ${user.fullName}` : ""
        }! Your payment for ${payment.productId} was processed successfully.`
      : `We received an update about your ${payment.productId} payment. Please review your subscription status.`;

    const payloads = [
      {
        title: userTitle,
        message: userMessage,
        category: "PAYMENT",
        eventType: this.#mapPaymentEvent(payment.eventType),
        metadata,
        recipientId: user.id,
        sentById,
      },
    ];

    const admins = await this.#getAdminRecipients();

    if (admins.length) {
      const adminTitle =
        payment.eventType === "CANCELLATION"
          ? "Payment issue reported"
          : "New payment recorded";
      const adminMessage = `${user.email} reported a ${payment.eventType.toLowerCase()} event for ${payment.productId}.`;

      admins.forEach((admin) =>
        payloads.push({
          title: adminTitle,
          message: adminMessage,
          category: "PAYMENT",
          eventType: this.#mapPaymentEvent(payment.eventType),
          metadata: {
            ...metadata,
            userEmail: user.email,
          },
          recipientId: admin.id,
          sentById,
        })
      );
    }

    await this.#persistNotifications(payloads);
  }

  static async notifyNewUserRegistration(user) {
    if (!user) {
      return;
    }

    const payloads = [
      {
        title: "Welcome to Pryve!",
        message:
          "Your account was created successfully. We're excited to have you on board.",
        category: "ACCOUNT",
        eventType: "USER_REGISTERED",
        recipientId: user.id,
        metadata: {
          email: user.email,
        },
      },
    ];

    const admins = await this.#getAdminRecipients();

    admins.forEach((admin) =>
      payloads.push({
        title: "New user registered",
        message: `${user.email} just signed up for Pryve.`,
        category: "ACCOUNT",
        eventType: "USER_REGISTERED",
        recipientId: admin.id,
        metadata: {
          userEmail: user.email,
          userId: user.id,
        },
      })
    );

    const records = await this.#persistNotifications(payloads);
    
    // Send push notifications
    await this.#sendPushNotifications(records);
  }

  static async #persistNotifications(payloads = []) {
    if (!payloads.length) {
      return [];
    }

    const sanitized = payloads.map((payload) => ({
      deliveryStatus: "SENT",
      deliveredAt: new Date(),
      ...payload,
      metadata: this.#normalizeMetadata(payload.metadata),
    }));

    return prisma.$transaction((tx) =>
      Promise.all(
        sanitized.map((data) => tx.notification.create({ data }))
      )
    );
  }

  static #normalizeMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") {
      return undefined;
    }

    const cleaned = Object.entries(metadata).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    return Object.keys(cleaned).length ? cleaned : undefined;
  }

  static #buildRecipientWhere(filters = {}) {
    const where = {};

    if (filters.role) {
      where.role = filters.role;
    } else {
      where.role = "CLIENT";
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { fullName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  static #mapPaymentEvent(eventType) {
    if (!eventType) {
      return "PAYMENT_RECEIVED";
    }

    const normalized = eventType.toUpperCase();
    if (normalized.includes("CANCEL") || normalized.includes("FAIL")) {
      return "PAYMENT_FAILED";
    }

    return "PAYMENT_RECEIVED";
  }

  static async #getAdminRecipients() {
    return prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE", isDeleted: false },
      select: { id: true, email: true },
    });
  }

  /**
   * Send push notifications via FCM
   * @private
   */
  static async #sendPushNotifications(notifications = []) {
    if (!NotificationService.messaging || !notifications.length) {
      return;
    }

    try {
      // Get FCM tokens for all recipients
      const recipientIds = [
        ...new Set(notifications.map((n) => n.recipientId).filter(Boolean)),
      ];

      if (!recipientIds.length) {
        return;
      }

      const users = await prisma.user.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, fcmToken: true },
      });

      const tokenMap = new Map(
        users
          .filter((u) => u.fcmToken)
          .map((u) => [u.id, u.fcmToken])
      );

      if (!tokenMap.size) {
        console.log("⚠️ No FCM tokens found for recipients");
        return;
      }

      // Group notifications by recipient and send
      const notificationsByRecipient = new Map();

      notifications.forEach((notification) => {
        if (!notification.recipientId) return;

        const token = tokenMap.get(notification.recipientId);
        if (!token) return;

        if (!notificationsByRecipient.has(notification.recipientId)) {
          notificationsByRecipient.set(notification.recipientId, {
            token,
            notifications: [],
          });
        }

        notificationsByRecipient
          .get(notification.recipientId)
          .notifications.push(notification);
      });

      // Send notifications
      const sendPromises = Array.from(notificationsByRecipient.values()).map(
        async ({ token, notifications: recipientNotifications }) => {
          const latestNotification = recipientNotifications[0]; // Most recent

          const message = {
            notification: {
              title: latestNotification.title,
              body: latestNotification.message,
            },
            data: {
              notificationId: latestNotification.id,
              category: latestNotification.category,
              eventType: latestNotification.eventType || "",
              metadata: JSON.stringify(latestNotification.metadata || {}),
            },
            token,
            android: {
              notification: {
                sound: "default",
                priority: "high",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: recipientNotifications.length,
                },
              },
            },
          };

          try {
            await NotificationService.messaging.send(message);
            console.log(
              `✅ Push notification sent to user ${latestNotification.recipientId}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to send push notification:`,
              error.message
            );
            // If token is invalid, you might want to clear it from the database
            if (
              error.code === "messaging/invalid-registration-token" ||
              error.code === "messaging/registration-token-not-registered"
            ) {
              await prisma.user.update({
                where: { id: latestNotification.recipientId },
                data: { fcmToken: null },
              });
            }
          }
        }
      );

      await Promise.allSettled(sendPromises);
    } catch (error) {
      console.error("❌ Error sending push notifications:", error.message);
      // Don't throw - notifications are already persisted
    }
  }
}

module.exports = NotificationService;

