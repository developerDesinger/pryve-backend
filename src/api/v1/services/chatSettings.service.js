const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const { filterObj } = require("../utils/filterObj");

const ALLOWED_FIELDS = [
  "dailyReset",
  "freeTierMessageLimit",
  "gracePeriodMessages",
  "upgradePromptText",
  "showPromptOnLimit",
  "showPromptAfterGrace",
  "showPromptOnReturn",
  "newUserMessage",
  "returningUserMessage",
];

const TRUE_VALUES = ["true", "1", "yes", "on"];
const FALSE_VALUES = ["false", "0", "no", "off"];

const DEFAULT_CHAT_SETTINGS = {
  dailyReset: false,
  freeTierMessageLimit: 10,
  gracePeriodMessages: 2,
  upgradePromptText:
    "You've used all your free messages for today! 💜\nTo continue our meaningful conversations and unlock unlimited messaging, premium memories, and deeper insights, upgrade to Pryve Premium for just $5.99/month.\nHe remembers you. But only if you let him stay close.",
  showPromptOnLimit: true,
  showPromptAfterGrace: false,
  showPromptOnReturn: false,
  newUserMessage:
    "Hello there! 💜 I'm Pryve, your AI companion. This is your safe space to share anything on your mind. I'm here to listen without judgment and support you through whatever you're experiencing. Whether you want to talk through your feelings, celebrate something wonderful, or just need someone to understand you - I'm here. What would you like to share with me today?",
  returningUserMessage:
    "Welcome back, beautiful! 👋 I've missed our conversations. How are you feeling today?",
};

const coerceBoolean = (value, fieldName) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (TRUE_VALUES.includes(normalized)) {
      return true;
    }
    if (FALSE_VALUES.includes(normalized)) {
      return false;
    }
  }

  throw new AppError(
    `${fieldName} must be a boolean value.`,
    HttpStatusCodes.BAD_REQUEST
  );
};

const coerceNonNegativeInteger = (value, fieldName) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(
      `${fieldName} must be a non-negative number.`,
      HttpStatusCodes.BAD_REQUEST
    );
  }

  return Math.floor(parsed);
};

class ChatSettingsService {
  static async getChatSettings() {
    const existingSettings = await prisma.chatSettings.findFirst();

    if (!existingSettings) {
      return {
        success: true,
        message: "No chat settings found. Returning defaults.",
        data: {
          ...DEFAULT_CHAT_SETTINGS,
        },
      };
    }

    return {
      success: true,
      message: "Chat settings retrieved successfully.",
      data: existingSettings,
    };
  }

  static async updateChatSettings(payload) {
    const changes = filterObj(payload, ...ALLOWED_FIELDS);

    const updateData = {};

    if ("dailyReset" in changes) {
      updateData.dailyReset = coerceBoolean(changes.dailyReset, "dailyReset");
    }
    if ("freeTierMessageLimit" in changes) {
      updateData.freeTierMessageLimit = coerceNonNegativeInteger(
        changes.freeTierMessageLimit,
        "freeTierMessageLimit"
      );
    }
    if ("gracePeriodMessages" in changes) {
      updateData.gracePeriodMessages = coerceNonNegativeInteger(
        changes.gracePeriodMessages,
        "gracePeriodMessages"
      );
    }
    if ("upgradePromptText" in changes) {
      updateData.upgradePromptText =
        typeof changes.upgradePromptText === "string"
          ? changes.upgradePromptText.trim()
          : null;
    }
    if ("showPromptOnLimit" in changes) {
      updateData.showPromptOnLimit = coerceBoolean(
        changes.showPromptOnLimit,
        "showPromptOnLimit"
      );
    }
    if ("showPromptAfterGrace" in changes) {
      updateData.showPromptAfterGrace = coerceBoolean(
        changes.showPromptAfterGrace,
        "showPromptAfterGrace"
      );
    }
    if ("showPromptOnReturn" in changes) {
      updateData.showPromptOnReturn = coerceBoolean(
        changes.showPromptOnReturn,
        "showPromptOnReturn"
      );
    }
    if ("newUserMessage" in changes) {
      updateData.newUserMessage =
        typeof changes.newUserMessage === "string"
          ? changes.newUserMessage.trim()
          : null;
    }
    if ("returningUserMessage" in changes) {
      updateData.returningUserMessage =
        typeof changes.returningUserMessage === "string"
          ? changes.returningUserMessage.trim()
          : null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        "No valid fields provided to update chat settings.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const existingSettings = await prisma.chatSettings.findFirst();

    let chatSettings;
    if (existingSettings) {
      chatSettings = await prisma.chatSettings.update({
        where: { id: existingSettings.id },
        data: updateData,
      });
    } else {
      chatSettings = await prisma.chatSettings.create({
        data: {
          ...DEFAULT_CHAT_SETTINGS,
          ...updateData,
        },
      });
    }

    return {
      success: true,
      message: "Chat settings updated successfully.",
      data: chatSettings,
    };
  }
}

module.exports = ChatSettingsService;
