const Joi = require("joi");

const password = Joi.string().min(8).max(72).custom((value, helpers) =>
  Buffer.byteLength(value, "utf8") <= 72 ? value : helpers.error("any.invalid"));
const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254);
const objectId = Joi.string().hex().length(24);
const bookFields = {
  externalId: Joi.string().trim().max(200),
  title: Joi.string().trim().min(1).max(500),
  authors: Joi.array().items(Joi.string().trim().min(1).max(200)).max(30),
  description: Joi.string().max(10000).allow(""),
  publishedDate: Joi.string().max(50).allow(""),
  thumbnail: Joi.string().uri({ scheme: ["https"] }).max(2048).allow(null, "")
};
const schemas = {
  register: Joi.object({
    username: Joi.string().trim().min(3).max(30).required(),
    email: email.required(), password: password.required()
  }),
  login: Joi.object({
    email: email.required(),
    password: Joi.string().min(1).max(72).custom((value, helpers) =>
      Buffer.byteLength(value, "utf8") <= 72 ? value : helpers.error("any.invalid")).required()
  }),
  updateProfile: Joi.object({
    username: Joi.string().trim().min(3).max(30), email
  }).min(1),
  createBook: Joi.object({ ...bookFields, title: bookFields.title.required() }),
  updateBook: Joi.object(bookFields).min(1),
  createReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    text: Joi.string().trim().min(1).max(5000).required(), book: objectId.required()
  }),
  updateReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5),
    text: Joi.string().trim().min(1).max(5000)
  }).min(1)
};

module.exports = (name) => (req, res, next) => {
  const { error, value } = schemas[name].required().validate(req.body, {
    abortEarly: true, allowUnknown: false
  });
  if (error) return res.status(400).json({ message: "Validation error", details: error.details[0].message });
  req.body = value;
  next();
};
module.exports.validId = (name) => (req, res, next) => {
  if (!/^[a-fA-F0-9]{24}$/.test(req.params[name] || "")) {
    return res.status(400).json({ message: "Invalid ID format" });
  }
  next();
};
