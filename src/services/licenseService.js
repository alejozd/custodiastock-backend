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
  expirada: "BLOCKED",
  expired: "BLOCKED",
};

const TYPE_MAP = {
  demo: "DEMO",
  anual: "ANNUAL",
  annual: "ANNUAL",
  permanente: "PERMANENT",
  permanent: "PERMANENT",
};

const normalizeEnum = (value, mapping, fallback = null) => {
  if (!value || typeof value !== "string") return fallback;
  return mapping[value.trim().toLowerCase()] || fallback;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getTeamFingerprint = () => {
  const networkInfo = os.networkInterfaces();
  const macs = Object.values(networkInfo).flat().filter(Boolean).map((item) => item.mac).filter(Boolean).sort();
  const payload = [os.hostname(), os.platform(), os.arch(), ...macs].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const buildCentralPayload = (nit, installationHash) => ({ nit, app: APP_NAME, instalacion_hash: installationHash });
const getServerUrl = () => (process.env.LICENSE_SERVER_URL || DOCUCLOUD_URL).replace(/\/$/, "");

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

const buildLicenseResponse = (dbLicense, docuCloudData, offlineMode = false) => {
  const status = normalizeEnum(docuCloudData?.estado, STATUS_MAP, dbLicense?.status || "BLOCKED");
  const licenseType = normalizeEnum(docuCloudData?.tipo_licencia, TYPE_MAP, dbLicense?.licenseType || "DEMO");

  return {
    nit: docuCloudData?.nit || dbLicense?.nit || "",
    status,
    licenseType,
    applicationName: docuCloudData?.app || APP_NAME,
    version: docuCloudData?.version ?? null,
    activationDate: docuCloudData?.activada_en ? new Date(docuCloudData.activada_en) : dbLicense?.activationDate || null,
    expirationDate: docuCloudData?.expira ? new Date(docuCloudData.expira) : dbLicense?.expirationDate || null,
    daysRemaining: docuCloudData?.dias_restantes ?? null,
    installationHash: docuCloudData?.instalacion_hash || dbLicense?.installationHash || "",
    lastValidationAt: new Date(),
    offlineMode,
  };
};

const persistLicenseCache = async (dbLicense, response, docuCloudData) => {
  const data = {
    nit: response.nit,
    status: response.status,
    licenseType: response.licenseType,
    activationDate: response.activationDate,
    expirationDate: response.expirationDate,
    installationHash: response.installationHash,
    lastValidation: response.lastValidationAt,
    offlineGraceUntil: addDays(response.lastValidationAt, OFFLINE_GRACE_DAYS),
    licenseToken: JSON.stringify(docuCloudData || {}),
  };

  if (dbLicense) return prisma.license.update({ where: { id: dbLicense.id }, data });
  return prisma.license.create({ data });
};

const getCurrentLicense = async () => {
  const installationHash = getTeamFingerprint();
  return prisma.license.findUnique({ where: { installationHash } });
};

const syncLicenseWithDocuCloud = async (dbLicense) => {
  if (!dbLicense) throw new ApiError(404, "No local cached license found. Register license first.");

  const payload = buildCentralPayload(dbLicense.nit, dbLicense.installationHash);
  const docuCloudData = await postDocuCloud("/api/licencias/validar", payload);
  const response = buildLicenseResponse(dbLicense, docuCloudData, false);
  await persistLicenseCache(dbLicense, response, docuCloudData);
  return response;
};

const registerLicense = async ({ nit }) => {
  if (!nit) throw new ApiError(400, "nit is required");
  const installationHash = getTeamFingerprint();
  const dbLicense = await prisma.license.findUnique({ where: { installationHash } });
  const payload = buildCentralPayload(nit, installationHash);
  const docuCloudData = await postDocuCloud("/api/licencias/activar-online", payload);
  const response = buildLicenseResponse({ ...dbLicense, nit, installationHash }, docuCloudData, false);
  await persistLicenseCache(dbLicense, response, docuCloudData);
  return response;
};

const validateWithCentralServer = async (dbLicense) => {
  try {
    return await syncLicenseWithDocuCloud(dbLicense);
  } catch (error) {
    if (!dbLicense) throw error;

    const now = new Date();
    const offlineValid = dbLicense.offlineGraceUntil && now <= new Date(dbLicense.offlineGraceUntil);

    if (offlineValid) {
      const saved = await prisma.license.update({ where: { id: dbLicense.id }, data: { lastValidation: now } });
      const cachedRaw = saved.licenseToken ? JSON.parse(saved.licenseToken) : null;
      return buildLicenseResponse(saved, cachedRaw, true);
    }

    const blocked = await prisma.license.update({ where: { id: dbLicense.id }, data: { status: "BLOCKED", lastValidation: now } });
    const cachedRaw = blocked.licenseToken ? JSON.parse(blocked.licenseToken) : null;
    return buildLicenseResponse({ ...blocked, status: "BLOCKED" }, cachedRaw, true);
  }
};

const getLicenseStatusSynced = async () => {
  const dbLicense = await getCurrentLicense();
  return validateWithCentralServer(dbLicense);
};

const activateLicense = async ({ token }) => {
  if (!token) throw new ApiError(400, "License token is required");
  throw new ApiError(501, "Manual token activation is not implemented yet");
};

const initializeLicense = async () => {
  const dbLicense = await getCurrentLicense();
  if (!dbLicense) {
    const defaultNit = process.env.LICENSE_DEFAULT_NIT;
    if (!defaultNit) return null;
    return registerLicense({ nit: defaultNit });
  }

  return validateWithCentralServer(dbLicense);
};

export const licenseService = {
  buildLicenseResponse,
  getCurrentLicense,
  getLicenseStatusSynced,
  syncLicenseWithDocuCloud,
  registerLicense,
  validateWithCentralServer,
  activateLicense,
  initializeLicense,
};
