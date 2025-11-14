const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");

class RevenueCatService {
  /**
   * Process RevenueCat webhook event and save payment details
   * @param {Object} webhookData - The webhook payload from RevenueCat
   * @returns {Promise<Object>} - Result of processing the webhook
   */
  static async processWebhook(webhookData) {
    try {
      console.log(
        "📥 [REVENUECAT WEBHOOK] Received webhook:",
        JSON.stringify(webhookData, null, 2)
      );

      // Extract event type
      const eventType = webhookData.event?.type || webhookData.type;
      if (!eventType) {
        throw new AppError(
          "Event type is required",
          HttpStatusCodes.BAD_REQUEST
        );
      }

      // Extract app_user_id (this should map to your user's email or a unique identifier)
      const appUserId =
        webhookData.event?.app_user_id || webhookData.app_user_id;
      if (!appUserId) {
        throw new AppError(
          "app_user_id is required",
          HttpStatusCodes.BAD_REQUEST
        );
      }

      // Find user by email (assuming app_user_id is the email)
      // You may need to adjust this based on how you identify users
      let user = await prisma.user.findUnique({
        where: { email: appUserId },
      });

      // If user not found by email, try to find by id or other identifier
      if (!user) {
        user = await prisma.user.findUnique({
          where: { id: appUserId },
        });
      }

      if (!user) {
        console.warn(
          `⚠️ [REVENUECAT WEBHOOK] User not found for app_user_id: ${appUserId}`
        );
        // You might want to create a user or handle this differently
        // For now, we'll throw an error
        throw new AppError(
          `User not found for app_user_id: ${appUserId}`,
          HttpStatusCodes.NOT_FOUND
        );
      }

      // Extract product information
      const product = webhookData.event?.product_id || webhookData.product_id;
      const productId =
        product ||
        webhookData.event?.entitlements?.[0]?.product_identifier ||
        "unknown";

      // Extract transaction information
      const transactionId =
        webhookData.event?.transaction_id ||
        webhookData.transaction_id ||
        webhookData.event?.id;

      const originalTransactionId =
        webhookData.event?.original_transaction_id ||
        webhookData.original_transaction_id;

      // Extract store information
      const store =
        webhookData.event?.store ||
        webhookData.store ||
        webhookData.event?.platform;

      // Extract dates
      const purchaseDate = webhookData.event?.purchased_at_ms
        ? new Date(webhookData.event.purchased_at_ms)
        : webhookData.event?.purchased_at
        ? new Date(webhookData.event.purchased_at)
        : webhookData.purchase_date
        ? new Date(webhookData.purchase_date)
        : null;

      const expirationDate = webhookData.event?.expires_at_ms
        ? new Date(webhookData.event.expires_at_ms)
        : webhookData.event?.expires_at
        ? new Date(webhookData.event.expires_at)
        : webhookData.expiration_date
        ? new Date(webhookData.expiration_date)
        : null;

      // Extract period type
      const periodType =
        webhookData.event?.period_type ||
        webhookData.period_type ||
        webhookData.event?.introductory_price_period_type;

      // Extract entitlement status
      const entitlementStatus = webhookData.event?.entitlements?.[0]?.expires_at
        ? new Date(webhookData.event.entitlements[0].expires_at) > new Date()
          ? "ACTIVE"
          : "EXPIRED"
        : webhookData.event?.entitlement_ids?.[0]
        ? "ACTIVE"
        : webhookData.entitlement_status || "UNKNOWN";

      // Determine if subscription is active
      const isActive =
        entitlementStatus === "ACTIVE" ||
        (expirationDate && new Date(expirationDate) > new Date()) ||
        false;

      // Extract pricing information
      const price =
        webhookData.event?.price ||
        webhookData.price ||
        webhookData.event?.price_in_purchased_currency;

      const currency =
        webhookData.event?.currency ||
        webhookData.currency ||
        webhookData.event?.price_in_purchased_currency_currency;

      const priceInPurchasedCurrency =
        webhookData.event?.price_in_purchased_currency ||
        webhookData.price_in_purchased_currency;

      // Extract environment
      const environment =
        webhookData.event?.environment ||
        webhookData.environment ||
        webhookData.event?.is_sandbox
          ? "SANDBOX"
          : "PRODUCTION";

      // Extract app ID
      const appId = webhookData.event?.app_id || webhookData.app_id;

      // Create payment record
      const payment = await prisma.revenueCatPayment.create({
        data: {
          userId: user.id,
          eventType: eventType,
          appUserId: appUserId,
          productId: productId,
          transactionId: transactionId,
          originalTransactionId: originalTransactionId,
          store: store,
          purchaseDate: purchaseDate,
          expirationDate: expirationDate,
          periodType: periodType,
          entitlementStatus: entitlementStatus,
          isActive: isActive,
          price: price ? parseFloat(price) : null,
          currency: currency,
          priceInPurchasedCurrency: priceInPurchasedCurrency
            ? parseFloat(priceInPurchasedCurrency)
            : null,
          rawWebhookData: webhookData,
          environment: environment,
          appId: appId,
        },
      });

      console.log(
        `✅ [REVENUECAT WEBHOOK] Payment record created: ${payment.id} for user: ${user.email}`
      );

      return {
        success: true,
        message: "Webhook processed successfully",
        data: {
          paymentId: payment.id,
          userId: user.id,
          eventType: eventType,
          isActive: isActive,
        },
      };
    } catch (error) {
      console.error("❌ [REVENUECAT WEBHOOK] Error processing webhook:", error);
      throw error;
    }
  }

  /**
   * Get all payment records for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - List of payment records
   */
  static async getUserPayments(userId) {
    const payments = await prisma.revenueCatPayment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: payments,
      count: payments.length,
    };
  }

  /**
   * Get active subscription for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Active subscription details
   */
  static async getActiveSubscription(userId) {
    const activePayment = await prisma.revenueCatPayment.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: activePayment,
      hasActiveSubscription: !!activePayment,
    };
  }

  /**
   * Get paginated payment history across all users with optional filters
   * @param {Object} filters - Query params from the request
   * @returns {Promise<Object>} - Paginated list of payment records with metadata
   */
  static async getAllPayments(filters = {}) {
    const {
      search,
      eventType,
      store,
      environment,
      isActive,
      startDate,
      endDate,
      page = 1,
      pageSize = 50,
    } = filters;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedPageSize = Math.min(
      Math.max(parseInt(pageSize, 10) || 50, 1),
      200
    );

    const where = {};

    if (eventType) {
      where.eventType = eventType;
    }

    if (store) {
      where.store = store;
    }

    if (environment) {
      where.environment = environment;
    }

    if (typeof isActive !== "undefined") {
      if (typeof isActive === "string") {
        const normalized = isActive.toLowerCase();
        if (["true", "false"].includes(normalized)) {
          where.isActive = normalized === "true";
        }
      } else if (typeof isActive === "boolean") {
        where.isActive = isActive;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!Number.isNaN(parsedStart.getTime())) {
          where.createdAt.gte = parsedStart;
        }
      }

      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!Number.isNaN(parsedEnd.getTime())) {
          where.createdAt.lte = parsedEnd;
        }
      }

      if (Object.keys(where.createdAt).length === 0) {
        delete where.createdAt;
      }
    }

    if (search) {
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        where.OR = [
          { productId: { contains: trimmedSearch, mode: "insensitive" } },
          { transactionId: { contains: trimmedSearch, mode: "insensitive" } },
          {
            originalTransactionId: {
              contains: trimmedSearch,
              mode: "insensitive",
            },
          },
          { appUserId: { contains: trimmedSearch, mode: "insensitive" } },
          {
            user: {
              is: {
                OR: [
                  { email: { contains: trimmedSearch, mode: "insensitive" } },
                  {
                    fullName: { contains: trimmedSearch, mode: "insensitive" },
                  },
                  {
                    userName: { contains: trimmedSearch, mode: "insensitive" },
                  },
                ],
              },
            },
          },
        ];
      }
    }

    const [records, total] = await Promise.all([
      prisma.revenueCatPayment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              userName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (parsedPage - 1) * parsedPageSize,
        take: parsedPageSize,
      }),
      prisma.revenueCatPayment.count({ where }),
    ]);

    return {
      success: true,
      data: records,
      meta: {
        page: parsedPage,
        pageSize: parsedPageSize,
        total,
        totalPages: Math.ceil(total / parsedPageSize) || 0,
        hasNextPage: parsedPage * parsedPageSize < total,
      },
    };
  }
}

module.exports = RevenueCatService;
