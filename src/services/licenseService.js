import crypto from "crypto";
import os from "os";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import pkg from "../../package.json" with { type: "json" };

const OFFLINE_GRACE_DAYS = 7;
const APP_NAME = "CustodiaStock";
const APP_VERSION = pkg.version || "unknown";
const DOCUCLOUD_URL = "https://api.zdevs.uk";

const STATUS_MAP = {
  demo: "DEMO",
  activa: "ACTIVE",
  active: "ACTIVE",
  bloqueada: "BLOCKED",
  blocked: "BLOCKED",
  expirada: "EXPIRED",
  expired: "EXPIRED",
};

const TYPE_MAP = {
  demo: "DEMO",
  anual: "ANNUAL",
  annual: "ANNUAL",
  permanente: "PERMANENT",
  permanent: "PERMANENT",
};

const normalizeEnum = (value, mapping, fallback) => {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const normalized = mapping[value.trim().toLowerCase()];
  if (!normalized) {
    console.warn("[License] Unknown enum value from DocuCloud", { value, fallback });
    return fallback;
  }

  return normalized;
};

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

const getServerUrl = () => (process.env.LICENSE_SERVER_URL || DOCUCLOUD_URL).replace(/\/$/, "");

const normalizeDocuCloudData = (remoteData, fallback = {}) => {
  const now = new Date();
  return {
    nit: remoteData?.nit || fallback.nit,
    status: normalizeEnum(remoteData?.estado, STATUS_MAP, fallback.status || "DEMO"),
    licenseType: normalizeEnum(remoteData?.tipo_licencia, TYPE_MAP, fallback.licenseType || "DEMO"),
    expirationDate: remoteData?.expira ? new Date(remoteData.expira) : fallback.expirationDate || null,
    daysRemaining: remoteData?.dias_restantes,
    installationHash: remoteData?.instalacion_hash || fallback.installationHash,
    lastValidation: now,
    offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
  };
};

const getCurrentLicense = async () => {
  const installationHash = getTeamFingerprint();
  return prisma.license.findUnique({ where: { installationHash } });
};

const upsertFromDocuCloud = async (localLicense, remoteData, fallbackNit) => {
  const normalized = normalizeDocuCloudData(remoteData, localLicense || {});
  const installationHash = normalized.installationHash || getTeamFingerprint();

  const data = {
    nit: normalized.nit || fallbackNit || "PENDING",
    status: normalized.status,
    licenseType: normalized.licenseType,
    expirationDate: normalized.expirationDate,
    lastValidation: normalized.lastValidation,
    offlineGraceUntil: normalized.offlineGraceUntil,
  };

  const local = localLicense || (await prisma.license.findUnique({ where: { installationHash } }));

  const saved = local
    ? await prisma.license.update({ where: { id: local.id }, data })
    : await prisma.license.create({
        data: {
          installationHash,
          activationDate: new Date(),
          ...data,
        },
      });

  return {
    ...saved,
    daysRemaining: normalized.daysRemaining,
  };
};

const postDocuCloud = async (path, payload) => {
  const response = await fetch(`${getServerUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, `DocuCloud request failed: ${response.status}`, { body });
  }

  return response.json();
};

const registerLicense = async ({ nit }) => {
  if (!nit) {
    throw new ApiError(400, "nit is required");
  }

  const installationHash = getTeamFingerprint();
  const payload = buildCentralPayload(nit, installationHash);
  const remoteData = await postDocuCloud("/api/licencias/activar-online", payload);
  const local = await prisma.license.findUnique({ where: { installationHash } });

  return upsertFromDocuCloud(local, remoteData, nit);
};

const validateWithCentralServer = async (license) => {
  if (!license) {
    throw new ApiError(404, "No local cached license found. Register license first.");
  }

  const now = new Date();

  try {
    const payload = buildCentralPayload(license.nit, license.installationHash);
    const remoteData = await postDocuCloud("/api/licencias/validar", payload);
    return upsertFromDocuCloud(license, remoteData);
  } catch (error) {
    console.warn("[License] DocuCloud unavailable, using local offline cache", { message: error.message });

    if (license.offlineGraceUntil && now <= new Date(license.offlineGraceUntil)) {
      const updated = await prisma.license.update({
        where: { id: license.id },
        data: { lastValidation: now },
      });
      return { ...updated, daysRemaining: null };
    }

    const blocked = await prisma.license.update({
      where: { id: license.id },
      data: { status: "BLOCKED", lastValidation: now },
    });

    return { ...blocked, daysRemaining: null };
  }
};

const getLicenseStatusSynced = async () => {
  const localLicense = await getCurrentLicense();

  if (!localLicense) {
    throw new ApiError(404, "No local cached license found. Register license first.");
  }

  return validateWithCentralServer(localLicense);
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

  return validateWithCentralServer(local);
};

export const licenseService = {
  getCurrentLicense,
  getLicenseStatusSynced,
  registerLicense,
  validateWithCentralServer,
  activateLicense,
  initializeLicense,
};
