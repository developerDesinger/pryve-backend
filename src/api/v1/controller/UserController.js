const UserService = require("../services/user.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class UserController {
  static createUser = catchAsyncHandler(async (req, res) => {
    const result = await UserService.createUser(req.body);
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
    const result = await UserService.verifyOtp(req.body);
    return res.status(200).json(result);
  });

  static resendOtp = catchAsyncHandler(async (req, res) => {
    const result = await UserService.resendOtp(req.body);
    return res.status(200).json(result);
  });

  static loginUser = catchAsyncHandler(async (req, res) => {
    const result = await UserService.loginUser(req.body);
    return res.status(200).json(result);
  });

  // Social Login
  static socialLoginUser = catchAsyncHandler(async (req, res) => {
    const result = await UserService.socialLogin(req.body);
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
}

module.exports = UserController;
