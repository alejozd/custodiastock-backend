import crypto from "crypto";
import os from "os";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const DEMO_DAYS = 7;
const OFFLINE_GRACE_DAYS = 7;

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getTeamFingerprint = () => {
  const networkInfo = os.networkInterfaces();
  const macs = Object.values(networkInfo)
    .flat()
    .filter(Boolean)
    .map((item) => item.mac)
    .filter((mac) => mac && mac !== "00:00:00:00:00:00")
    .sort();

  const payload = [os.hostname(), os.platform(), os.arch(), ...macs].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const getCurrentLicense = async () => {
  const installationHash = getTeamFingerprint();
  let license = await prisma.license.findUnique({ where: { installationHash } });

  if (!license) {
    const now = new Date();
    const expirationDate = addDays(now, DEMO_DAYS);
    license = await prisma.license.create({
      data: {
        nit: "PENDING",
        installationHash,
        status: "DEMO",
        licenseType: "DEMO",
        activationDate: now,
        expirationDate,
        lastValidation: now,
        offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
      },
    });
  }

  return license;
};

const evaluateLicense = async (license) => {
  const now = new Date();
  let nextStatus = license.status;

  if (license.expirationDate && now > license.expirationDate) {
    nextStatus = "EXPIRED";
  }

  if (license.offlineGraceUntil && now > license.offlineGraceUntil) {
    nextStatus = "BLOCKED";
  }

  if (nextStatus !== license.status) {
    return prisma.license.update({
      where: { id: license.id },
      data: { status: nextStatus },
    });
  }

  return license;
};

const registerLicense = async ({ nit }) => {
  const license = await getCurrentLicense();
  return prisma.license.update({
    where: { id: license.id },
    data: { nit: nit || license.nit },
  });
};

const validateWithCentralServer = async (license) => {
  const now = new Date();
  const centralServerUrl = process.env.LICENSE_SERVER_URL;

  if (!centralServerUrl) {
    return prisma.license.update({
      where: { id: license.id },
      data: {
        lastValidation: now,
        offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
      },
    });
  }

  try {
    const response = await fetch(`${centralServerUrl}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nit: license.nit,
        installationHash: license.installationHash,
        token: license.licenseToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`License server returned ${response.status}`);
    }

    const payload = await response.json();
    return prisma.license.update({
      where: { id: license.id },
      data: {
        status: payload.status || license.status,
        licenseType: payload.licenseType || license.licenseType,
        activationDate: payload.activationDate ? new Date(payload.activationDate) : license.activationDate,
        expirationDate: payload.expirationDate ? new Date(payload.expirationDate) : license.expirationDate,
        lastValidation: now,
        offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
      },
    });
  } catch (error) {
    if (license.offlineGraceUntil && now <= license.offlineGraceUntil) {
      return prisma.license.update({
        where: { id: license.id },
        data: { status: license.status, lastValidation: now },
      });
    }

    return prisma.license.update({
      where: { id: license.id },
      data: { status: "BLOCKED", lastValidation: now },
    });
  }
};

const activateLicense = async ({ token }) => {
  if (!token) {
    throw new ApiError(400, "License token is required");
  }

  const license = await getCurrentLicense();
  const now = new Date();

  return prisma.license.update({
    where: { id: license.id },
    data: {
      status: "ACTIVE",
      licenseType: "PERMANENT",
      activationDate: license.activationDate || now,
      expirationDate: null,
      licenseToken: token,
      lastValidation: now,
      offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
    },
  });
};

const initializeLicense = async () => {
  const license = await getCurrentLicense();
  return evaluateLicense(license);
};

export const licenseService = {
  getCurrentLicense,
  registerLicense,
  validateWithCentralServer,
  activateLicense,
  initializeLicense,
};
