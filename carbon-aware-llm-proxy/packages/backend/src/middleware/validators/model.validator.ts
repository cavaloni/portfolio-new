import { body, param, query } from "express-validator";

export const modelIdValidator = [
  param("id").isUUID().withMessage("Invalid model ID"),
];

export const getModelsValidator = [
  query("provider")
    .optional()
    .isString()
    .withMessage("Provider must be a string"),
  query("capability")
    .optional()
    .isString()
    .withMessage("Capability must be a string"),
  query("search")
    .optional()
    .isString()
    .withMessage("Search term must be a string"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
];

export const createModelValidator = [
  body("provider").isString().notEmpty().withMessage("Provider is required"),
  body("providerModelId")
    .isString()
    .notEmpty()
    .withMessage("Provider model ID is required"),
  body("name")
    .isString()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 200 })
    .withMessage("Name must be less than 200 characters"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("contextWindow")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Context window must be a positive integer"),
  body("maxOutputTokens")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max output tokens must be a positive integer"),
  body("capabilities")
    .optional()
    .isArray()
    .withMessage("Capabilities must be an array of strings"),
  body("capabilities.*")
    .isString()
    .withMessage("Each capability must be a string"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const updateModelValidator = [
  ...modelIdValidator,
  body("name")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Name must be less than 200 characters"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("contextWindow")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Context window must be a positive integer"),
  body("maxOutputTokens")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max output tokens must be a positive integer"),
  body("capabilities")
    .optional()
    .isArray()
    .withMessage("Capabilities must be an array of strings"),
  body("capabilities.*")
    .isString()
    .withMessage("Each capability must be a string"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const modelCarbonFootprintValidator = [
  param("modelId").isUUID().withMessage("Invalid model ID"),
  query("region").optional().isString().withMessage("Region must be a string"),
];

export const updateModelCarbonFootprintValidator = [
  param("modelId").isUUID().withMessage("Invalid model ID"),
  body("region").isString().notEmpty().withMessage("Region is required"),
  body("emissions")
    .isFloat({ min: 0 })
    .withMessage("Emissions must be a positive number"),
  body("energy")
    .isFloat({ min: 0 })
    .withMessage("Energy must be a positive number"),
  body("intensity")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Intensity must be a positive number"),
  body("modelName")
    .optional()
    .isString()
    .withMessage("Model name must be a string"),
  body("provider")
    .optional()
    .isString()
    .withMessage("Provider must be a string"),
];

export const recommendedModelsValidator = [
  param("capability")
    .isString()
    .notEmpty()
    .withMessage("Capability is required"),
  query("region").optional().isString().withMessage("Region must be a string"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Limit must be between 1 and 20")
    .toInt(),
];

export const syncWithProviderValidator = [
  param("provider").isString().notEmpty().withMessage("Provider is required"),
  body("models")
    .isArray({ min: 1 })
    .withMessage("At least one model is required"),
  body("models.*.providerModelId")
    .isString()
    .notEmpty()
    .withMessage("Provider model ID is required for each model"),
  body("models.*.name")
    .isString()
    .notEmpty()
    .withMessage("Name is required for each model"),
  body("models.*.description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("models.*.contextWindow")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Context window must be a positive integer"),
  body("models.*.maxOutputTokens")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max output tokens must be a positive integer"),
  body("models.*.capabilities")
    .optional()
    .isArray()
    .withMessage("Capabilities must be an array of strings"),
  body("models.*.capabilities.*")
    .isString()
    .withMessage("Each capability must be a string"),
  body("models.*.isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];
