const express = require("express");
const RevenueCatController = require("../controller/RevenueCatController");
const {
  isAuthenticated,
  restrictTo,
} = require("../middlewares/auth.middleware");

const router = express.Router();

// Webhook endpoint (no authentication required - RevenueCat will call this)
// RevenueCat webhooks should be secured with authorization header validation
router.post("/webhook", RevenueCatController.handleWebhook);

// User payment endpoints (authenticated)
router.get("/payments", isAuthenticated, RevenueCatController.getUserPayments);
router.get(
  "/active-subscription",
  isAuthenticated,
  RevenueCatController.getActiveSubscription
);

// Admin payment history endpoint
router.get(
  "/admin/payments",
  isAuthenticated,
  restrictTo("ADMIN"),
  RevenueCatController.getAllPayments
);

module.exports = router;
