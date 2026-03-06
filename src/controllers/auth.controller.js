import { login } from "../services/auth.service.js";

export const loginController = async (req, res) => {
  const result = await login(req.body);
  res.json(result);
};
