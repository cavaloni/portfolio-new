import { body, param, query } from "express-validator";

export const createConversationValidator = [
  body("title")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("modelId")
    .optional()
    .isString()
    .withMessage("Model ID must be a string"),
  body("temperature")
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage("Temperature must be between 0 and 2"),
  body("maxTokens")
    .optional()
    .isInt({ min: 1, max: 4000 })
    .withMessage("Max tokens must be between 1 and 4000"),
  body("carbonAware")
    .optional()
    .isBoolean()
    .withMessage("Carbon aware must be a boolean"),
];

export const updateConversationValidator = [
  param("conversationId").isUUID().withMessage("Invalid conversation ID"),
  body("title")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("modelId")
    .optional()
    .isString()
    .withMessage("Model ID must be a string"),
  body("temperature")
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage("Temperature must be between 0 and 2"),
  body("maxTokens")
    .optional()
    .isInt({ min: 1, max: 4000 })
    .withMessage("Max tokens must be between 1 and 4000"),
  body("carbonAware")
    .optional()
    .isBoolean()
    .withMessage("Carbon aware must be a boolean"),
];

export const conversationIdValidator = [
  param("conversationId").isUUID().withMessage("Invalid conversation ID"),
];

export const getConversationsValidator = [
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

export const addMessageValidator = [
  param("conversationId").isUUID().withMessage("Invalid conversation ID"),
  body("content")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Message content is required"),
  body("role")
    .optional()
    .isIn(["user", "assistant", "system"])
    .withMessage("Invalid message role"),
  body("modelId")
    .optional()
    .isString()
    .withMessage("Model ID must be a string"),
  body("tokens")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Tokens must be a positive integer"),
];

export const getMessagesValidator = [
  param("conversationId").isUUID().withMessage("Invalid conversation ID"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("Limit must be between 1 and 200")
    .toInt(),
  query("before")
    .optional()
    .isISO8601()
    .withMessage("Before must be a valid ISO date string"),
];

export const messageIdValidator = [
  param("messageId").isUUID().withMessage("Invalid message ID"),
];
