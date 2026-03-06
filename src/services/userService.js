import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword } from "../utils/hash.js";

const mapUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: "OPERATOR",
  active: true,
  createdAt: user.createdAt,
});

const assertUserPayload = (payload, isUpdate = false) => {
  const requiredFields = ["name", "email", "password"];

  if (!isUpdate) {
    const missing = requiredFields.filter((field) => !payload[field]);
    if (missing.length) {
      throw new ApiError(400, "Missing required user fields", { missing });
    }
  }
};

export const createUser = async (payload) => {
  assertUserPayload(payload);

  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashPassword(payload.password),
    },
  });

  return mapUserResponse(user);
};

export const getUsers = async () => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return users.map(mapUserResponse);
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return mapUserResponse(user);
};

export const updateUser = async (id, payload) => {
  assertUserPayload(payload, true);

  await getUserById(id);

  const data = {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.email !== undefined && { email: payload.email }),
    ...(payload.password !== undefined && { password: hashPassword(payload.password) }),
  };

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "No supported fields sent for update", {
      supportedFields: ["name", "email", "password"],
    });
  }

  try {
    const updated = await prisma.user.update({ where: { id }, data });
    return mapUserResponse(updated);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Email already in use");
    }
    throw error;
  }
};

export const deleteUser = async (id) => {
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
};
