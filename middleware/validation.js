const Joi = require("joi");

// Validation schemas
const schemas = {
  register: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    username: Joi.string().min(3).max(30),
    email: Joi.string().email()
  }).min(1), // At least one field required

  createBook: Joi.object({
    externalId: Joi.string().max(200),
    title: Joi.string().required(),
    authors: Joi.array().items(Joi.string()),
    description: Joi.string(),
    publishedDate: Joi.alternatives().try(Joi.string(), Joi.number()),
    thumbnail: Joi.string().uri().allow(null, "")
  }),

  updateBook: Joi.object({
    title: Joi.string(),
    authors: Joi.array().items(Joi.string()),
    description: Joi.string(),
    publishedDate: Joi.alternatives().try(Joi.string(), Joi.number()),
    thumbnail: Joi.string().uri().allow(null, "")
  }).min(1),

  createReview: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    text: Joi.string().required(),
    book: Joi.string().required() // MongoDB ObjectId as string
  }),

  updateReview: Joi.object({
    rating: Joi.number().min(1).max(5),
    text: Joi.string()
  }).min(1)
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return res.status(500).json({ message: "Validation schema not found" });
    }

    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Validation error",
        details: error.details[0].message
      });
    }

    next();
  };
};

module.exports = validate;
