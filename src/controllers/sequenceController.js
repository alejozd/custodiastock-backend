import {
  getAllSequences,
  getSequenceById,
  createSequence,
  updateSequence,
  deleteSequence,
} from "../services/sequenceService.js";
import { ApiError } from "../utils/apiError.js";

export const getAllSequencesController = async (req, res) => {
  const sequences = await getAllSequences();
  res.json(sequences);
};

export const getSequenceByIdController = async (req, res) => {
  const sequence = await getSequenceById(Number(req.params.id));
  if (!sequence) {
    throw new ApiError(404, "Sequence not found");
  }
  res.json(sequence);
};

export const createSequenceController = async (req, res) => {
  if (!req.body.name) {
    throw new ApiError(400, "Sequence name is required");
  }
  const sequence = await createSequence(req.body);
  res.status(201).json(sequence);
};

export const updateSequenceController = async (req, res) => {
  const id = Number(req.params.id);
  const sequence = await updateSequence(id, req.body);
  res.json(sequence);
};

export const deleteSequenceController = async (req, res) => {
  const id = Number(req.params.id);
  await deleteSequence(id);
  res.status(204).send();
};
