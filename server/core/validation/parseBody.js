const AppError = require("../errors/AppError");

// Strict zod validation for request bodies (throws instead of responding,
// so controllers can stay try/catch -> next(error) only).
const parseBody = (schema, body) => {
  const result = schema.safeParse(body);

  if (!result.success) {
    const error = new AppError("Validation failed", 400);
    error.details = result.error.flatten().fieldErrors;
    throw error;
  }

  return result.data;
};

module.exports = { parseBody };
