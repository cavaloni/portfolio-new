import { body, param, query } from "express-validator";

export const calculateFootprintValidator = [
  body("modelId").isUUID().withMessage("Invalid model ID"),
  body("tokens")
    .isInt({ min: 1 })
    .withMessage("Tokens must be a positive integer"),
  body("region").optional().isString().withMessage("Region must be a string"),
];

export const calculateSavingsValidator = [
  body("modelId").isUUID().withMessage("Invalid model ID"),
  body("baselineModelId").isUUID().withMessage("Invalid baseline model ID"),
  body("tokens")
    .isInt({ min: 1 })
    .withMessage("Tokens must be a positive integer"),
  body("region").optional().isString().withMessage("Region must be a string"),
];

export const regionParamValidator = [
  param("region").isString().notEmpty().withMessage("Region is required"),
];

export const carbonForecastValidator = [
  ...regionParamValidator,
  query("hours")
    .optional()
    .isInt({ min: 1, max: 168 }) // Max 1 week (168 hours)
    .withMessage("Hours must be between 1 and 168")
    .toInt(),
];

export const userStatsValidator = [
  query("range")
    .optional()
    .isIn(["day", "week", "month", "year"])
    .withMessage("Range must be one of: day, week, month, year"),
];

export const leaderboardValidator = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  query("range")
    .optional()
    .isIn(["day", "week", "month", "year"])
    .withMessage("Range must be one of: day, week, month, year"),
];
