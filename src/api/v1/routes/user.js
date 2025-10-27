const express = require("express");
const UserController = require("../controller/UserController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();
router.get("/user-by-token", isAuthenticated, UserController.getUserByToken);
router.post("/create", UserController.createUser);
router.post("/login", UserController.loginUser);
router.post("/social-login", UserController.socialLoginUser);
router.post("/verify-otp", UserController.verifyOtp);
router.post("/resend-otp", UserController.resendOtp);
router.post("/forgot-password", UserController.forgotPassword);
router.post("/update-password", UserController.updatePassword);
router.post("/change-password", isAuthenticated, UserController.changePassword);

// Profile management routes

router.get("/get-all", UserController.getAllUsers);
router.get("/:id", UserController.getUser);
router.delete("/:id", UserController.deleteUser);
router.patch(
  "/update-profile/:id",
  isAuthenticated,
  UserController.updateProfile
);
router.patch(
  "/update-user/:id",
  isAuthenticated,
  UserController.updateUserAndProfileByAdmin
);
module.exports = router;
