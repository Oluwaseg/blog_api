const Joi = require('joi');
const { sendError, statusCodes } = require('../utils/responseUtils');

/**
 * Middleware factory for validating request data
 * @param {Object} schema - Joi validation schema
 * @param {String} property - Request property to validate (body, params, query)
 * @returns {Function} Express middleware
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const data = req[property];
    const { error } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!error) {
      return next();
    }

    const errorMessages = error.details.map(detail => detail.message);
    return sendError(res, statusCodes.BAD_REQUEST, 'Validation error', {
      errors: errorMessages,
    });
  };
};

// Validation schemas for auth routes
const authValidation = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().max(100),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required(),
  }),
};

// Validation schemas for profile routes
const profileValidation = {
  updateDetails: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    name: Joi.string().max(100).optional(),
    bio: Joi.string().max(500).allow('').optional(),
    dob: Joi.date().iso().optional().allow(null),
    profession: Joi.string().max(100).optional().allow(''),
    interests: Joi.array().items(Joi.string()).optional(),
    contact: Joi.object({
      phone: Joi.string().max(20).optional().allow(''),
      alternateEmail: Joi.string().email().optional().allow(''),
      website: Joi.string().uri().optional().allow(''),
    }).optional(),
    address: Joi.object({
      street: Joi.string().max(100).optional().allow(''),
      city: Joi.string().max(50).optional().allow(''),
      state: Joi.string().max(50).optional().allow(''),
      country: Joi.string().max(50).optional().allow(''),
      postalCode: Joi.string().max(20).optional().allow(''),
    }).optional(),
    social: Joi.object({
      github: Joi.string().uri().optional().allow(''),
      twitter: Joi.string().uri().optional().allow(''),
      linkedin: Joi.string().uri().optional().allow(''),
      facebook: Joi.string().uri().optional().allow(''),
      instagram: Joi.string().uri().optional().allow(''),
    }).optional(),
  }).min(1),

  updatePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  }),
};

// Validation schemas for admin routes
const adminValidation = {
  updateUserRole: Joi.object({
    isAdmin: Joi.boolean().required(),
  }),

  userIdParam: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc'),
    filterField: Joi.string(),
    filterValue: Joi.string(),
  }),
};

module.exports = {
  validate,
  authValidation,
  profileValidation,
  adminValidation,
};
