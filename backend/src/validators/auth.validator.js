import Joi from "joi";

export const registerSchema = Joi.object({
    username: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    country_code: Joi.string().length(2).uppercase().optional()
});
