import prisma from "../config/prisma.js";

/**
 * Gets the next available number for a sequence and increments it.
 * @param {string} name - The name of the sequence (e.g., 'delivery')
 * @returns {Promise<string>} The formatted next document number.
 */
export const getNextNumber = async (name) => {
  return await prisma.$transaction(async (tx) => {
    let sequence = await tx.sequence.findUnique({
      where: { name },
    });

    if (!sequence) {
      // Initialize sequence if it doesn't exist
      sequence = await tx.sequence.create({
        data: {
          name,
          prefix: name === "delivery" ? "ENT-" : "",
          nextNumber: 1,
        },
      });
    }

    const currentNumber = sequence.nextNumber;
    const formattedNumber = `${sequence.prefix}${currentNumber.toString().padStart(6, "0")}`;

    // Update for the next call
    await tx.sequence.update({
      where: { id: sequence.id },
      data: { nextNumber: currentNumber + 1 },
    });

    return formattedNumber;
  });
};

/**
 * Just retrieves the current next number without incrementing it.
 * Useful for showing the user what the next number will be.
 */
export const peekNextNumber = async (name) => {
  let sequence = await prisma.sequence.findUnique({
    where: { name },
  });

  if (!sequence) {
    // If it doesn't exist, we assume it starts at 1
    const prefix = name === "delivery" ? "ENT-" : "";
    return `${prefix}000001`;
  }

  return `${sequence.prefix}${sequence.nextNumber.toString().padStart(6, "0")}`;
};

export const getAllSequences = async () => {
  return await prisma.sequence.findMany();
};

export const getSequenceById = async (id) => {
  return await prisma.sequence.findUnique({
    where: { id },
  });
};

export const createSequence = async (data) => {
  return await prisma.sequence.create({
    data: {
      name: data.name,
      prefix: data.prefix ?? "",
      nextNumber: data.nextNumber ?? 1,
    },
  });
};

export const updateSequence = async (id, data) => {
  return await prisma.sequence.update({
    where: { id },
    data: {
      name: data.name,
      prefix: data.prefix,
      nextNumber: data.nextNumber,
    },
  });
};

export const deleteSequence = async (id) => {
  return await prisma.sequence.delete({
    where: { id },
  });
};
