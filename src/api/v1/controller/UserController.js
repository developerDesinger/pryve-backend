const UserService = require("../services/user.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");
const { extractRequestMetadata } = require("../utils/requestMetadata");

class UserController {
  static createUser = catchAsyncHandler(async (req, res) => {
    const requestMetadata = extractRequestMetadata(req);
    const result = await UserService.createUser(req.body, requestMetadata);
    return res.status(201).json(result);
  });

  static updateUserAndProfile = catchAsyncHandler(async (req, res) => {
    console.log("userId", req.user);
    const { id } = req.user; // Get user id from token
    console.log("userId", id);
    const result = await UserService.updateUserAndProfile(id, req.body);
    return res.status(200).json(result);
  });

  static verifyUserName = catchAsyncHandler(async (req, res) => {
    const result = await UserService.verifyUserName(req.body);
    return res.status(200).json(result);
  });

  static verifyOtp = catchAsyncHandler(async (req, res) => {
    const requestMetadata = extractRequestMetadata(req);
    const result = await UserService.verifyOtp(req.body, requestMetadata);
    return res.status(200).json(result);
  });

  static resendOtp = catchAsyncHandler(async (req, res) => {
    const result = await UserService.resendOtp(req.body);
    return res.status(200).json(result);
  });

  static loginUser = catchAsyncHandler(async (req, res) => {
    const requestMetadata = extractRequestMetadata(req);
    const result = await UserService.loginUser(req.body, requestMetadata);
    return res.status(200).json(result);
  });

  // Social Login
  static socialLoginUser = catchAsyncHandler(async (req, res) => {
    console.log("🔐 [SOCIAL LOGIN] Request received");
    console.log("📦 [SOCIAL LOGIN] Request body:", JSON.stringify(req.body, null, 2));
    console.log("📋 [SOCIAL LOGIN] Request body details:", {
      email: req.body?.email || '(empty)',
      provider: req.body?.provider,
      providerId: req.body?.providerId,
      userName: req.body?.userName || '(empty)',
      firstName: req.body?.firstName || '(empty)',
      lastName: req.body?.lastName || '(empty)',
      hasProfilePhoto: !!req.body?.profilePhoto,
    });
    
    const requestMetadata = extractRequestMetadata(req);
    const result = await UserService.socialLogin(req.body, requestMetadata);
    
    console.log("✅ [SOCIAL LOGIN] Success - User ID:", result?.user?.id, "Email:", result?.user?.email);
    
    return res.status(200).json(result);
  });

  static getAllUsers = catchAsyncHandler(async (req, res) => {
    const users = await UserService.getAllUsers(req.query);
    return res.status(200).json(users);
  });

  static getUserByUserName = catchAsyncHandler(async (req, res) => {
    const users = await UserService.getUserByUserName(req.body);
    return res.status(200).json(users);
  });

  static getUserPageByUserName = catchAsyncHandler(async (req, res) => {
    const users = await UserService.getUserPageByUserName(req.body);
    return res.status(200).json(users);
  });

  static getAllUsersByRole = catchAsyncHandler(async (req, res) => {
    const result = await UserService.getAllUsersByRole(req.body);
    return res.status(200).json(result);
  });

  static updateUser = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await UserService.updateUser(id, req.body);
    return res.status(200).json(result);
  });

  static getUser = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await UserService.getUser(id);
    return res.status(200).json(result);
  });

  static getUserByToken = catchAsyncHandler(async (req, res) => {
    console.log("req.user", req.user);
    const { id } = req.user;
    const result = await UserService.getUserByToken(id);
    return res.status(200).json(result);
  });
  static deleteUser = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await UserService.deleteUser(id);
    return res.status(200).json(result);
  });

  static forgotPassword = catchAsyncHandler(async (req, res) => {
    const result = await UserService.forgotPassword(req.body);
    return res.status(200).json(result);
  });

  static updatePassword = catchAsyncHandler(async (req, res) => {
    const result = await UserService.updatePassword(req.body);
    return res.status(200).json(result);
  });

  static updateProfile = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const { id: userId } = req.user; // Get user ID from token

    // Ensure user can only update their own profile
    if (id !== userId) {
      return res.status(403).json({
        message: "You can only update your own profile.",
        success: false,
      });
    }

    const result = await UserService.updateProfile(id, req.body);
    return res.status(200).json(result);
  });

  static updateUserAndProfileByAdmin = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const { id: userId } = req.user; // Get user ID from token

    // Ensure user can only update their own profile
    if (id !== userId) {
      return res.status(403).json({
        message: "You can only update your own profile.",
        success: false,
      });
    }

    const result = await UserService.updateUserAndProfile(id, req.body);
    return res.status(200).json(result);
  });

  static changePassword = catchAsyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { id: userId } = req.user;
    const result = await UserService.changePassword({
      userId,
      oldPassword,
      newPassword,
    });
    return res.status(200).json(result);
  });

  static getAllUsers = catchAsyncHandler(async (req, res) => {
    const result = await UserService.getAllUsersService(req.query);
    return res.status(200).json(result);
  });

  static deleteAccount = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user; // Get user ID from token
    
    const result = await UserService.deleteAccount(userId);
    return res.status(200).json(result);
  });

  static deleteOwnAccount = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user; // Get user ID from token
    
    const result = await UserService.deleteOwnAccount(userId);
    return res.status(200).json(result);
  });

  static adminDeleteUserByEmail = catchAsyncHandler(async (req, res) => {
    const { email, code } = req.body;
    
    const result = await UserService.adminDeleteUserByEmail({ email, code });
    return res.status(200).json(result);
  });

  static permanentlyDeleteUser = catchAsyncHandler(async (req, res) => {
    const { email } = req.body; // Get email from request body
    
    if (!email) {
      return res.status(400).json({
        message: "email is required in request body.",
        success: false,
      });
    }
    
    const result = await UserService.permanentlyDeleteUserByEmail(email);
    return res.status(200).json(result);
  });

  static permanentlyDeleteUserByProviderId = catchAsyncHandler(async (req, res) => {
    const { providerId } = req.body; // Get providerId from request body
    
    if (!providerId) {
      return res.status(400).json({
        message: "providerId is required in request body.",
        success: false,
      });
    }
    
    const result = await UserService.permanentlyDeleteUserByProviderId(providerId);
    return res.status(200).json(result);
  });
}

module.exports = UserController;
