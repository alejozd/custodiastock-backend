import { jest } from "@jest/globals";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

describe("roleMiddleware", () => {
  it("calls next() without an error when req.user.role is in allowedRoles", () => {
    const req = { user: { role: "ADMIN" } };
    const res = {};
    const next = jest.fn();

    roleMiddleware(["ADMIN", "OPERATOR"])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next(error) with a 403 ApiError when the role is not allowed", () => {
    const req = { user: { role: "OPERATOR" } };
    const res = {};
    const next = jest.fn();

    roleMiddleware(["ADMIN"])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("Forbidden: Insufficient permissions");
  });

  it("calls next(error) with a 401 ApiError when req.user is missing", () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    roleMiddleware(["ADMIN"])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("User not authenticated");
  });
});
