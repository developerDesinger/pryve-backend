const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class ToneProfileService {
  /**
   * Get all tone profiles
   */
  static async getAllToneProfiles() {
    const toneProfiles = await prisma.ToneProfile.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (!toneProfiles) {
      return {
        message: "No tone profiles found.",
        success: false,
        data: null,
      };
    }

    return {
      message: "Tone profiles retrieved successfully.",
      success: true,
      data: toneProfiles,
    };
  }

  /**
   * Get single tone profile by ID
   */
  static async getToneProfileById(id) {
    const toneProfile = await prisma.ToneProfile.findUnique({
      where: { id },
    });

    if (!toneProfile) {
      return {
        message: "Tone profile not found.",
        success: false,
        data: null,
      };
    }

    return {
      message: "Tone profile retrieved successfully.",
      success: true,
      data: toneProfile,
    };
  }

  /**
   * Create new tone profile
   */
  static async createToneProfile(data) {
    const {
      name,
      description,
      icon,
      coreIdentity,
      safetyGuidelines,
      comfortingInstructions,
      maxWords,
      responseStyle,
      bannedWords,
      moodToToneRouting,
    } = data;

    const toneProfile = await prisma.ToneProfile.create({
      data: {
        name,
        description,
        icon,
        coreIdentity,
        safetyGuidelines,
        comfortingInstructions,
        maxWords: maxWords || 150,
        responseStyle: responseStyle || "Conversational",
        bannedWords,
        moodToToneRouting,
      },
    });

    return {
      message: "Tone profile created successfully.",
      success: true,
      data: toneProfile,
    };
  }

  /**
   * Update tone profile
   */
  static async updateToneProfile(id, data) {
    console.log("first<><>><>><>><", data);
    const existingProfile = await prisma.ToneProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      return {
        message: "Tone profile not found.",
        success: false,
        data: null,
      };
    }

    const toneProfile = await prisma.ToneProfile.update({
      where: { id },
      data,
    });

    return {
      message: "Tone profile updated successfully.",
      success: true,
      data: toneProfile,
    };
  }

  /**
   * Delete tone profile
   */
  static async deleteToneProfile(id) {
    const existingProfile = await prisma.ToneProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      return {
        message: "Tone profile not found.",
        success: false,
        data: null,
      };
    }

    await prisma.ToneProfile.delete({
      where: { id },
    });

    return {
      message: "Tone profile deleted successfully.",
      success: true,
      data: null,
    };
  }

  /**
   * Toggle tone profile active status
   */
  static async toggleToneProfileStatus(id) {
    const existingProfile = await prisma.ToneProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      return {
        message: "Tone profile not found.",
        success: false,
        data: null,
      };
    }

    // If activating this profile, deactivate all others first
    if (!existingProfile.isActive) {
      await prisma.ToneProfile.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const toneProfile = await prisma.ToneProfile.update({
      where: { id },
      data: { isActive: !existingProfile.isActive },
    });

    return {
      message: `Tone profile ${
        toneProfile.isActive ? "activated" : "deactivated"
      } successfully.`,
      success: true,
      data: toneProfile,
    };
  }
}

module.exports = ToneProfileService;
