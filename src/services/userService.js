import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword } from "../utils/hash.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
};

const assertUserPayload = (payload, isUpdate = false) => {
  const requiredFields = ["name", "email", "password", "role"];

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

  return prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashPassword(payload.password),
      role: payload.role,
      active: payload.active ?? true,
    },
    select: userSelect,
  });
};

export const getUsers = async () => {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

export const updateUser = async (id, payload) => {
  assertUserPayload(payload, true);

  await getUserById(id);

  const data = {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.email !== undefined && { email: payload.email }),
    ...(payload.role !== undefined && { role: payload.role }),
    ...(payload.active !== undefined && { active: payload.active }),
    ...(payload.password !== undefined && { password: hashPassword(payload.password) }),
  };

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "No fields sent for update");
  }

  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
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
