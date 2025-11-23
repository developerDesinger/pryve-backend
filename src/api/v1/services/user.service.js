const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const { createJwtToken } = require("../middlewares/auth.middleware");
const { s3SharpImageUpload } = require("../services/aws.service");
const { sendEmail, sendForgotPasswordEmail } = require("../utils/email");
const NotificationService = require("./notification.service");
const RevenueCatService = require("./revenuecat.service");
const Logger = require("../utils/logger");

const buildPaymentPayload = async (userId) => {
  try {
    const [activeSubscriptionResult, paymentsResult] = await Promise.all([
      RevenueCatService.getActiveSubscription(userId),
      RevenueCatService.getUserPayments(userId),
    ]);

    return {
      hasActiveSubscription: activeSubscriptionResult.hasActiveSubscription,
      activeSubscription: activeSubscriptionResult.data,
      payments: paymentsResult.data || [],
    };
  } catch (error) {
    Logger.error("Failed to fetch payment data for user.", {
      userId,
      error: error?.message,
    });
    return {
      hasActiveSubscription: false,
      activeSubscription: null,
      payments: [],
      error: "PAYMENT_DATA_UNAVAILABLE",
    };
  }
};

class UserService {
  static async createUser(data) {
    const { email, fullName, profilePhoto } = data;

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } });

    // If user exists and is active, return error
    if (user && user.status === "ACTIVE") {
      return {
        user,
        message: "User with this email already exists and is active.",
        success: true,
      };
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`🔐 [CREATE USER] Generated OTP for ${email}: ${otp}`);

    if (user) {
      // User exists but is inactive - resend OTP
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName,
          profilePhoto,
          otp,
          otpCreatedAt: new Date(),
        },
      });
    } else {
      // Create new user without password (will be set after OTP verification)
      user = await prisma.user.create({
        data: {
          email,
          fullName,
          role: "CLIENT",
          status: "INACTIVE",
          otp,
          profilePhoto,
          otpCreatedAt: new Date(),
          queryCount: 20, // Initialize with 20 free queries
        },
      });
    }

    // Send OTP email
    try {
      console.log(`📧 [CREATE USER] Sending OTP email to: ${email}`);
      await sendEmail({
        email: email,
        otp: otp,
        subject: "Verify Your Email - Pryve",
      });
      console.log(`✅ [CREATE USER] OTP email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error(
        `❌ [CREATE USER] Failed to send OTP email to ${email}:`,
        emailError.message
      );
      // Don't throw error here - user is created, just email failed
      // You might want to implement a retry mechanism or queue for failed emails
    }

    return {
      message: "OTP sent to your email. Please verify to continue.",
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        profilePhoto: user.profilePhoto,
        status: user.status,
      },
    };
  }

  static async updateUserAndProfile(userId, updateData) {
    // Prepare update data
    const updateFields = { ...updateData };

    // Handle password hashing if present
    if (updateFields.password) {
      updateFields.password = await bcrypt.hash(updateFields.password, 10);
    }

    // Handle isDeleted field - if setting to true, also set deletedAt
    if (updateFields.isDeleted === true) {
      updateFields.deletedAt = new Date();
      updateFields.status = "INACTIVE";
    } else if (updateFields.isDeleted === false) {
      updateFields.deletedAt = null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateFields,
    });

    if (!updatedUser) {
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    }

    return {
      message: "User and profile updated successfully.",
      user: updatedUser,
      success: true,
    };
  }

  static async verifyUserName(data) {
    const { userName } = data;

    const existingUser = await prisma.user.findUnique({ where: { userName } });
    if (existingUser) {
      throw new AppError(
        "UserName already in use.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    return { message: "UserName Available", success: true };
  }

  static async verifyOtp(data) {
    const { email, otp } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.BAD_REQUEST);
    }

    if (user.otp !== otp.toString()) {
      throw new AppError("Invalid OTP.", HttpStatusCodes.BAD_REQUEST);
    }

    const otpExpiryTime = 10 * 60 * 1000;
    if (Date.now() - user.otpCreatedAt.getTime() > otpExpiryTime) {
      throw new AppError("OTP has expired.", HttpStatusCodes.BAD_REQUEST);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE" },
    });

    await NotificationService.notifyNewUserRegistration(updatedUser);

    const token = createJwtToken({ id: user.id, role: user.role });

    return {
      message: "OTP verified successfully.",
      success: true,
      user: updatedUser,
      token,
    };
  }

  static async resendOtp(data) {
    const { email } = data;

    console.log(`🔄 [RESEND OTP] Resending OTP for email: ${email}`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.BAD_REQUEST);
    }

    // Check if user is already active
    if (user.status === "ACTIVE") {
      return {
        message: "User is already verified and active. No need to resend OTP.",
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          status: user.status,
        },
      };
    }

    // Check if user is inactive (needs verification)
    if (user.status !== "INACTIVE") {
      throw new AppError(
        "User account is not in a state that requires OTP verification.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔐 [RESEND OTP] Generated new OTP for ${email}: ${otp}`);

    // Update user with new OTP
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpCreatedAt: new Date(),
      },
    });

    // Send OTP email
    try {
      console.log(`📧 [RESEND OTP] Sending OTP email to: ${email}`);
      await sendEmail({
        email: email,
        otp: otp,
        subject: "Your Verification Code - Pryve",
      });
      console.log(`✅ [RESEND OTP] OTP email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error(
        `❌ [RESEND OTP] Failed to send OTP email to ${email}:`,
        emailError.message
      );
      throw new AppError(
        "Failed to send OTP email. Please try again.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return {
      message: "OTP has been resent successfully. Please check your email.",
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        status: updatedUser.status,
      },
    };
  }

  static async loginUser(data) {
    const { email, password, role } = data;
    if (!email || !password) {
      return {
        message: "Email, password, and role are required.",
        success: false,
      };
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        status: true,
        fullName: true,
        profilePhoto: true,
        userName: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });
    if (!user) {
      return {
        message: "Invalid email or password.",
        success: false,
      };
    }

    // Check if account is deleted
    if (user.isDeleted) {
      return {
        message: "This account has been deleted.",
        success: false,
      };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        message: "Invalid email or password.",
        success: false,
      };
    }
    // if (user.role !== role) {
    //   throw new AppError(
    //     "Role mismatch. Access denied.",
    //     HttpStatusCodes.UNAUTHORIZED
    //   );
    // }
    if (user.status !== "ACTIVE") {
      return {
        message: "Account is inactive. Please verify your email.",
        success: false,
        status: user.status,
      };
    }

    const token = createJwtToken({ id: user.id, role: user.role });
    const paymentData = await buildPaymentPayload(user.id);
    return {
      message: "Login successful.",
      success: true,
      user,
      token,
      paymentData,
    };
  }

  static async socialLogin(data) {
    const {
      email,
      provider,
      providerId,
      userName,
      profilePhoto,
      firstName,
      lastName,
    } = data;

    if (!provider || !providerId) {
      throw new AppError(
        "provider, and providerId are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    let user = await prisma.user.findUnique({ where: { providerId } });

    // If user doesn't exist, create a new one
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          userName,
          loginType: provider,
          providerId,
          role: "CLIENT", // Default role for new users
          status: "ACTIVE", // Default status for social login
          profilePhoto,
          firstName,
          lastName,
          queryCount: 20, // Initialize with 20 free queries
        },
      });
    } else {
      // Update login type and providerId if different or missing
      const updateData = {};
      if (user.loginType !== provider) {
        updateData.loginType = provider;
      }
      if (!user.providerId || user.providerId !== providerId) {
        updateData.providerId = providerId;
      }
      
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }

      // Check if the account is active
      if (user.status !== "ACTIVE") {
        throw new AppError(
          "Account is inactive. Please contact support.",
          HttpStatusCodes.UNAUTHORIZED
        );
      }

      // Check if account is deleted
      if (user.isDeleted) {
        throw new AppError(
          "This account has been deleted.",
          HttpStatusCodes.UNAUTHORIZED
        );
      }
    }

    const token = createJwtToken({ id: user.id, role: user.role });
    const paymentData = await buildPaymentPayload(user.id);
    return {
      message: "Social login successful.",
      success: true,
      user,
      token,
      paymentData,
    };
  }

  static async getAllUsersService(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Global counts for dashboard
    const [statusGroups, totalUsersAll] = await Promise.all([
      prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.count(),
    ]);
    const statusCountMap = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all])
    );
    const counts = {
      totalUsers: totalUsersAll,
      activeUsers: statusCountMap.ACTIVE || 0,
      suspendedUsers: statusCountMap.SUSPENDED || 0, // change if your suspended status differs
      premiumUsers: 0, // TODO: replace after confirming premium logic
    };

    const totalActiveUsers = statusCountMap.ACTIVE || 0;
    const totalPages = Math.ceil(totalActiveUsers / limit);

    const users = await prisma.user.findMany({
      where: { 
        status: "ACTIVE",
        isDeleted: false
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            favoriteMessages: true,
          },
        },
      },
    });

    if (!users || users.length === 0) {
      return {
        message: "No users found.",
        success: false,
        data: [],
        counts, // added
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          limit,
        },
      };
    }

    // Shape users to include favoriteCount and omit Prisma _count if desired
    const shapedUsers = users.map((u) => ({
      ...u,
      favoriteCount: u._count?.favoriteMessages || 0,
      _count: undefined,
    }));

    return {
      message: "Users fetched successfully.",
      success: true,
      data: shapedUsers,
      counts, // added
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalActiveUsers,
        limit,
      },
    };
  }

  static async getAllUsersByRole(role) {
    if (!role) {
      throw new AppError("Role is required.", HttpStatusCodes.BAD_REQUEST);
    }
    console.log("Role:", role);

    const users = await prisma.user.findMany({ where: { role: role.role } });
    console.log("Users found:", users);
    return {
      message: ` All user with ${role.role}`,
      success: true,
      data: users,
    };
  }

  static async getUserByUserName(userName) {
    if (!userName) {
      throw new AppError("userName is required.", HttpStatusCodes.BAD_REQUEST);
    }
    console.log("userName", userName);
    const users = await prisma.user.findMany({
      where: { userName: userName.userName },
    });
    console.log("Users found:", users);
    return {
      message: `User`,
      success: true,
      data: users,
    };
  }

  static async updateUser(userId, updateData) {
    // Prepare update data
    const updateFields = { ...updateData };

    // Handle isDeleted field - if setting to true, also set deletedAt
    if (updateFields.isDeleted === true) {
      updateFields.deletedAt = new Date();
      updateFields.status = "INACTIVE";
    } else if (updateFields.isDeleted === false) {
      updateFields.deletedAt = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateFields,
    });

    if (!updatedUser) {
      throw new AppError("User profile not found.", HttpStatusCodes.NOT_FOUND);
    }

    return {
      message: "User profile updated successfully.",
      profile: updatedUser,
      success: true,
    };
  }

  static async getUser(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);

    const paymentData = await buildPaymentPayload(userId);

    return {
      message: "User updated successfully.",
      user,
      paymentData,
      success: true,
    };
  }

  static async deleteUser(userId) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        status: "ACTIVE",
      },
    });

    if (!user) {
      throw new AppError("Active user not found", HttpStatusCodes.NOT_FOUND);
    }

    // Soft delete by updating status to inactive
    await prisma.user.update({
      where: { id: userId },
      data: { status: "INACTIVE" },
    });

    return {
      message: "user deactivated successfully",
      success: true,
    };
  }

  /**
   * Simple delete account - just sets isDeleted to true
   * This is a simpler version that only marks the user as deleted
   */
  static async deleteAccount(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", HttpStatusCodes.NOT_FOUND);
    }

    // Check if already deleted
    if (user.isDeleted) {
      throw new AppError("Account already deleted", HttpStatusCodes.BAD_REQUEST);
    }

    try {
      const now = new Date();

      // Simply mark user as deleted
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          deletedAt: now,
          status: "INACTIVE",
        },
      });

      return {
        message: "Account deleted successfully.",
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      console.error("Error deleting account:", error);
      throw new AppError(
        "Failed to delete account. Please try again.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async deleteOwnAccount(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chats: true,
        mediaLibrary: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", HttpStatusCodes.NOT_FOUND);
    }

    // Check if already deleted
    if (user.isDeleted) {
      throw new AppError("Account already deleted", HttpStatusCodes.BAD_REQUEST);
    }

    try {
      const now = new Date();

      // Soft delete all related data in a transaction
      await prisma.$transaction(async (tx) => {
        // Mark user as deleted
        await tx.user.update({
          where: { id: userId },
          data: {
            isDeleted: true,
            deletedAt: now,
            status: "INACTIVE",
          },
        });

        // Mark all chats as deleted
        await tx.chat.updateMany({
          where: { userId },
          data: {
            isDeleted: true,
            deletedAt: now,
            isActive: false,
          },
        });

        // Mark all messages as deleted
        await tx.message.updateMany({
          where: { senderId: userId },
          data: {
            isDeleted: true,
            deletedAt: now,
          },
        });

        // Mark all media files as deleted
        await tx.mediaLibrary.updateMany({
          where: { userId },
          data: {
            isDeleted: true,
            deletedAt: now,
          },
        });
      });

      return {
        message: "Account deleted successfully.",
        success: true,
      };
    } catch (error) {
      console.error("Error deleting account:", error);
      throw new AppError(
        "Failed to delete account. Please try again.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async forgotPassword(data) {
    const { email } = data;

    console.log(
      `🔐 [FORGOT PASSWORD] Processing forgot password for email: ${email}`
    );

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔐 [FORGOT PASSWORD] Generated OTP for ${email}: ${otp}`);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpCreatedAt: new Date(),
      },
    });

    // Send forgot password email
    try {
      console.log(
        `📧 [FORGOT PASSWORD] Sending forgot password email to: ${email}`
      );
      await sendForgotPasswordEmail({
        email: email,
        otp: otp,
        subject: "Reset Your Password - Pryve",
      });
      console.log(
        `✅ [FORGOT PASSWORD] Forgot password email sent successfully to: ${email}`
      );
    } catch (emailError) {
      console.error(
        `❌ [FORGOT PASSWORD] Failed to send forgot password email to ${email}:`,
        emailError.message
      );
      throw new AppError(
        "Failed to send password reset email. Please try again.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return {
      message:
        "OTP has been sent to your email. Please verify to reset your password.",
      success: true,
      data: user,
    };
  }

  static async updatePassword(data) {
    const { email, userId, newPassword } = data;

    if (!newPassword) {
      throw new AppError("New password is required.", 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        email,
      },
    });
    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: "Password updated successfully.",
      success: true,
      user: updatedUser,
    };
  }

  static async changePassword({ userId, oldPassword, newPassword }) {
    if (!oldPassword || !newPassword) {
      throw new AppError("Old and new passwords are required.", 400);
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new AppError("User not found.", 404);
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new AppError("Old password is incorrect.", 400);
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
    return {
      message: "Password changed successfully.",
      success: true,
      user: updatedUser,
    };
  }

  static async updateProfile(userId, data) {
    try {
      // Destructure all possible updatable fields
      const {
        // Basic profile fields
        userName,
        password,
        profilePhoto,
        email,
        firstName,
        lastName,
        fullName,
        // Additional profile fields
        gender,
        dateOfBirth,
        country,
        region,
        phoneNumber,
        bio,
      } = data;

      const userToUpdate = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!userToUpdate) {
        throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
      }

      let updates = {};

      // Check email uniqueness if email is being updated
      if (email && email !== userToUpdate.email) {
        const emailExists = await prisma.user.findFirst({
          where: {
            email,
            id: { not: userId },
          },
        });
        if (emailExists) {
          throw new AppError(
            "Email already exists. Please use another email.",
            HttpStatusCodes.BAD_REQUEST
          );
        }
        updates.email = email;
      }

      // Handle profile photo as URL only
      if (profilePhoto) {
        updates.profilePhoto = profilePhoto;
      }

      // Handle password update
      if (password) {
        if (!password) {
          throw new AppError("Password is required.", 400);
        }
        updates.password = await bcrypt.hash(password, 10);
      }

      // Handle username update
      if (userName) {
        const existingUser = await prisma.user.findFirst({
          where: {
            userName,
            id: { not: userId },
          },
        });
        if (existingUser) {
          throw new AppError(
            "Username already taken.",
            HttpStatusCodes.BAD_REQUEST
          );
        }
        updates.userName = userName;
      }

      // Basic profile fields
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (fullName !== undefined) updates.fullName = fullName;

      // Additional profile fields
      if (gender !== undefined) updates.gender = gender.toUpperCase();
      if (dateOfBirth !== undefined)
        updates.dateOfBirth = new Date(dateOfBirth);
      if (country !== undefined) updates.country = country;
      if (region !== undefined) updates.region = region;
      if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
      if (bio !== undefined) updates.bio = bio;

      if (Object.keys(updates).length > 0) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updates,
        });

        return {
          message: "Profile updated successfully.",
          success: true,
          user: updatedUser,
        };
      }

      return {
        message: "No changes to update.",
        success: true,
        user: userToUpdate,
      };
    } catch (error) {
      throw new AppError(
        error.message || "Failed to update profile.",
        error.statusCode || HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ...existing code...
  static async getUserByToken(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);

    const paymentData = await buildPaymentPayload(userId);

    return {
      message: "User updated successfully.",
      user,
      paymentData,
      success: true,
    };
  }

  /**
   * Admin method to delete all user data by email
   * Requires admin code verification
   * @param {Object} data - { email, code }
   * @returns {Promise<Object>} - Deletion result
   */
  static async adminDeleteUserByEmail(data) {
    const { email, code } = data;

    // Verify admin code
    if (code !== "@Admin123") {
      throw new AppError(
        "Invalid admin code. Access denied.",
        HttpStatusCodes.FORBIDDEN
      );
    }

    if (!email) {
      throw new AppError(
        "Email is required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Even if user doesn't exist, check for orphaned payment records
      const orphanedPayments = await prisma.revenueCatPayment.findMany({
        where: { appUserId: email.toLowerCase().trim() },
      });

      if (orphanedPayments.length > 0) {
        // Delete orphaned payment records
        await prisma.revenueCatPayment.deleteMany({
          where: { appUserId: email.toLowerCase().trim() },
        });

        return {
          message: `User not found, but deleted ${orphanedPayments.length} orphaned payment record(s) for email: ${email}`,
          success: true,
          deletedPayments: orphanedPayments.length,
        };
      }

      return {
        message: `No user or payment records found for email: ${email}`,
        success: true,
        deletedUser: false,
        deletedPayments: 0,
      };
    }

    const userId = user.id;
    const userEmail = user.email;

    // Delete all RevenueCatPayment records by appUserId (email) first
    // This handles cases where payments might be orphaned or not properly linked
    const deletedPaymentsByEmail = await prisma.revenueCatPayment.deleteMany({
      where: { appUserId: userEmail },
    });

    // Delete user - this will cascade delete all related data:
    // - chats (cascade)
    // - messages (cascade)
    // - messageReactions (cascade)
    // - readReceipts (cascade)
    // - mediaLibrary (cascade)
    // - favoriteMessages (cascade)
    // - revenueCatPayments (cascade)
    // - notificationsReceived (cascade)
    // - notificationsSent (setNull)
    await prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: `Successfully deleted all data for user: ${email}`,
      success: true,
      deletedUser: true,
      deletedPayments: deletedPaymentsByEmail.count,
      userId: userId,
    };
  }

  /**
   * Permanently delete all user data from the database
   * This method deletes the user and all related data permanently
   * Also deletes media files from the file system
   * @param {String} userId - User ID to delete
   * @returns {Promise<Object>} - Deletion result
   */
  static async permanentlyDeleteUser(userId) {
    const fs = require("fs").promises;

    // Find user with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        mediaLibrary: true,
        chats: true,
        sentMessages: true,
        revenueCatPayments: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", HttpStatusCodes.NOT_FOUND);
    }

    try {
      // Get all media files for this user before deletion
      const mediaFiles = await prisma.mediaLibrary.findMany({
        where: { userId },
        select: { filePath: true, id: true },
      });

      // Delete all media files from file system
      let deletedFilesCount = 0;
      let failedFilesCount = 0;

      for (const media of mediaFiles) {
        try {
          // Check if file exists before trying to delete
          try {
            await fs.access(media.filePath);
            await fs.unlink(media.filePath);
            deletedFilesCount++;
          } catch (fileError) {
            // File doesn't exist or can't be accessed - skip it
            console.warn(`File not found or inaccessible: ${media.filePath}`);
            failedFilesCount++;
          }
        } catch (error) {
          console.error(`Error deleting file ${media.filePath}:`, error);
          failedFilesCount++;
          // Continue with other files even if one fails
        }
      }

      // Delete all RevenueCatPayment records by appUserId (email) first
      // This handles cases where payments might be orphaned or not properly linked
      const deletedPaymentsByEmail = await prisma.revenueCatPayment.deleteMany({
        where: { appUserId: user.email },
      });

      // Permanently delete user - this will cascade delete all related data:
      // - chats (cascade)
      // - messages (cascade)
      // - messageReactions (cascade)
      // - readReceipts (cascade)
      // - mediaLibrary (cascade)
      // - favoriteMessages (cascade)
      // - revenueCatPayments (cascade)
      // - notificationsReceived (cascade)
      // - notificationsSent (setNull)
      await prisma.user.delete({
        where: { id: userId },
      });

      Logger.info("User permanently deleted", {
        userId,
        email: user.email,
        deletedFiles: deletedFilesCount,
        failedFiles: failedFilesCount,
        deletedPayments: deletedPaymentsByEmail.count,
      });

      return {
        message: "All user data has been permanently deleted from the database.",
        success: true,
        deletedUser: true,
        deletedFiles: deletedFilesCount,
        failedFiles: failedFilesCount,
        deletedPayments: deletedPaymentsByEmail.count,
        userId: userId,
      };
    } catch (error) {
      console.error("Error permanently deleting user:", error);
      Logger.error("Failed to permanently delete user", {
        userId,
        error: error?.message,
      });
      throw new AppError(
        "Failed to permanently delete user data. Please try again.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}

module.exports = UserService;
