import crypto from "crypto";
import os from "os";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const OFFLINE_GRACE_DAYS = 7;
const APP_NAME = "CustodiaStock";
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

const normalizeEnum = (value, mapping) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  return mapping[value.trim().toLowerCase()] || null;
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
});

const getServerUrl = () => (process.env.LICENSE_SERVER_URL || DOCUCLOUD_URL).replace(/\/$/, "");

const normalizeDocuCloudResponse = (remoteData, licenseCtx) => {
  const status = normalizeEnum(remoteData?.estado, STATUS_MAP);
  const licenseType = normalizeEnum(remoteData?.tipo_licencia, TYPE_MAP);

  if (!status || !licenseType) {
    throw new ApiError(502, "DocuCloud returned unsupported license fields", {
      estado: remoteData?.estado,
      tipo_licencia: remoteData?.tipo_licencia,
    });
  }

  const now = new Date();

  return {
    nit: remoteData?.nit || licenseCtx.nit,
    status,
    licenseType,
    activationDate: remoteData?.activada_en ? new Date(remoteData.activada_en) : null,
    expirationDate: remoteData?.expira ? new Date(remoteData.expira) : null,
    daysRemaining: remoteData?.dias_restantes ?? null,
    installationHash: remoteData?.instalacion_hash || licenseCtx.installationHash,
    lastValidation: now,
    offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
    version: remoteData?.version ?? null,
    raw: remoteData,
  };
};

const getCurrentLicense = async () => {
  const installationHash = getTeamFingerprint();
  return prisma.license.findUnique({ where: { installationHash } });
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

const persistSyncedLicense = async (localLicense, normalized) => {
  const cachePayload = {
    daysRemaining: normalized.daysRemaining,
    version: normalized.version,
    raw: normalized.raw,
  };

  const data = {
    nit: normalized.nit,
    status: normalized.status,
    licenseType: normalized.licenseType,
    activationDate: normalized.activationDate,
    expirationDate: normalized.expirationDate,
    installationHash: normalized.installationHash,
    lastValidation: normalized.lastValidation,
    offlineGraceUntil: normalized.offlineGraceUntil,
    licenseToken: JSON.stringify(cachePayload),
  };

  return localLicense
    ? prisma.license.update({ where: { id: localLicense.id }, data })
    : prisma.license.create({ data });
};

const buildStatusResponse = (record) => {
  const cached = record.licenseToken ? JSON.parse(record.licenseToken) : {};
  return {
    id: record.id,
    nit: record.nit,
    installationHash: record.installationHash,
    status: record.status,
    licenseType: record.licenseType,
    activationDate: record.activationDate,
    expirationDate: record.expirationDate,
    daysRemaining: cached.daysRemaining ?? null,
    version: cached.version ?? null,
    lastValidation: record.lastValidation,
    offlineGraceUntil: record.offlineGraceUntil,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
};

const registerLicense = async ({ nit }) => {
  if (!nit) throw new ApiError(400, "nit is required");
  const installationHash = getTeamFingerprint();
  const local = await prisma.license.findUnique({ where: { installationHash } });
  const payload = buildCentralPayload(nit, installationHash);
  const remoteData = await postDocuCloud("/api/licencias/activar-online", payload);
  const normalized = normalizeDocuCloudResponse(remoteData, { nit, installationHash });
  const saved = await persistSyncedLicense(local, normalized);
  return buildStatusResponse(saved);
};

const validateWithCentralServer = async (license) => {
  if (!license) throw new ApiError(404, "No local cached license found. Register license first.");

  try {
    const payload = buildCentralPayload(license.nit, license.installationHash);
    const remoteData = await postDocuCloud("/api/licencias/validar", payload);
    const normalized = normalizeDocuCloudResponse(remoteData, license);
    const saved = await persistSyncedLicense(license, normalized);
    return buildStatusResponse(saved);
  } catch (error) {
    const now = new Date();
    if (license.offlineGraceUntil && now <= new Date(license.offlineGraceUntil)) {
      const saved = await prisma.license.update({ where: { id: license.id }, data: { lastValidation: now } });
      return buildStatusResponse(saved);
    }

    const blocked = await prisma.license.update({
      where: { id: license.id },
      data: { status: "BLOCKED", lastValidation: now },
    });
    return buildStatusResponse(blocked);
  }
};

const getLicenseStatusSynced = async () => {
  const localLicense = await getCurrentLicense();
  if (!localLicense) throw new ApiError(404, "No local cached license found. Register license first.");
  return validateWithCentralServer(localLicense);
};

const activateLicense = async ({ token }) => {
  if (!token) throw new ApiError(400, "License token is required");
  throw new ApiError(501, "Manual token activation is not implemented yet");
};

const initializeLicense = async () => {
  const installationHash = getTeamFingerprint();
  const local = await prisma.license.findUnique({ where: { installationHash } });
  if (!local) {
    const defaultNit = process.env.LICENSE_DEFAULT_NIT;
    if (!defaultNit) return null;
    try {
      return await registerLicense({ nit: defaultNit });
    } catch {
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
