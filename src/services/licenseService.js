import crypto from "crypto";
import os from "os";
import fs from "fs";
import path from "path";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const OFFLINE_GRACE_DAYS = 7;
const APP_NAME = "CustodiaStock";
const DOCUCLOUD_URL = "https://api.zdevs.uk";

const LICENSE_DIR = path.join(os.homedir(), ".custodiastock");
const LICENSE_ID_PATH = path.join(LICENSE_DIR, "license.id");

const ensureLicenseId = () => {
  const deterministicSeed = [os.hostname(), os.platform(), os.arch()].join("|");
  const deterministicId = crypto.createHash("sha256").update(deterministicSeed).digest("hex");

  if (fs.existsSync(LICENSE_ID_PATH)) {
    const existing = fs.readFileSync(LICENSE_ID_PATH, "utf8").trim();
    if (/^[a-f0-9]{64}$/i.test(existing)) {
      return existing;
    }
  }

  fs.mkdirSync(LICENSE_DIR, { recursive: true });
  fs.writeFileSync(LICENSE_ID_PATH, deterministicId, { encoding: "utf8" });
  return deterministicId;
};

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
  const persistentId = ensureLicenseId();
  const installationHash = crypto.createHash("sha256").update(persistentId).digest("hex");
  console.log("LICENSE_INSTALLATION_HASH", installationHash);
  return installationHash;
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

const syncLicenseWithDocuCloud = async (dbLicense, fallbackNit) => {
  const installationHash = dbLicense?.installationHash || getTeamFingerprint();
  const nit = dbLicense?.nit || process.env.LICENSE_DEFAULT_NIT || fallbackNit;
  if (!nit) throw new ApiError(400, "No NIT available for DocuCloud validation");

  const payload = buildCentralPayload(nit, installationHash);
  const docuCloudData = await postDocuCloud("/api/licencias/validar", payload);
  const response = buildLicenseResponse({ ...dbLicense, nit, installationHash }, docuCloudData, false);
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
    return await syncLicenseWithDocuCloud(dbLicense, process.env.LICENSE_DEFAULT_NIT);
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


const buildDemoFallback = (installationHash) => ({
  nit: process.env.LICENSE_DEFAULT_NIT || "",
  status: "DEMO",
  licenseType: "DEMO",
  applicationName: APP_NAME,
  version: null,
  activationDate: null,
  expirationDate: null,
  daysRemaining: null,
  installationHash,
  lastValidationAt: new Date(),
  offlineMode: true,
});

const getLicenseStatusSynced = async () => {
  const installationHash = getTeamFingerprint();
  const dbLicense = await prisma.license.findUnique({ where: { installationHash } });

  // Prioridad 1: DocuCloud
  try {
    return await syncLicenseWithDocuCloud(dbLicense, process.env.LICENSE_DEFAULT_NIT);
  } catch (error) {
    // Prioridad 2: DB cache (si existe)
    if (dbLicense) {
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

    // Prioridad 3: Auto-register con LICENSE_DEFAULT_NIT
    if (process.env.LICENSE_DEFAULT_NIT) {
      try {
        return await registerLicense({ nit: process.env.LICENSE_DEFAULT_NIT });
      } catch {}
    }

    // Prioridad 4: DEMO fallback controlado
    return buildDemoFallback(installationHash);
  }
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
