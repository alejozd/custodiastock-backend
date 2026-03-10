import {
  cancelEntry,
  createEntry,
  getEntries,
  getEntryById,
} from "../services/entryService.js";
import { peekNextNumber } from "../services/sequenceService.js";

export const getNextNumberController = async (req, res) => {
  const nextNumber = await peekNextNumber("ENTRADA");
  res.json({ nextNumber });
};

export const createEntryController = async (req, res) => {
  const payload = {
    ...req.body,
    userId: req.user.id,
  };
  const entry = await createEntry(payload);
  res.status(201).json(entry);
};

export const getEntriesController = async (req, res) => {
  const { startDate, endDate } = req.query;
  const entries = await getEntries({ startDate, endDate });
  res.json(entries);
};

export const getEntryByIdController = async (req, res) => {
  const entry = await getEntryById(Number(req.params.id));
  res.json(entry);
};

export const cancelEntryController = async (req, res) => {
  const payload = {
    ...req.body,
    adminUserId: req.user.id,
  };
  const entry = await cancelEntry(Number(req.params.id), payload);
  res.json(entry);
};
