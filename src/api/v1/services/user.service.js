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
const AuthLogService = require("./authLog.service");

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
  static async createUser(data, requestMetadata = {}) {
    try {
      const { email, fullName, profilePhoto } = data;

      // Check if user already exists
      let user = await prisma.user.findUnique({ where: { email } });

      // If user exists and is active, return error
      if (user && user.status === "ACTIVE") {
        // Log failed registration attempt (user already exists)
        await AuthLogService.logAuthEvent({
          eventType: "REGISTER",
          status: "FAILED",
          loginType: "EMAIL",
          email,
          errorMessage: "User with this email already exists and is active.",
          errorCode: "USER_ALREADY_EXISTS",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
          metadata: {
            requestBody: {
              email: data.email || null,
              fullName: data.fullName || null,
              profilePhoto: data.profilePhoto || null,
            },
          },
        });
        
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

      // Log successful registration
      await AuthLogService.logAuthEvent({
        eventType: "REGISTER",
        status: "SUCCESS",
        loginType: "EMAIL",
        userId: user.id,
        email: user.email,
        userName: user.userName,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          requestBody: {
            email: data.email || null,
            fullName: data.fullName || null,
            profilePhoto: data.profilePhoto || null,
          },
          userResult: {
            id: user.id,
            status: user.status,
          },
        },
      });

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
    } catch (error) {
      // Log server errors (database failures, unexpected exceptions, etc.)
      const { email } = data || {};
      await AuthLogService.logAuthEvent({
        eventType: "REGISTER",
        status: "FAILED",
        loginType: "EMAIL",
        email: email || null,
        errorMessage: error.message || "Internal server error during registration",
        errorCode: error.statusCode || error.code || "SERVER_ERROR",
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          requestBody: {
            email: data?.email || null,
            fullName: data?.fullName || null,
            profilePhoto: data?.profilePhoto || null,
          },
          error: {
            name: error.name,
            message: error.message,
            code: error.statusCode || error.code,
            stack: error.stack,
          },
        },
      });
      
      // Re-throw the error so it's handled by the error handler
      throw error;
    }
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

  static async verifyOtp(data, requestMetadata = {}) {
    try {
      const { email, otp } = data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Log failed OTP verification
        await AuthLogService.logAuthEvent({
          eventType: "VERIFY_OTP",
          status: "FAILED",
          loginType: "EMAIL",
          email,
          errorMessage: "User not found.",
          errorCode: "USER_NOT_FOUND",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
        
        throw new AppError("User not found.", HttpStatusCodes.BAD_REQUEST);
      }

      if (user.otp !== otp.toString()) {
        // Log failed OTP verification
        await AuthLogService.logAuthEvent({
          eventType: "VERIFY_OTP",
          status: "FAILED",
          loginType: "EMAIL",
          userId: user.id,
          email: user.email,
          errorMessage: "Invalid OTP.",
          errorCode: "INVALID_OTP",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
        
        throw new AppError("Invalid OTP.", HttpStatusCodes.BAD_REQUEST);
      }

      const otpExpiryTime = 10 * 60 * 1000;
      if (Date.now() - user.otpCreatedAt.getTime() > otpExpiryTime) {
        // Log failed OTP verification
        await AuthLogService.logAuthEvent({
          eventType: "VERIFY_OTP",
          status: "FAILED",
          loginType: "EMAIL",
          userId: user.id,
          email: user.email,
          errorMessage: "OTP has expired.",
          errorCode: "OTP_EXPIRED",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
        
        throw new AppError("OTP has expired.", HttpStatusCodes.BAD_REQUEST);
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE" },
      });

      await NotificationService.notifyNewUserRegistration(updatedUser);

      const token = createJwtToken({ id: user.id, role: user.role });

      // Log successful OTP verification
      await AuthLogService.logAuthEvent({
        eventType: "VERIFY_OTP",
        status: "SUCCESS",
        loginType: "EMAIL",
        userId: updatedUser.id,
        email: updatedUser.email,
        userName: updatedUser.userName,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          requestBody: {
            email: data.email || null,
            // Don't log OTP for security
          },
          userResult: {
            id: updatedUser.id,
            status: updatedUser.status,
          },
        },
      });

      return {
        message: "OTP verified successfully.",
        success: true,
        user: updatedUser,
        token,
      };
    } catch (error) {
      // Log server errors (database failures, unexpected exceptions, etc.)
      const { email } = data || {};
      await AuthLogService.logAuthEvent({
        eventType: "VERIFY_OTP",
        status: "FAILED",
        loginType: "EMAIL",
        email: email || null,
        errorMessage: error.message || "Internal server error during OTP verification",
        errorCode: error.statusCode || error.code || "SERVER_ERROR",
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          requestBody: {
            email: data?.email || null,
            // Don't log OTP for security
          },
          error: {
            name: error.name,
            message: error.message,
            code: error.statusCode || error.code,
            stack: error.stack,
          },
        },
      });
      
      // Re-throw the error so it's handled by the error handler
      throw error;
    }
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

  static async loginUser(data, requestMetadata = {}) {
    try {
      const { email, password, role } = data;
      if (!email || !password) {
        // Log failed login attempt
        await AuthLogService.logAuthEvent({
        eventType: "LOGIN",
        status: "FAILED",
        loginType: "EMAIL",
        email,
        errorMessage: "Email, password, and role are required.",
          errorCode: "MISSING_CREDENTIALS",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
          metadata: {
            requestBody: {
              email: data.email || null,
              role: data.role || null,
              // Don't log password for security
            },
          },
        });
        
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
        loginType: true,
      },
    });
      if (!user) {
        // Log failed login attempt
        await AuthLogService.logAuthEvent({
          eventType: "LOGIN",
          status: "FAILED",
          loginType: "EMAIL",
          email,
          errorMessage: "Invalid email or password.",
          errorCode: "USER_NOT_FOUND",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
          metadata: {
            requestBody: {
              email: data.email || null,
              role: data.role || null,
              // Don't log password for security
            },
          },
        });
        
        return {
          message: "Invalid email or password.",
          success: false,
        };
      }

      // Check if account is deleted
      if (user.isDeleted) {
        // Log failed login attempt
        await AuthLogService.logAuthEvent({
          eventType: "LOGIN",
          status: "FAILED",
          loginType: user.loginType || "EMAIL",
          userId: user.id,
          email: user.email,
          errorMessage: "This account has been deleted.",
          errorCode: "ACCOUNT_DELETED",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
        
        return {
          message: "This account has been deleted.",
          success: false,
        };
      }

      // Check if user registered via social login (no password set)
      if (user.loginType && user.loginType !== "EMAIL" && (!user.password || user.password === null)) {
        const providerName = user.loginType === "GOOGLE" ? "Google" : 
                            user.loginType === "APPLE" ? "Apple" : 
                            user.loginType === "FACEBOOK" ? "Facebook" : user.loginType;
        
        // Log failed login attempt
        await AuthLogService.logAuthEvent({
          eventType: "LOGIN",
          status: "FAILED",
          loginType: user.loginType,
          userId: user.id,
          email: user.email,
          errorMessage: `This account is registered via ${providerName} social login. Please use social login instead.`,
          errorCode: "SOCIAL_LOGIN_REQUIRED",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
        
        return {
          message: `This account is registered via ${providerName} social login. Please use social login instead.`,
          success: false,
        };
      }

      // Check if password is missing (shouldn't happen for EMAIL login type, but safety check)
      if (!user.password) {
        // Log failed login attempt
        await AuthLogService.logAuthEvent({
          eventType: "LOGIN",
          status: "FAILED",
          loginType: user.loginType || "EMAIL",
          userId: user.id,
          email: user.email,
          errorMessage: "Password not set for this account. Please use social login or reset your password.",
          errorCode: "PASSWORD_NOT_SET",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
        
        return {
          message: "Password not set for this account. Please use social login or reset your password.",
          success: false,
        };
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Log failed login attempt
        await AuthLogService.logAuthEvent({
          eventType: "LOGIN",
          status: "FAILED",
          loginType: user.loginType || "EMAIL",
          userId: user.id,
          email: user.email,
          errorMessage: "Invalid email or password.",
          errorCode: "INVALID_PASSWORD",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
        
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
        // Log failed login attempt
        await AuthLogService.logAuthEvent({
          eventType: "LOGIN",
          status: "FAILED",
          loginType: user.loginType || "EMAIL",
          userId: user.id,
          email: user.email,
          errorMessage: "Account is inactive. Please verify your email.",
          errorCode: "ACCOUNT_INACTIVE",
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
        
        return {
          message: "Account is inactive. Please verify your email.",
          success: false,
          status: user.status,
        };
      }

      const token = createJwtToken({ id: user.id, role: user.role });
      const paymentData = await buildPaymentPayload(user.id);
      
      // Log successful login
      await AuthLogService.logAuthEvent({
        eventType: "LOGIN",
        status: "SUCCESS",
        loginType: user.loginType || "EMAIL",
        userId: user.id,
        email: user.email,
        userName: user.userName,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          requestBody: {
            email: data.email || null,
            role: data.role || null,
            // Don't log password for security
          },
          userResult: {
            id: user.id,
            loginType: user.loginType,
            status: user.status,
          },
        },
      });
      
      return {
        message: "Login successful.",
        success: true,
        user,
        token,
        paymentData,
      };
    } catch (error) {
      // Log server errors (database failures, unexpected exceptions, etc.)
      const { email } = data || {};
      await AuthLogService.logAuthEvent({
        eventType: "LOGIN",
        status: "FAILED",
        loginType: "EMAIL",
        email: email || null,
        errorMessage: error.message || "Internal server error during login",
        errorCode: error.statusCode || error.code || "SERVER_ERROR",
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          requestBody: {
            email: data?.email || null,
            role: data?.role || null,
            // Don't log password for security
          },
          error: {
            name: error.name,
            message: error.message,
            code: error.statusCode || error.code,
            stack: error.stack,
          },
        },
      });
      
      // Re-throw the error so it's handled by the error handler
      throw error;
    }
  }

  static async socialLogin(data, requestMetadata = {}) {
    try {
      console.log("🔐 [SOCIAL LOGIN] Started with data:", JSON.stringify(data, null, 2));
      console.log("📦 [SOCIAL LOGIN] Request body received:", {
        email: data?.email || '(empty)',
        provider: data?.provider,
        providerId: data?.providerId,
        userName: data?.userName || '(empty)',
        firstName: data?.firstName || '(empty)',
        lastName: data?.lastName || '(empty)',
        profilePhoto: data?.profilePhoto || '(empty)',
      });

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
        console.error("❌ [SOCIAL LOGIN] Validation failed - missing provider or providerId", {
          hasProvider: !!provider,
          hasProviderId: !!providerId,
        });
      throw new AppError(
        "provider, and providerId are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

      // Lookup logic: If email is provided, check by email first, otherwise check by providerId
      let user = null;
      
      if (email) {
        console.log("🔍 [SOCIAL LOGIN] Looking up user by email first:", email);
        user = await prisma.user.findUnique({ where: { email } });
        console.log("📊 [SOCIAL LOGIN] User retrieved by email:", user ? {
          id: user.id,
          email: user.email,
          status: user.status,
          loginType: user.loginType,
          providerId: user.providerId,
          isDeleted: user.isDeleted
        } : "User not found by email");
        
        // If user found by email with EMAIL loginType, allow adding social provider credentials
        // This enables users who registered with email/password to also login with social providers
        // The loginType will remain EMAIL, but providerId will be stored for social login
        if (user && user.loginType === 'EMAIL' && provider !== 'EMAIL') {
          console.log("✅ [SOCIAL LOGIN] EMAIL user adding social provider credentials:", {
            email: user.email,
            existingLoginType: user.loginType,
            newProvider: provider,
            providerId: providerId,
          });
          // Continue with existing user - providerId will be added in update logic below
        }
        // If user has social loginType and trying different social provider, allow switching
        // This will be handled in the update logic below
      }
      
      // If user not found by email (or email not provided), check by providerId
      if (!user && providerId) {
        console.log("🔍 [SOCIAL LOGIN] Looking up user by providerId:", providerId);
        user = await prisma.user.findUnique({ where: { providerId } });
        console.log("📊 [SOCIAL LOGIN] User retrieved by providerId:", user ? {
          id: user.id,
          email: user.email,
          status: user.status,
          loginType: user.loginType,
          providerId: user.providerId,
          isDeleted: user.isDeleted
        } : "User not found by providerId");
      }

    // If user doesn't exist, create a new one
    if (!user) {
        // Double-check by providerId before creating (race condition protection)
        if (providerId) {
          const existingByProviderId = await prisma.user.findUnique({ where: { providerId } });
          if (existingByProviderId) {
            console.log("✅ [SOCIAL LOGIN] User found by providerId (race condition check):", existingByProviderId.id);
            user = existingByProviderId;
          }
        }
        
        if (!user) {
          console.log("➕ [SOCIAL LOGIN] Creating new user:", { email: email || '(empty)', provider, providerId, userName });
          
          try {
            // Prepare user data
            const userData = {
              loginType: provider,
              providerId,
              role: "CLIENT", // Default role for new users
              status: "ACTIVE", // Default status for social login
              queryCount: 20, // Initialize with 20 free queries
            };
            
            // Handle email - if empty, generate a unique email from providerId
            if (email && email.trim() !== '') {
              userData.email = email;
            } else {
              // Generate unique email from providerId to avoid empty email constraint issues
              userData.email = `${providerId}@social.local`;
              console.log("📧 [SOCIAL LOGIN] Email is empty, using generated email:", userData.email);
            }
            
            // Handle userName - if empty, set to null (schema allows null) or generate unique
            if (userName && userName.trim() !== '') {
              userData.userName = userName;
            } else {
              // Set to null instead of empty string to avoid unique constraint issues
              userData.userName = null;
              console.log("👤 [SOCIAL LOGIN] UserName is empty, setting to null");
            }
            
            // Handle optional fields - only include if not empty
            if (profilePhoto && profilePhoto.trim() !== '') {
              userData.profilePhoto = profilePhoto;
            }
            if (firstName && firstName.trim() !== '') {
              userData.firstName = firstName;
            }
            if (lastName && lastName.trim() !== '') {
              userData.lastName = lastName;
            }
            
            console.log("📝 [SOCIAL LOGIN] User data to create:", { ...userData, email: userData.email, userName: userData.userName || '(null)' });
            
            user = await prisma.user.create({
              data: userData,
            });
            
            console.log("✅ [SOCIAL LOGIN] New user created:", {
              userId: user.id,
              email: user.email || '(empty)',
              provider: user.loginType,
              status: user.status,
            });
          } catch (createError) {
            console.error("❌ [SOCIAL LOGIN] Create error details:", {
              code: createError.code,
              meta: createError.meta,
              message: createError.message,
            });
            console.error("📦 [SOCIAL LOGIN] Request body when error occurred:", {
              email: email || '(empty)',
              provider: provider,
              providerId: providerId,
              userName: userName || '(empty)',
              firstName: firstName || '(empty)',
              lastName: lastName || '(empty)',
            });
            
            // Handle unique constraint errors gracefully
            if (createError.code === 'P2002') {
              console.error("❌ [SOCIAL LOGIN] Unique constraint error:", createError.meta);
              
              // If email constraint failed
              if (createError.meta?.target?.includes('email')) {
                console.log("🔍 [SOCIAL LOGIN] Email constraint failed, searching for user...");
                
                // First try to find by email if email is provided
                if (email && email.trim() !== '') {
                  const existingUser = await prisma.user.findUnique({ where: { email } });
                  if (existingUser) {
                    console.log("✅ [SOCIAL LOGIN] User found by email:", existingUser.id);
                    const loginTypeMap = {
                      EMAIL: "email/password",
                      GOOGLE: "Google",
                      APPLE: "Apple",
                      FACEBOOK: "Facebook",
                    };
                    
                    const existingLoginMethod = loginTypeMap[existingUser.loginType] || existingUser.loginType;
                    const attemptedLoginMethod = loginTypeMap[provider] || provider;
                    
                    // Only show error if providers are different
                    if (existingUser.loginType !== provider) {
                      throw new AppError(
                        `This email is already registered with ${existingLoginMethod}. Please login using ${existingLoginMethod} instead of ${attemptedLoginMethod}.`,
                        HttpStatusCodes.CONFLICT
                      );
                    } else {
                      // Same provider, use existing user
                      console.log("✅ [SOCIAL LOGIN] User found with same provider, using existing user:", existingUser.id);
                      user = existingUser;
                    }
                  }
                }
                
                // If email is empty or user not found by email, try providerId as fallback
                if (!user && providerId) {
                  console.log("🔍 [SOCIAL LOGIN] Trying to find user by providerId:", providerId);
                  const existingUser = await prisma.user.findUnique({ where: { providerId } });
                  if (existingUser) {
                    console.log("✅ [SOCIAL LOGIN] User found by providerId after email constraint error:", existingUser.id);
                    user = existingUser;
                  } else {
                    console.log("❌ [SOCIAL LOGIN] User not found by providerId either");
                  }
                }
              }
              
              // If userName constraint failed, find existing user instead of throwing error
              if (createError.meta?.target?.includes('userName')) {
                console.log("🔍 [SOCIAL LOGIN] UserName constraint failed, searching for user...");
                console.log("📦 [SOCIAL LOGIN] Request body in userName error handler:", {
                  email: email || '(empty)',
                  provider: provider,
                  providerId: providerId,
                  userName: userName || '(empty)',
                  firstName: firstName || '(empty)',
                  lastName: lastName || '(empty)',
                });
                
                // Try to find by userName first (only if userName is not empty)
                if (userName && userName.trim() !== '') {
                  console.log("🔍 [SOCIAL LOGIN] Searching by userName:", userName);
                  const existingUser = await prisma.user.findUnique({ where: { userName } });
                  if (existingUser) {
                    console.log("✅ [SOCIAL LOGIN] User found by userName:", existingUser.id);
                    user = existingUser;
                  } else {
                    console.log("❌ [SOCIAL LOGIN] User not found by userName");
                  }
                } else {
                  console.log("⚠️ [SOCIAL LOGIN] UserName is empty, skipping userName search");
                }
                
                // If not found by userName, try providerId as fallback
                if (!user && providerId) {
                  console.log("🔍 [SOCIAL LOGIN] Trying to find user by providerId:", providerId);
                  const existingUser = await prisma.user.findUnique({ where: { providerId } });
                  if (existingUser) {
                    console.log("✅ [SOCIAL LOGIN] User found by providerId after userName constraint error:", existingUser.id);
                    user = existingUser;
                  } else {
                    console.log("❌ [SOCIAL LOGIN] User not found by providerId either");
                  }
                }
              }
              
              // If providerId constraint failed, find existing user instead of throwing error
              if (createError.meta?.target?.includes('providerId')) {
                console.log("🔍 [SOCIAL LOGIN] ProviderId constraint failed, searching for user...");
                const existingUser = await prisma.user.findUnique({ where: { providerId } });
                if (existingUser) {
                  console.log("✅ [SOCIAL LOGIN] User found by providerId after constraint error:", existingUser.id);
                  user = existingUser;
                } else {
                  throw new AppError(
                    "An account with this provider ID already exists. Please try logging in again.",
                    HttpStatusCodes.CONFLICT
                  );
                }
              }
            }
            
            // Re-throw if it's not a constraint error or we couldn't handle it
            if (!user) {
              console.error("❌ [SOCIAL LOGIN] Could not resolve error, re-throwing:", createError.message);
              throw createError;
            } else {
              console.log("✅ [SOCIAL LOGIN] Error resolved, user found:", user.id);
            }
          }
        }
    } else {
        console.log("👤 [SOCIAL LOGIN] Existing user found:", {
          userId: user.id,
          currentLoginType: user.loginType,
          newProvider: provider,
          currentProviderId: user.providerId,
          newProviderId: providerId,
        });
        
        // Check if account is deleted
        if (user.isDeleted) {
          console.warn("⚠️ [SOCIAL LOGIN] Deleted account attempt:", {
            userId: user.id,
            email: user.email,
            isDeleted: user.isDeleted,
          });
          throw new AppError(
            "This account has been deleted.",
            HttpStatusCodes.UNAUTHORIZED
          );
        }
        
        // Update login type and providerId if different or missing
        // This allows users to switch providers (e.g., from Google to Apple)
        const updateData = {};
        let userSwitched = false;
        
        if (!user.providerId || user.providerId !== providerId) {
          // Check if the providerId already exists for a different user
          const existingUserWithProviderId = await prisma.user.findUnique({ 
            where: { providerId } 
          });
          
          if (existingUserWithProviderId && existingUserWithProviderId.id !== user.id) {
            // ProviderId already belongs to another user - use that user instead
            console.log("🔄 [SOCIAL LOGIN] ProviderId belongs to different user, switching to that user:", {
              currentUserId: user.id,
              correctUserId: existingUserWithProviderId.id,
              providerId: providerId
            });
            user = existingUserWithProviderId;
            userSwitched = true;
            // Don't update providerId since it's already correct for this user
          } else {
            // Safe to update providerId
            updateData.providerId = providerId;
            console.log("🔄 [SOCIAL LOGIN] ProviderId update needed:", {
              old: user.providerId,
              new: providerId,
            });
          }
        }
        
        // Update login type if different (only if we didn't switch users)
        // Exception: Keep EMAIL loginType when EMAIL user adds social provider credentials
        if (!userSwitched && user.loginType !== provider) {
          // If user has EMAIL loginType, keep it (don't change to social provider)
          // This allows EMAIL users to also login with social providers
          if (user.loginType === 'EMAIL') {
            console.log("ℹ️ [SOCIAL LOGIN] Keeping EMAIL loginType, adding social provider credentials:", {
              loginType: user.loginType,
              provider: provider,
              providerId: providerId,
            });
            // Don't update loginType - keep it as EMAIL
          } else {
            // User switching between social providers - update loginType
            updateData.loginType = provider;
            console.log("🔄 [SOCIAL LOGIN] Login type update needed (user switching providers):", {
              old: user.loginType,
              new: provider,
            });
          }
        }
        
        // Also update profile info if provided
        if (profilePhoto && user.profilePhoto !== profilePhoto) {
          updateData.profilePhoto = profilePhoto;
        }
        if (firstName && user.firstName !== firstName) {
          updateData.firstName = firstName;
        }
        if (lastName && user.lastName !== lastName) {
          updateData.lastName = lastName;
        }
        if (userName && user.userName !== userName) {
          updateData.userName = userName;
        }
      
      if (Object.keys(updateData).length > 0) {
          console.log("🔄 [SOCIAL LOGIN] Updating user data:", updateData);
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
          console.log("✅ [SOCIAL LOGIN] User updated:", {
            userId: user.id,
            updatedFields: Object.keys(updateData),
          });
        } else {
          console.log("ℹ️ [SOCIAL LOGIN] No user updates needed");
      }

        // Check if the account is active
        if (user.status !== "ACTIVE") {
          console.warn("⚠️ [SOCIAL LOGIN] Inactive account attempt:", {
            userId: user.id,
            email: user.email,
            status: user.status,
          });
          throw new AppError(
            "Account is inactive. Please contact support.",
            HttpStatusCodes.UNAUTHORIZED
          );
        }
        
        console.log("✅ [SOCIAL LOGIN] Account status checks passed:", {
          userId: user.id,
          status: user.status,
          isDeleted: user.isDeleted,
        });
      }

      console.log("🔑 [SOCIAL LOGIN] Generating JWT token for user:", user.id);
    const token = createJwtToken({ id: user.id, role: user.role });
      console.log("✅ [SOCIAL LOGIN] JWT token generated");
      
      console.log("💳 [SOCIAL LOGIN] Building payment payload for user:", user.id);
    const paymentData = await buildPaymentPayload(user.id);
      console.log("✅ [SOCIAL LOGIN] Payment payload built:", {
        hasActiveSubscription: paymentData?.hasActiveSubscription,
        hasError: !!paymentData?.error,
      });
      
      console.log("🎉 [SOCIAL LOGIN] Completed successfully:", {
        userId: user.id,
        email: user.email,
        provider: user.loginType,
        status: user.status,
      });
      
      // Log successful social login
      await AuthLogService.logAuthEvent({
        eventType: "SOCIAL_LOGIN",
        status: "SUCCESS",
        loginType: user.loginType,
        userId: user.id,
        email: user.email,
        userName: user.userName,
        provider: user.loginType,
        providerId: user.providerId,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          requestBody: {
            provider: data.provider,
            providerId: data.providerId,
            email: data.email || null,
            userName: data.userName || null,
            firstName: data.firstName || null,
            lastName: data.lastName || null,
            profilePhoto: data.profilePhoto || null,
          },
          userResult: {
            id: user.id,
            loginType: user.loginType,
            status: user.status,
            providerId: user.providerId,
          },
        },
      });
      
    return {
      message: "Social login successful.",
      success: true,
      user,
      token,
      paymentData,
    };
    } catch (error) {
      // Log failed social login (including server errors)
      await AuthLogService.logAuthEvent({
        eventType: "SOCIAL_LOGIN",
        status: "FAILED",
        loginType: data?.provider || null,
        email: data?.email,
        provider: data?.provider,
        providerId: data?.providerId,
        errorMessage: error?.message || error.message || "Internal server error during social login",
        errorCode: error?.statusCode || error.code || "SERVER_ERROR",
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          requestBody: {
            provider: data?.provider || null,
            providerId: data?.providerId || null,
            email: data?.email || null,
            userName: data?.userName || null,
            firstName: data?.firstName || null,
            lastName: data?.lastName || null,
            profilePhoto: data?.profilePhoto || null,
          },
          error: {
            name: error.name,
            message: error?.message || error.message,
            code: error?.statusCode || error.code,
            stack: error.stack,
          },
        },
      });
      
      console.error("❌ [SOCIAL LOGIN] Error:", {
        provider: data?.provider,
        email: data?.email || '(empty)',
        providerId: data?.providerId,
        userName: data?.userName || '(empty)',
        firstName: data?.firstName || '(empty)',
        lastName: data?.lastName || '(empty)',
        errorMessage: error?.message || error.message,
        errorName: error?.name || error.constructor?.name,
        errorCode: error?.statusCode || error.statusCode,
        stack: error?.stack,
      });
      console.error("📦 [SOCIAL LOGIN] Full request body in error handler:", JSON.stringify(data, null, 2));
      throw error;
    }
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

    // Update user with new OTP and get the updated user object
    const updatedUser = await prisma.user.update({
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
      data: updatedUser,
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
   * Permanently delete all user data from the database by email
   * This method deletes the user and all related data permanently
   * Also deletes media files from the file system
   * @param {String} email - User email to delete
   * @returns {Promise<Object>} - Deletion result
   */
  static async permanentlyDeleteUserByEmail(email) {
    if (!email) {
      throw new AppError("Email is required.", HttpStatusCodes.BAD_REQUEST);
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        mediaLibrary: true,
        chats: true,
        sentMessages: true,
        revenueCatPayments: true,
      },
    });

    if (!user) {
      // Check for orphaned payment records
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

      throw new AppError("User not found", HttpStatusCodes.NOT_FOUND);
    }

    const userId = user.id;
    const fs = require("fs").promises;

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

      Logger.info("User permanently deleted by email", {
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
        email: user.email,
      };
    } catch (error) {
      console.error("Error permanently deleting user:", error);
      Logger.error("Failed to permanently delete user", {
        email,
        error: error?.message,
      });
      throw new AppError(
        "Failed to permanently delete user data. Please try again.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
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

  /**
   * Permanently delete all user data from the database by providerId
   * This method deletes the user and all related data permanently
   * Also deletes media files from the file system
   * @param {String} providerId - User providerId to delete
   * @returns {Promise<Object>} - Deletion result
   */
  static async permanentlyDeleteUserByProviderId(providerId) {
    if (!providerId) {
      throw new AppError("ProviderId is required.", HttpStatusCodes.BAD_REQUEST);
    }

    // Find user by providerId
    const user = await prisma.user.findUnique({
      where: { providerId: providerId },
      include: {
        mediaLibrary: true,
        chats: true,
        sentMessages: true,
        revenueCatPayments: true,
      },
    });

    if (!user) {
      throw new AppError("User not found with the provided providerId", HttpStatusCodes.NOT_FOUND);
    }

    const userId = user.id;
    const userEmail = user.email;
    const fs = require("fs").promises;

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
      const deletedPaymentsByEmail = userEmail
        ? await prisma.revenueCatPayment.deleteMany({
            where: { appUserId: userEmail },
          })
        : { count: 0 };

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

      Logger.info("User permanently deleted by providerId", {
        userId,
        providerId,
        email: userEmail,
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
        providerId: providerId,
        email: userEmail,
      };
    } catch (error) {
      console.error("Error permanently deleting user by providerId:", error);
      Logger.error("Failed to permanently delete user by providerId", {
        providerId,
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
