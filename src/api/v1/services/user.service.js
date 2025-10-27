const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const { createJwtToken } = require("../middlewares/auth.middleware");
const { s3SharpImageUpload } = require("../services/aws.service");
const { sendEmail, sendForgotPasswordEmail } = require("../utils/email");

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
    return {
      message: "Login successful.",
      success: true,
      user,
      token,
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

    if (!email || !provider || !providerId) {
      throw new AppError(
        "Email, provider, and providerId are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    let user = await prisma.user.findUnique({ where: { email } });

    // If user doesn't exist, create a new one
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          userName,
          loginType: provider,
          role: "CLIENT", // Default role for new users
          status: "ACTIVE", // Default status for social login
          profilePhoto,
          firstName,
          lastName,
        },
      });
    } else {
      // Update login type if different
      if (user.loginType !== provider) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { loginType: provider },
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
    return {
      message: "Social login successful.",
      success: true,
      user,
      token,
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

    return {
      message: "Users fetched successfully.",
      success: true,
      data: users,
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
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    return {
      message: "User updated successfully.",
      user,
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

    return {
      message: "User updated successfully.",
      user,
      success: true,
    };
  }
}

module.exports = UserService;
