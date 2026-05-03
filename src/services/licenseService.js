import crypto from "crypto";
import os from "os";
import fs from "fs";
import path from "path";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import prismaPkg from "@prisma/client";

const LicenseStatus = prismaPkg.LicenseStatus || prismaPkg.$Enums?.LicenseStatus || {
  PENDING_ACTIVATION: "PENDING_ACTIVATION",
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
};

const LicenseType = prismaPkg.LicenseType || prismaPkg.$Enums?.LicenseType || {
  DEMO: "DEMO",
  ANNUAL: "ANNUAL",
  PERMANENT: "PERMANENT",
};

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
  pending_activation: LicenseStatus.PENDING_ACTIVATION,
  pendiente_activacion: LicenseStatus.PENDING_ACTIVATION,
  activa: LicenseStatus.ACTIVE,
  active: LicenseStatus.ACTIVE,
  bloqueada: LicenseStatus.BLOCKED,
  blocked: LicenseStatus.BLOCKED,
  expirada: LicenseStatus.BLOCKED,
  expired: LicenseStatus.BLOCKED,
};

const TYPE_MAP = {
  demo: LicenseType.DEMO,
  anual: "ANNUAL",
  annual: "ANNUAL",
  permanente: "PERMANENT",
  permanent: "PERMANENT",
};

const normalizeEnum = (value, mapping, fallback = null) => {
  if (!value || typeof value !== "string") return fallback;
  return mapping[value.trim().toLowerCase()] || fallback;
};

const isValidEnum = (value, enumObject) => Object.values(enumObject).includes(value);

const normalizeStatus = (value, fallback = LicenseStatus.PENDING_ACTIVATION) => {
  const normalized = normalizeEnum(value, STATUS_MAP, fallback);
  return isValidEnum(normalized, LicenseStatus) ? normalized : fallback;
};

const normalizeLicenseType = (value, fallback = LicenseType.DEMO) => {
  const normalized = normalizeEnum(value, TYPE_MAP, fallback);
  return isValidEnum(normalized, LicenseType) ? normalized : fallback;
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

const logFlow = ({ dbLicense, nit, installationHash, source }) => {
  console.log("[LICENSE FLOW] step:", {
    hasDb: !!dbLicense,
    nit: nit || null,
    installationHash,
    source,
  });
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


const isInvalidInstallationError = (error) => {
  const body = error?.details?.body;
  if (!body) return false;

  try {
    const parsed = JSON.parse(body);
    return parsed?.error === "instalacion_invalida";
  } catch {
    return false;
  }
};

const bootstrapLicenseInstallation = async (nit, installationHash) => {
  if (!nit) {
    return null;
  }

  logFlow({ dbLicense: null, nit, installationHash, source: "docucloud" });
  await postDocuCloud("/api/licencias/activar-online", buildCentralPayload(nit, installationHash));
  const docuCloudData = await postDocuCloud("/api/licencias/validar", buildCentralPayload(nit, installationHash));
  return docuCloudData;
};

const buildLicenseResponse = (dbLicense, docuCloudData, offlineMode = false) => {
  const status = normalizeStatus(docuCloudData?.estado, dbLicense?.status || LicenseStatus.PENDING_ACTIVATION);
  const safeStatus = isValidEnum(status, LicenseStatus) ? status : LicenseStatus.PENDING_ACTIVATION;
  const licenseType = normalizeLicenseType(docuCloudData?.tipo_licencia, dbLicense?.licenseType || LicenseType.DEMO);

  const response = {
    nit: docuCloudData?.nit || dbLicense?.nit || "",
    status: safeStatus,
    licenseType,
    applicationName: docuCloudData?.app || APP_NAME,
    version: docuCloudData?.version ?? null,
    activationDate: docuCloudData?.activada_en ? new Date(docuCloudData.activada_en) : dbLicense?.activationDate || null,
    expirationDate: docuCloudData?.expira ? new Date(docuCloudData.expira) : dbLicense?.expirationDate || null,
    daysRemaining: docuCloudData?.dias_restantes ?? null,
    installationHash: docuCloudData?.instalacion_hash || dbLicense?.installationHash || "",
    lastValidationAt: new Date(),
    offlineMode: Boolean(offlineMode),
  };

  if (!response.status || !isValidEnum(response.status, LicenseStatus)) {
    response.status = LicenseStatus.PENDING_ACTIVATION;
  }

  return response;
};

const persistLicenseCache = async (dbLicense, response, docuCloudData) => {
  const safeStatus = isValidEnum(response.status, LicenseStatus) ? response.status : LicenseStatus.BLOCKED;
  const safeLicenseType = isValidEnum(response.licenseType, LicenseType) ? response.licenseType : LicenseType.DEMO;

  const data = {
    nit: response.nit,
    status: safeStatus,
    licenseType: safeLicenseType,
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


const ensureLocalBootstrapLicense = async () => {
  const installationHash = getTeamFingerprint();
  const existing = await prisma.license.findUnique({ where: { installationHash } });
  if (existing) return existing;

  const now = new Date();
  return prisma.license.create({
    data: {
      nit: process.env.LICENSE_DEFAULT_NIT || "",
      status: normalizeStatus(null, LicenseStatus.PENDING_ACTIVATION),
      licenseType: LicenseType.DEMO,
      installationHash,
      activationDate: now,
      expirationDate: null,
      lastValidation: now,
      offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
    },
  });
};

const getCurrentLicense = async () => {
  const installationHash = getTeamFingerprint();
  return prisma.license.findUnique({ where: { installationHash } });
};

const syncLicenseWithDocuCloud = async (dbLicense, fallbackNit) => {
  const installationHash = dbLicense?.installationHash || getTeamFingerprint();
  const nit = dbLicense?.nit || process.env.LICENSE_DEFAULT_NIT || fallbackNit;
  if (!nit) {
    logFlow({ dbLicense, nit, installationHash, source: "fallback" });
    return null;
  }

  try {
    logFlow({ dbLicense, nit, installationHash, source: "docucloud" });
    const payload = buildCentralPayload(nit, installationHash);
    const docuCloudData = await postDocuCloud("/api/licencias/validar", payload);
    const response = buildLicenseResponse({ ...dbLicense, nit, installationHash }, docuCloudData, false);
    await persistLicenseCache(dbLicense, response, docuCloudData);
    return response;
  } catch (error) {
    if (isInvalidInstallationError(error)) {
      const bootstrapped = await bootstrapLicenseInstallation(nit, installationHash);
      if (bootstrapped) {
        const response = buildLicenseResponse({ ...dbLicense, nit, installationHash }, bootstrapped, false);
        await persistLicenseCache(dbLicense, response, bootstrapped);
        return response;
      }
    }
    throw error;
  }
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
    const synced = await syncLicenseWithDocuCloud(dbLicense, process.env.LICENSE_DEFAULT_NIT);
    if (synced) return synced;
    if (!dbLicense) return buildDemoFallback(getTeamFingerprint());
  } catch (error) {
    if (!dbLicense) throw error;

    const now = new Date();
    const offlineValid = dbLicense.offlineGraceUntil && now <= new Date(dbLicense.offlineGraceUntil);

    if (offlineValid) {
      const saved = await prisma.license.update({ where: { id: dbLicense.id }, data: { lastValidation: now } });
      const cachedRaw = saved.licenseToken ? JSON.parse(saved.licenseToken) : null;
      return buildLicenseResponse(saved, cachedRaw, true);
    }

    const blocked = await prisma.license.update({ where: { id: dbLicense.id }, data: { status: LicenseStatus.BLOCKED, lastValidation: now } });
    logFlow({ dbLicense: blocked, nit: blocked.nit, installationHash: blocked.installationHash, source: "db" });
    const cachedRaw = blocked.licenseToken ? JSON.parse(blocked.licenseToken) : null;
    return buildLicenseResponse({ ...blocked, status: LicenseStatus.BLOCKED }, cachedRaw, true);
  }
};


const buildDemoFallback = (installationHash) => ({
  nit: process.env.LICENSE_DEFAULT_NIT || "",
  status: normalizeStatus(null, LicenseStatus.PENDING_ACTIVATION),
  licenseType: LicenseType.DEMO,
  applicationName: APP_NAME,
  version: null,
  activationDate: null,
  expirationDate: null,
  daysRemaining: null,
  installationHash,
  lastValidationAt: new Date(),
  offlineMode: false,
});

const getLicenseStatusSynced = async () => {
  const installationHash = getTeamFingerprint();
  let dbLicense = await prisma.license.findUnique({ where: { installationHash } });

  if (!dbLicense) {
    dbLicense = await ensureLocalBootstrapLicense();
    console.log("[LICENSE FLOW] state=PENDING_ACTIVATION");
    return {
      ...buildLicenseResponse(dbLicense, null, false),
      message: "Debe ingresar NIT para activar licencia",
    };
  }

  if (!dbLicense.nit || dbLicense.nit.trim() === "") {
    console.log("[LICENSE FLOW] state=PENDING_ACTIVATION");
    return {
      ...buildLicenseResponse({ ...dbLicense, status: LicenseStatus.PENDING_ACTIVATION }, null, false),
      message: "Debe ingresar NIT para activar licencia",
    };
  }

  if (dbLicense.status === LicenseStatus.PENDING_ACTIVATION) {
    console.log("[LICENSE FLOW] state=PENDING_ACTIVATION");
    return {
      ...buildLicenseResponse(dbLicense, null, false),
      message: "Debe ingresar NIT para activar licencia",
    };
  }

  try {
    const synced = await syncLicenseWithDocuCloud(dbLicense, process.env.LICENSE_DEFAULT_NIT);
    if (synced) {
      console.log("[LICENSE FLOW] state=ACTIVE");
      return synced;
    }
  } catch (error) {
    const now = new Date();
    const offlineValid = dbLicense.offlineGraceUntil && now <= new Date(dbLicense.offlineGraceUntil);
    if (offlineValid) {
      const saved = await prisma.license.update({ where: { id: dbLicense.id }, data: { lastValidation: now } });
      const cachedRaw = saved.licenseToken ? JSON.parse(saved.licenseToken) : null;
      return buildLicenseResponse(saved, cachedRaw, true);
    }

    const blocked = await prisma.license.update({ where: { id: dbLicense.id }, data: { status: LicenseStatus.BLOCKED, lastValidation: now } });
    const cachedRaw = blocked.licenseToken ? JSON.parse(blocked.licenseToken) : null;
    return buildLicenseResponse({ ...blocked, status: LicenseStatus.BLOCKED }, cachedRaw, true);
  }

  return buildLicenseResponse(dbLicense, null, false);
};

const activateLicense = async ({ nit }) => {
  if (!nit || !nit.trim()) throw new ApiError(400, "NIT is required for activation");
  const installationHash = getTeamFingerprint();
  const dbLicense = await ensureLocalBootstrapLicense();
  console.log("[LICENSE FLOW] state=ACTIVATING");
  const docuCloudData = await postDocuCloud("/api/licencias/activar-online", buildCentralPayload(nit.trim(), installationHash));
  const response = buildLicenseResponse({ ...dbLicense, nit: nit.trim(), status: LicenseStatus.ACTIVE }, docuCloudData, false);
  await persistLicenseCache(dbLicense, response, docuCloudData);
  console.log("[LICENSE FLOW] state=ACTIVE");
  return response;
};

const initializeLicense = async () => {
  const dbLicense = await ensureLocalBootstrapLicense();
  if (!dbLicense.nit || dbLicense.status === LicenseStatus.PENDING_ACTIVATION) {
    console.log("[LICENSE FLOW] state=PENDING_ACTIVATION");
    return buildLicenseResponse(dbLicense, null, false);
  }
  validateWithCentralServer(dbLicense).catch((error) => {
    console.error("[LICENSE FLOW] startup sync failed", { message: error.message });
  });
  return buildLicenseResponse(dbLicense, null, false);
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
