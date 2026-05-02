import crypto from "crypto";
import os from "os";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import pkg from "../../package.json" with { type: "json" };

const OFFLINE_GRACE_DAYS = 7;
const APP_NAME = "CustodiaStock";
const APP_VERSION = pkg.version || "unknown";

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

const buildCentralPayload = (nit, installationHash) => ({
  nit,
  app: APP_NAME,
  instalacion_hash: installationHash,
  version_app: APP_VERSION,
});

const assertServerUrl = () => {
  const baseUrl = process.env.LICENSE_SERVER_URL;
  if (!baseUrl) {
    throw new ApiError(500, "LICENSE_SERVER_URL is not configured");
  }
  return baseUrl.replace(/\/$/, "");
};

const mapRemoteToLocal = (data, fallback = {}) => {
  const now = new Date();
  return {
    nit: data?.nit || fallback.nit || "PENDING",
    status: data?.status || fallback.status || "DEMO",
    licenseType: data?.licenseType || fallback.licenseType || "DEMO",
    activationDate: data?.activationDate ? new Date(data.activationDate) : fallback.activationDate || now,
    expirationDate: data?.expirationDate ? new Date(data.expirationDate) : fallback.expirationDate || null,
    lastValidation: now,
    offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
    licenseToken: data?.licenseToken ?? fallback.licenseToken ?? null,
  };
};

const getCurrentLicense = async () => {
  const installationHash = getTeamFingerprint();
  return prisma.license.findUnique({ where: { installationHash } });
};

const upsertLocalLicense = async (installationHash, remoteData, existing) => {
  const mapped = mapRemoteToLocal(remoteData, existing || {});

  if (existing) {
    return prisma.license.update({ where: { id: existing.id }, data: mapped });
  }

  return prisma.license.create({ data: { installationHash, ...mapped } });
};

const registerLicense = async ({ nit }) => {
  if (!nit) {
    throw new ApiError(400, "nit is required");
  }

  const baseUrl = assertServerUrl();
  const installationHash = getTeamFingerprint();
  const existing = await prisma.license.findUnique({ where: { installationHash } });

  const payload = buildCentralPayload(nit, installationHash);
  console.info("[License] Registering online against DocuCloud", { nit, installationHash });

  const response = await fetch(`${baseUrl}/api/licencias/activar-online`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[License] Online register failed", { status: response.status, body: text });
    throw new ApiError(502, "Failed to register license with DocuCloud", { status: response.status });
  }

  const remoteData = await response.json();
  return upsertLocalLicense(installationHash, remoteData, existing);
};

const validateWithCentralServer = async (license) => {
  if (!license) {
    throw new ApiError(404, "No local cached license found. Register license first.");
  }

  const baseUrl = assertServerUrl();
  const now = new Date();
  const payload = buildCentralPayload(license.nit, license.installationHash);

  try {
    const response = await fetch(`${baseUrl}/api/licencias/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[License] Validation failed", { status: response.status, body: text });
      throw new Error(`Validation failed with status ${response.status}`);
    }

    const remoteData = await response.json();
    return upsertLocalLicense(license.installationHash, remoteData, license);
  } catch (error) {
    console.warn("[License] DocuCloud unavailable, switching to offline fallback", {
      message: error.message,
      installationHash: license.installationHash,
    });

    if (license.offlineGraceUntil && now <= new Date(license.offlineGraceUntil)) {
      return prisma.license.update({
        where: { id: license.id },
        data: { lastValidation: now },
      });
    }

    return prisma.license.update({
      where: { id: license.id },
      data: { status: "BLOCKED", lastValidation: now },
    });
  }
};

const activateLicense = async ({ token }) => {
  // TODO: Integrate manual token activation flow with DocuCloud endpoint when available.
  if (!token) {
    throw new ApiError(400, "License token is required");
  }

  throw new ApiError(501, "Manual token activation is not implemented yet");
};

const initializeLicense = async () => {
  const installationHash = getTeamFingerprint();
  const local = await prisma.license.findUnique({ where: { installationHash } });

  if (!local) {
    const defaultNit = process.env.LICENSE_DEFAULT_NIT;
    if (!defaultNit) {
      console.warn("[License] No local license and LICENSE_DEFAULT_NIT is not configured");
      return null;
    }

    try {
      return await registerLicense({ nit: defaultNit });
    } catch (error) {
      console.error("[License] Startup register failed", { message: error.message });
      return null;
    }
  }

  try {
    return await validateWithCentralServer(local);
  } catch (error) {
    console.error("[License] Startup validation failed", { message: error.message });
    return local;
  }
};

export const licenseService = {
  getCurrentLicense,
  registerLicense,
  validateWithCentralServer,
  activateLicense,
  initializeLicense,
};
