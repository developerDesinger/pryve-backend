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
        message: "User with this email already exists and is active.",
        success: false,
      };
    }

    let otp = "123456"; // Replace with real OTP in production

    if (user) {
      // User exists but is inactive - resend OTP
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName,
          profilePhoto,
          otp,
          otpCreatedAt: new Date(),
        }
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
        }
      });
    }

    return {
      message: "OTP sent to your email. Please verify to continue.",
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        profilePhoto: user.profilePhoto,
        status: user.status
      }
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
      data: updateFields
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
      data: { status: "ACTIVE" }
    });

    const token = createJwtToken({ id: user.id, role: user.role });

    return { message: "OTP verified successfully.", success: true, user: updatedUser, token };
  }

  static async resendOtp(data) {
    const { email } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.BAD_REQUEST);
    }

    // const otp = crypto.randomInt(100000, 999999).toString();
    const otp = "123456";

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpCreatedAt: new Date()
      }
    });
    // await sendEmail({ email, otp });
    // sendOtpEmail(user.email, otp);

    return {
      message: "OTP has been resent successfully. Please check your email.",
      success: true,
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
        updatedAt: true
      }
    });
    if (!user) {
      return {
        message: "Invalid email or password.",
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
        }
      });
    } else {
      // Update login type if different
      if (user.loginType !== provider) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { loginType: provider }
        });
      }

      // Check if the account is active
      if (user.status !== "ACTIVE") {
        throw new AppError(
          "Account is inactive. Please contact support.",
          HttpStatusCodes.UNAUTHORIZED
        );
      }
    }

    const token = createJwtToken({ id: user.id, role: user.role });
    return {
      message: "Social login successful.",
      success: true,
      user,
      token
    };
  }

  static async getAllUsers(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await prisma.user.count({ where: { status: "ACTIVE" } });
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    if (!users || users.length === 0) {
      return {
        message: "No users found.",
        success: false,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          limit
        }
      };
    }

    return {
      message: "Users fetched successfully.",
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalUsers,
        limit
      }
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
    const users = await prisma.user.findMany({ where: { userName: userName.userName } });
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
      data: updateData
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
        status: "ACTIVE"
      }
    });

    if (!user) {
      throw new AppError("Active user not found", HttpStatusCodes.NOT_FOUND);
    }

    // Soft delete by updating status to inactive
    await prisma.user.update({
      where: { id: userId },
      data: { status: "INACTIVE" }
    });

    return {
      message: "user deactivated successfully",
      success: true,
    };
  }

  static async forgotPassword(data) {
    const { email } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    }

    // const otp = crypto.randomInt(100000, 999999).toString();
    const otp = "123456";
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpCreatedAt: new Date()
      }
    });
    // await sendForgotPasswordEmail({ email, otp });
    // sendOtpEmail(user.email, otp);

    return {
      message:
        "OTP has been sent to your email. Please verify to reset your password.",
      success: true,
      data: user,
    };
  }

  static async updatePassword(data) {
    const { email, userId, otp, newPassword } = data;

    if (!newPassword) {
      throw new AppError("New password is required.", 400);
    }

    const user = await prisma.user.findFirst({ 
      where: { 
        id: userId, 
        email 
      } 
    });
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        otp: null
      }
    });

    return { message: "Password updated successfully.", success: true, user: updatedUser };
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
        updatedAt: true
      }
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
      data: { password: await bcrypt.hash(newPassword, 10) }
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
        fullName
      } = data;

      const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
      if (!userToUpdate) {
        throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
      }

      let updates = {};

      // Check email uniqueness if email is being updated
      if (email && email !== userToUpdate.email) {
        const emailExists = await prisma.user.findFirst({
          where: {
            email,
            id: { not: userId }
          }
        });
        if (emailExists) {
          throw new AppError("Email already exists. Please use another email.", HttpStatusCodes.BAD_REQUEST);
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
            id: { not: userId }
          }
        });
        if (existingUser) {
          throw new AppError("Username already taken.", HttpStatusCodes.BAD_REQUEST);
        }
        updates.userName = userName;
      }

      // Basic profile fields
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (fullName !== undefined) updates.fullName = fullName;

      if (Object.keys(updates).length > 0) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updates
        });

        return {
          message: "Profile updated successfully.",
          success: true,
          user: updatedUser
        };
      }

      return {
        message: "No changes to update.",
        success: true,
        user: userToUpdate
      };
    } catch (error) {
      throw new AppError(
        error.message || "Failed to update profile.",
        error.statusCode || HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }



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
