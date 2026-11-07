const AppError = require("./AppError");
const asyncHandler = require("../../shared/utils/asyncHandler");

describe("AppError", () => {
  it("creates error with message and statusCode", () => {
    const err = new AppError("Something went wrong", 400);
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe("AppError");
    expect(err instanceof Error).toBe(true);
  });

  it("defaults statusCode to 500 if not provided", () => {
    const err = new AppError("Server error");
    expect(err.statusCode).toBe(500);
  });

  it("captures stack trace", () => {
    const err = new AppError("Test error");
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("AppError: Test error");
  });
});

describe("asyncHandler", () => {
  it("calls next with error when promise rejects", async () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    const error = new Error("Async error");

    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("calls next with AppError when async function throws AppError", async () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    const appError = new AppError("Validation failed", 422);

    const handler = asyncHandler(async () => {
      throw appError;
    });

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(appError);
  });

  it("does not call next when promise resolves", async () => {
    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    const handler = asyncHandler(async (req, res) => {
      res.json({ success: true });
    });

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes req, res, next to the handler", async () => {
    const req = { test: "req" };
    const res = { test: "res" };
    const next = { test: "next" };
    let captured;

    const handler = asyncHandler(async (r, s, n) => {
      captured = { req: r, res: s, next: n };
    });

    await handler(req, res, next);

    expect(captured).toEqual({ req, res, next });
  });
});