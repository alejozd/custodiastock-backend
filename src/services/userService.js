import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword } from "../utils/hash.js";

const allowedRoles = ["OPERATOR", "ADMIN"];

const mapUserResponse = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
  deletedAt: user.deletedAt,
});

const assertValidRole = (role) => {
  if (role !== undefined && !allowedRoles.includes(role)) {
    throw new ApiError(400, "Invalid role", { allowedRoles });
  }
};

const assertUserPayload = (payload, isUpdate = false) => {
  const requiredFields = ["username", "fullName", "password", "role"];

  if (!isUpdate) {
    const missing = requiredFields.filter((field) => !payload[field]);
    if (missing.length) {
      throw new ApiError(400, "Missing required user fields", { missing });
    }
  }

  assertValidRole(payload.role);
};

const getActiveUserEntityById = async (id) => {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

export const createUser = async (payload) => {
  assertUserPayload(payload);

  try {
    const user = await prisma.user.create({
      data: {
        username: payload.username,
        fullName: payload.fullName,
        email: payload.email,
        password: await hashPassword(payload.password),
        role: payload.role,
        active: payload.active ?? true,
      },
    });

    return mapUserResponse(user);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Username or email already in use");
    }
    throw error;
  }
};

export const getUsers = async () => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return users.map(mapUserResponse);
};

export const getUserById = async (id) => {
  const user = await getActiveUserEntityById(id);
  return mapUserResponse(user);
};

export const updateUser = async (id, payload) => {
  assertUserPayload(payload, true);
  await getActiveUserEntityById(id);

  const data = {
    ...(payload.username !== undefined && { username: payload.username }),
    ...(payload.fullName !== undefined && { fullName: payload.fullName }),
    ...(payload.email !== undefined && { email: payload.email }),
    ...(payload.password !== undefined && { password: await hashPassword(payload.password) }),
    ...(payload.role !== undefined && { role: payload.role }),
    ...(payload.active !== undefined && { active: payload.active }),
  };

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "No supported fields sent for update", {
      supportedFields: ["username", "fullName", "email", "password", "role", "active"],
    });
  }

  try {
    const updated = await prisma.user.update({ where: { id }, data });
    return mapUserResponse(updated);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Username or email already in use");
    }
    throw error;
  }
};

export const deleteUser = async (id) => {
  await getActiveUserEntityById(id);

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      active: false,
    },
  });
};
