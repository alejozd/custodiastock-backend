import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../services/userService.js";

export const createUserController = async (req, res) => {
  const user = await createUser(req.body);
  res.status(201).json(user);
};

export const getUsersController = async (req, res) => {
  const users = await getUsers();
  res.json(users);
};

export const getUserByIdController = async (req, res) => {
  const user = await getUserById(Number(req.params.id));
  res.json(user);
};

export const updateUserController = async (req, res) => {
  const user = await updateUser(Number(req.params.id), req.body);
  res.json(user);
};

export const deleteUserController = async (req, res) => {
  await deleteUser(Number(req.params.id));
  res.status(204).send();
};
