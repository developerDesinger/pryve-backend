const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");

class SettingsService {
  /**
   * Get all feature toggles
   * GET /api/v1/settings/feature-toggles
   */
  static async getAllFeatureToggles() {
    try {
      const toggles = await prisma.featureToggle.findMany({
        orderBy: { order: "asc" },
      });

      return {
        success: true,
        message: "Feature toggles retrieved successfully.",
        data: toggles,
      };
    } catch (error) {
      console.error("Error fetching feature toggles:", error);
      throw new AppError(
        "Failed to fetch feature toggles.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get feature toggle by name
   * GET /api/v1/settings/feature-toggles/:name
   */
  static async getFeatureToggleByName(name) {
    try {
      const toggle = await prisma.featureToggle.findUnique({
        where: { name: name.toUpperCase() },
      });

      if (!toggle) {
        throw new AppError("Feature toggle not found.", HttpStatusCodes.NOT_FOUND);
      }

      return {
        success: true,
        message: "Feature toggle retrieved successfully.",
        data: toggle,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error fetching feature toggle:", error);
      throw new AppError(
        "Failed to fetch feature toggle.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update feature toggle status
   * PATCH /api/v1/settings/feature-toggles/:name
   */
  static async updateFeatureToggle(name, data) {
    try {
      const { isEnabled, status } = data;

      const existingToggle = await prisma.featureToggle.findUnique({
        where: { name: name.toUpperCase() },
      });

      if (!existingToggle) {
        throw new AppError("Feature toggle not found.", HttpStatusCodes.NOT_FOUND);
      }

      // Don't allow enabling features marked as "COMING_SOON"
      if (isEnabled && existingToggle.status === "COMING_SOON") {
        throw new AppError(
          "Cannot enable features marked as 'Coming Soon'.",
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const updateData = {};
      if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
      if (status) updateData.status = status;

      const updatedToggle = await prisma.featureToggle.update({
        where: { name: name.toUpperCase() },
        data: updateData,
      });

      return {
        success: true,
        message: "Feature toggle updated successfully.",
        data: updatedToggle,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error updating feature toggle:", error);
      throw new AppError(
        "Failed to update feature toggle.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Toggle feature on/off
   * PATCH /api/v1/settings/feature-toggles/:name/toggle
   */
  static async toggleFeature(name) {
    try {
      const toggle = await prisma.featureToggle.findUnique({
        where: { name: name.toUpperCase() },
      });

      if (!toggle) {
        throw new AppError("Feature toggle not found.", HttpStatusCodes.NOT_FOUND);
      }

      // Don't allow enabling features marked as "COMING_SOON"
      if (!toggle.isEnabled && toggle.status === "COMING_SOON") {
        throw new AppError(
          "Cannot enable features marked as 'Coming Soon'.",
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const updatedToggle = await prisma.featureToggle.update({
        where: { name: name.toUpperCase() },
        data: { isEnabled: !toggle.isEnabled },
      });

      return {
        success: true,
        message: `Feature ${updatedToggle.isEnabled ? "enabled" : "disabled"} successfully.`,
        data: updatedToggle,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error toggling feature:", error);
      throw new AppError(
        "Failed to toggle feature.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get system language
   * GET /api/v1/settings/system-language
   */
  static async getSystemLanguage() {
    try {
      const languageSetting = await prisma.systemSettings.findUnique({
        where: { key: "SYSTEM_LANGUAGE" },
      });

      // If not found, return default
      if (!languageSetting) {
        return {
          success: true,
          message: "System language retrieved successfully.",
          data: {
            key: "SYSTEM_LANGUAGE",
            value: "English",
            displayName: "System Language",
            description: "The default language for the application",
            availableOptions: [
              { value: "English", label: "English" },
              { value: "Spanish", label: "Spanish" },
              { value: "French", label: "French" },
              { value: "German", label: "German" },
              { value: "Italian", label: "Italian" },
              { value: "Portuguese", label: "Portuguese" },
              { value: "Chinese", label: "Chinese" },
              { value: "Japanese", label: "Japanese" },
              { value: "Korean", label: "Korean" },
              { value: "Arabic", label: "Arabic" },
            ],
          },
        };
      }

      // Parse options if stored as JSON
      let availableOptions = [];
      if (languageSetting.options) {
        availableOptions = languageSetting.options;
      } else {
        // Default options
        availableOptions = [
          { value: "English", label: "English" },
          { value: "Spanish", label: "Spanish" },
          { value: "French", label: "French" },
          { value: "German", label: "German" },
          { value: "Italian", label: "Italian" },
          { value: "Portuguese", label: "Portuguese" },
          { value: "Chinese", label: "Chinese" },
          { value: "Japanese", label: "Japanese" },
          { value: "Korean", label: "Korean" },
          { value: "Arabic", label: "Arabic" },
        ];
      }

      return {
        success: true,
        message: "System language retrieved successfully.",
        data: {
          ...languageSetting,
          availableOptions,
        },
      };
    } catch (error) {
      console.error("Error fetching system language:", error);
      throw new AppError(
        "Failed to fetch system language.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update system language
   * PATCH /api/v1/settings/system-language
   */
  static async updateSystemLanguage(language) {
    try {
      if (!language) {
        throw new AppError("Language value is required.", HttpStatusCodes.BAD_REQUEST);
      }

      // Available languages
      const availableLanguages = [
        "English",
        "Spanish",
        "French",
        "German",
        "Italian",
        "Portuguese",
        "Chinese",
        "Japanese",
        "Korean",
        "Arabic",
      ];

      if (!availableLanguages.includes(language)) {
        throw new AppError(
          `Invalid language. Must be one of: ${availableLanguages.join(", ")}`,
          HttpStatusCodes.BAD_REQUEST
        );
      }

      // Check if setting exists
      const existingSetting = await prisma.systemSettings.findUnique({
        where: { key: "SYSTEM_LANGUAGE" },
      });

      let languageSetting;

      if (existingSetting) {
        // Update existing
        languageSetting = await prisma.systemSettings.update({
          where: { key: "SYSTEM_LANGUAGE" },
          data: { value: language },
        });
      } else {
        // Create new
        languageSetting = await prisma.systemSettings.create({
          data: {
            key: "SYSTEM_LANGUAGE",
            value: language,
            displayName: "System Language",
            description: "The default language for the application",
            category: "LOCALIZATION",
            dataType: "STRING",
            options: availableLanguages.map((lang) => ({
              value: lang,
              label: lang,
            })),
          },
        });
      }

      return {
        success: true,
        message: "System language updated successfully.",
        data: languageSetting,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error updating system language:", error);
      throw new AppError(
        "Failed to update system language.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Initialize default feature toggles
   * This can be called on app startup or via an admin endpoint
   */
  static async initializeDefaultFeatureToggles() {
    try {
      const defaultToggles = [
        {
          name: "ADVANCED_ANALYTICS",
          displayName: "Advanced Analytics",
          description: "Enhanced user behavior tracking and insights.",
          category: "ANALYTICS",
          isEnabled: true,
          status: "ACTIVE",
          order: 1,
        },
        {
          name: "AI_VOICE_CHAT",
          displayName: "AI Voice Chat",
          description: "Voice-based conversations with AI companion.",
          category: "COMMUNICATION",
          isEnabled: false,
          status: "COMING_SOON",
          order: 2,
        },
        {
          name: "GROUP_THERAPY_SESSIONS",
          displayName: "Group Therapy Sessions",
          description: "Facilitated group conversations and support.",
          category: "SUPPORT",
          isEnabled: false,
          status: "COMING_SOON",
          order: 3,
        },
        {
          name: "CUSTOM_BRANDING",
          displayName: "Custom Branding",
          description: "White-label solutions for organizations.",
          category: "CUSTOMIZATION",
          isEnabled: false,
          status: "COMING_SOON",
          order: 4,
        },
        {
          name: "MULTILINGUAL_SUPPORT",
          displayName: "Multilingual Support",
          description: "Support for multiple languages and cultures.",
          category: "LOCALIZATION",
          isEnabled: false,
          status: "COMING_SOON",
          order: 5,
        },
        {
          name: "CRISIS_INTERVENTION",
          displayName: "Crisis Intervention",
          description: "Emergency support and professional referrals.",
          category: "SUPPORT",
          isEnabled: false,
          status: "COMING_SOON",
          order: 6,
        },
      ];

      const results = [];

      for (const toggle of defaultToggles) {
        const existing = await prisma.featureToggle.findUnique({
          where: { name: toggle.name },
        });

        if (!existing) {
          const created = await prisma.featureToggle.create({
            data: toggle,
          });
          results.push({ action: "created", toggle: created.name });
        } else {
          results.push({ action: "skipped", toggle: toggle.name });
        }
      }

      return {
        success: true,
        message: "Default feature toggles initialized.",
        data: results,
      };
    } catch (error) {
      console.error("Error initializing feature toggles:", error);
      throw new AppError(
        "Failed to initialize feature toggles.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all system settings
   * GET /api/v1/settings/system
   */
  static async getAllSystemSettings() {
    try {
      const settings = await prisma.systemSettings.findMany({
        orderBy: { createdAt: "asc" },
      });

      return {
        success: true,
        message: "System settings retrieved successfully.",
        data: settings,
      };
    } catch (error) {
      console.error("Error fetching system settings:", error);
      throw new AppError(
        "Failed to fetch system settings.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get complete settings (feature toggles + system settings)
   * GET /api/v1/settings
   */
  static async getCompleteSettings() {
    try {
      const [featureToggles, systemSettings, systemLanguage] = await Promise.all([
        this.getAllFeatureToggles(),
        this.getAllSystemSettings(),
        this.getSystemLanguage(),
      ]);

      return {
        success: true,
        message: "Settings retrieved successfully.",
        data: {
          featureToggles: featureToggles.data,
          systemSettings: systemSettings.data,
          systemLanguage: systemLanguage.data,
        },
      };
    } catch (error) {
      console.error("Error fetching complete settings:", error);
      throw new AppError(
        "Failed to fetch settings.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}

module.exports = SettingsService;

