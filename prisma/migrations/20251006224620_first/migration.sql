-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LoginType" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "AppUsageType" AS ENUM ('FOOD_DISCOUNTS', 'DATING_FRIENDS');

-- CreateEnum
CREATE TYPE "DatingIntentions" AS ENUM ('SERIOUS', 'FRIENDS', 'CASUAL');

-- CreateEnum
CREATE TYPE "Location" AS ENUM ('NORTH', 'NORTH_EAST', 'NORTH_WEST', 'SOUTH', 'SOUTH_EAST', 'SOUTH_WEST', 'WEST', 'CENTRAL');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('ATHEIST', 'BUDDHISM', 'CHRISTIANITY', 'ISLAM', 'TAOISM', 'HINDUISM');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('STUDYING', 'WORKING', 'OTHERS');

-- CreateEnum
CREATE TYPE "LifestyleFrequency" AS ENUM ('FREQUENT', 'OCCASIONALLY', 'NEVER');

-- CreateEnum
CREATE TYPE "GreenFlag" AS ENUM ('LIKES_TO_CALL', 'OPEN_COMMUNICATION', 'TRUSTWORTHY_HONEST', 'ACCOUNTABILITY', 'SUPPORTIVE_BEHAVIOR', 'CONFLICT_RESOLVER', 'FLEXIBILITY', 'SHARING_RESPONSIBILITIES');

-- CreateEnum
CREATE TYPE "RedFlag" AS ENUM ('DRY_TEXTER', 'LACK_COMMUNICATION', 'BAD_ANGER_MANAGEMENT', 'BAD_TIME_MANAGEMENT', 'AVOIDS_CONFLICT', 'CONTROLLING', 'UNFLEXIBLE', 'INCONSISTENT_BEHAVIOR');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProfileStep" AS ENUM ('ONBOARDING', 'PROFILE_CREATION', 'VERIFICATION', 'COMPLETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fullName" TEXT,
    "profilePhoto" TEXT DEFAULT 'default-profile.png',
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "otp" TEXT,
    "otpCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userName" TEXT,
    "loginType" "LoginType" NOT NULL DEFAULT 'EMAIL',
    "socialAccounts" JSONB,
    "firstName" TEXT,
    "lastName" TEXT,
    "appUsageType" "AppUsageType" NOT NULL DEFAULT 'FOOD_DISCOUNTS',
    "nickname" VARCHAR(20),
    "aiAvatar" TEXT,
    "aiAvatarStyle" TEXT DEFAULT 'Art style 1',
    "profileImages" TEXT[],
    "datingIntentions" "DatingIntentions" NOT NULL DEFAULT 'SERIOUS',
    "occupation" VARCHAR(20),
    "hobbies" VARCHAR(20),
    "lifestyleInterests" VARCHAR(20),
    "bio" VARCHAR(200),
    "location" "Location",
    "religion" "Religion",
    "userStatus" "UserStatus",
    "smoking" "LifestyleFrequency",
    "drinking" "LifestyleFrequency",
    "clubbing" "LifestyleFrequency",
    "pets" BOOLEAN NOT NULL DEFAULT false,
    "voicePrompt" TEXT,
    "greenFlags" "GreenFlag"[],
    "redFlags" "RedFlag"[],
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationMethod" "VerificationMethod",
    "verificationDocuments" TEXT[],
    "verificationDate" TIMESTAMP(3),
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "profileCompletionStep" "ProfileStep" NOT NULL DEFAULT 'ONBOARDING',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_userName_key" ON "users"("userName");
