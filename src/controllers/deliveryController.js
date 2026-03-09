import {
  cancelDelivery,
  createDelivery,
  deleteDelivery,
  getDeliveries,
  getDeliveryById,
} from "../services/deliveryService.js";
import { getNextNumber } from "../services/sequenceService.js";

export const getNextNumberController = async (req, res) => {
  const nextNumber = await getNextNumber("delivery");
  res.json({ nextNumber });
};

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

export const cancelDeliveryController = async (req, res) => {
  const delivery = await cancelDelivery(Number(req.params.id), req.body);
  res.json(delivery);
};

export const deleteDeliveryController = async (req, res) => {
  await deleteDelivery(Number(req.params.id));
  res.status(204).send();
};
