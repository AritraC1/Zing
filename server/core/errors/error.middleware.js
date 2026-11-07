const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal server error";

  if (!err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details && { errors: err.details }),
    ...(process.env.NODE_ENV === "development" &&
      !err.isOperational && { stack: err.stack }),
  });
};

module.exports = errorHandler;
