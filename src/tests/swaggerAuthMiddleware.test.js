import { createSwaggerAuthMiddleware } from "../middleware/swaggerAuthMiddleware.js";

const basicHeader = (user, password) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

describe("swaggerAuthMiddleware", () => {
  const originalUser = process.env.SWAGGER_USER;
  const originalPassword = process.env.SWAGGER_PASSWORD;

  afterEach(() => {
    process.env.SWAGGER_USER = originalUser;
    process.env.SWAGGER_PASSWORD = originalPassword;
  });

  it("allows any request through when SWAGGER_USER/SWAGGER_PASSWORD are not configured", () => {
    delete process.env.SWAGGER_USER;
    delete process.env.SWAGGER_PASSWORD;

    const middleware = createSwaggerAuthMiddleware();
    const req = { headers: {} };
    const res = { set: () => res, status: () => res, send: () => res };
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  it("rejects requests with missing or wrong credentials when configured", () => {
    process.env.SWAGGER_USER = "docs_admin";
    process.env.SWAGGER_PASSWORD = "s3cret";

    const middleware = createSwaggerAuthMiddleware();
    const req = { headers: {} };
    let statusCode;
    const res = {
      set: () => res,
      status: (code) => {
        statusCode = code;
        return res;
      },
      send: () => res,
    };
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);

    const reqWrongPassword = {
      headers: { authorization: basicHeader("docs_admin", "wrong") },
    };
    let statusCode2;
    const res2 = {
      set: () => res2,
      status: (code) => {
        statusCode2 = code;
        return res2;
      },
      send: () => res2,
    };
    middleware(reqWrongPassword, res2, () => {});
    expect(statusCode2).toBe(401);
  });

  it("allows the request through with correct Basic Auth credentials", () => {
    process.env.SWAGGER_USER = "docs_admin";
    process.env.SWAGGER_PASSWORD = "s3cret";

    const middleware = createSwaggerAuthMiddleware();
    const req = {
      headers: { authorization: basicHeader("docs_admin", "s3cret") },
    };
    const res = { set: () => res, status: () => res, send: () => res };
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });
});
