const express = require("express");
const AuthLogController = require("../controller/AuthLogController");

const router = express.Router();

// No authentication required for these routes as per user request
router.get("/", AuthLogController.getAuthLogs);
router.get("/stats", AuthLogController.getAuthStats);

module.exports = router;

