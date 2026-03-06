import {
  createDelivery,
  getDeliveries,
  getDeliveryById,
} from "../services/deliveryService.js";

export const createDeliveryController = async (req, res) => {
  const delivery = await createDelivery(req.body);
  res.status(201).json(delivery);
};

export const getDeliveriesController = async (req, res) => {
  const deliveries = await getDeliveries();
  res.json(deliveries);
};

export const getDeliveryByIdController = async (req, res) => {
  const delivery = await getDeliveryById(Number(req.params.id));
  res.json(delivery);
};
