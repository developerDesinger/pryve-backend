const ToneProfileService = require("../services/toneProfile.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class ToneProfileController {
  /**
   * Get all tone profiles
   * GET /api/v1/tone-profiles
   */
  static getAllToneProfiles = catchAsyncHandler(async (req, res) => {
    const result = await ToneProfileService.getAllToneProfiles();
    return res.status(200).json(result);
  });

  /**
   * Get single tone profile by ID
   * GET /api/v1/tone-profiles/:id
   */
  static getToneProfileById = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ToneProfileService.getToneProfileById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Create new tone profile
   * POST /api/v1/tone-profiles
   */
  static createToneProfile = catchAsyncHandler(async (req, res) => {
    const result = await ToneProfileService.createToneProfile(req.body);
    return res.status(201).json(result);
  });

  /**
   * Update tone profile
   * PATCH /api/v1/tone-profiles/:id
   */
  static updateToneProfile = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ToneProfileService.updateToneProfile(id, req.body);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Delete tone profile
   * DELETE /api/v1/tone-profiles/:id
   */
  static deleteToneProfile = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ToneProfileService.deleteToneProfile(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });

  /**
   * Toggle tone profile status
   * PATCH /api/v1/tone-profiles/:id/toggle
   */
  static toggleToneProfileStatus = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ToneProfileService.toggleToneProfileStatus(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  });
}

module.exports = ToneProfileController;
