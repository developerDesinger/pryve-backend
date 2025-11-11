const express = require("express");
const AnalyticsController = require("../controller/AnalyticsController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/emotions", isAuthenticated, AnalyticsController.getEmotionSummary);

module.exports = router;
