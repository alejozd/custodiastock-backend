import crypto from "crypto";
import os from "os";
import fs from "fs";
import path from "path";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js";
import prismaPkg from "@prisma/client";

const LicenseStatus = prismaPkg.LicenseStatus || prismaPkg.$Enums?.LicenseStatus;
const LicenseType = prismaPkg.LicenseType || prismaPkg.$Enums?.LicenseType;

const OFFLINE_GRACE_DAYS = 7;
let installationHashLogged = false;
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
  bloqueado: LicenseStatus.BLOCKED,
  blocked: LicenseStatus.BLOCKED,
  expirada: LicenseStatus.BLOCKED,
  expired: LicenseStatus.BLOCKED,
  demo: LicenseStatus.ACTIVE,
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

const assertValidLicenseEnums = (data) => {
  const next = { ...data };
  const statusValid = isValidEnum(next.status, LicenseStatus);
  const typeValid = isValidEnum(next.licenseType, LicenseType);

  logger.debug("LICENSE", "ENUM FIX beforeSave", { status: next.status, licenseType: next.licenseType });

  if (!statusValid) {
    next.status = LicenseStatus.BLOCKED;
  }

  if (!typeValid) {
    next.licenseType = LicenseType.DEMO;
  }

  if (!statusValid || !typeValid) {
    logger.debug("LICENSE", "ENUM FIX corrected", { status: next.status, licenseType: next.licenseType });
    logger.debug("LICENSE", "ENUM FIX fallbackUsed");
  }

  return next;
};

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
  if (!installationHashLogged) {
    logger.debug("LICENSE", "INSTALLATION_HASH", { installationHash });
    installationHashLogged = true;
  }
  return installationHash;
};

const buildCentralPayload = (nit, installationHash) => ({ nit, app: APP_NAME, instalacion_hash: installationHash });
const getServerUrl = () => (process.env.LICENSE_SERVER_URL || DOCUCLOUD_URL).replace(/\/$/, "");

const logFlow = ({ dbLicense, nit, installationHash, source }) => {
  logger.info("LICENSE", "FLOW", {
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


const buildDocuCloudResponse = (dbLicense, docuCloudData, offlineMode = false) => {
  const response = {
    nit: docuCloudData?.nit ?? dbLicense?.nit ?? "",
    status: normalizeStatus(docuCloudData?.estado || docuCloudData?.status, LicenseStatus.PENDING_ACTIVATION),
    licenseType: normalizeLicenseType(docuCloudData?.tipo_licencia || docuCloudData?.licenseType, LicenseType.DEMO),
    applicationName: docuCloudData?.app || APP_NAME,
    version: docuCloudData?.version ?? null,
    activationDate: (docuCloudData?.activada_en || docuCloudData?.activationDate) ? new Date(docuCloudData.activada_en || docuCloudData.activationDate) : null,
    expirationDate: (docuCloudData?.expira || docuCloudData?.expirationDate) ? new Date(docuCloudData.expira || docuCloudData.expirationDate) : null,
    daysRemaining: docuCloudData?.dias_restantes ?? docuCloudData?.daysRemaining ?? null,
    installationHash: docuCloudData?.instalacion_hash || dbLicense?.installationHash || getTeamFingerprint(),
    lastValidationAt: new Date(),
    offlineMode: Boolean(offlineMode),
  };

  if (!isValidEnum(response.status, LicenseStatus)) {
    response.status = LicenseStatus.PENDING_ACTIVATION;
  }
  if (!isValidEnum(response.licenseType, LicenseType)) {
    response.licenseType = LicenseType.DEMO;
  }

  if (response.status === LicenseStatus.BLOCKED) {
    response.offlineMode = false;
  }

  return response;
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

  const data = assertValidLicenseEnums({
    nit: response.nit,
    status: safeStatus,
    licenseType: safeLicenseType,
    activationDate: response.activationDate,
    expirationDate: response.expirationDate,
    installationHash: response.installationHash,
    lastValidation: response.lastValidationAt,
    offlineGraceUntil: addDays(response.lastValidationAt, OFFLINE_GRACE_DAYS),
    licenseToken: JSON.stringify(docuCloudData || {}),
  });

  if (dbLicense) return prisma.license.update({ where: { id: dbLicense.id }, data });
  return prisma.license.create({ data });
};


const ensureLocalBootstrapLicense = async () => {
  const installationHash = getTeamFingerprint();
  const existing = await prisma.license.findUnique({ where: { installationHash } });
  if (existing) return existing;

  const now = new Date();
  const bootstrapData = assertValidLicenseEnums({
    nit: process.env.LICENSE_DEFAULT_NIT || "",
    status: LicenseStatus.PENDING_ACTIVATION,
    licenseType: LicenseType.DEMO,
    installationHash,
    activationDate: now,
    expirationDate: null,
    lastValidation: now,
    offlineGraceUntil: addDays(now, OFFLINE_GRACE_DAYS),
  });

  return prisma.license.create({ data: bootstrapData });
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
    const response = buildDocuCloudResponse({ ...dbLicense, nit, installationHash }, docuCloudData, false);
    logger.info("LICENSE", "SOURCE=DOCUCLOUD");
    if (response.status === LicenseStatus.BLOCKED) {
      logger.info("LICENSE", "state=BLOCKED from DocuCloud");
    }
    await persistLicenseCache(dbLicense, response, docuCloudData);
    return response;
  } catch (error) {
    if (isInvalidInstallationError(error)) {
      const bootstrapped = await bootstrapLicenseInstallation(nit, installationHash);
      if (bootstrapped) {
        const response = buildDocuCloudResponse({ ...dbLicense, nit, installationHash }, bootstrapped, false);
        logger.info("LICENSE", "SOURCE=DOCUCLOUD");
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
  const response = buildDocuCloudResponse({ ...dbLicense, nit, installationHash }, docuCloudData, false);
  logger.info("LICENSE", "SOURCE=DOCUCLOUD");
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
    if (error?.statusCode && error.statusCode !== 502) {
      throw error;
    }

    const now = new Date();
    const offlineValid = dbLicense.offlineGraceUntil && now <= new Date(dbLicense.offlineGraceUntil);

    if (offlineValid) {
      const saved = await prisma.license.update({ where: { id: dbLicense.id }, data: { lastValidation: now } });
      const cachedRaw = saved.licenseToken ? JSON.parse(saved.licenseToken) : null;
      logger.warn("LICENSE", "SOURCE=OFFLINE_MODE");
      return buildLicenseResponse(saved, cachedRaw, true);
    }

    const blocked = await prisma.license.update({ where: { id: dbLicense.id }, data: { status: LicenseStatus.BLOCKED, lastValidation: now } });
    logFlow({ dbLicense: blocked, nit: blocked.nit, installationHash: blocked.installationHash, source: "db" });
    const cachedRaw = blocked.licenseToken ? JSON.parse(blocked.licenseToken) : null;
    logger.info("LICENSE", "SOURCE=LOCAL_CACHE");
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
    logger.info("LICENSE", "state=PENDING_ACTIVATION");
    const response = buildLicenseResponse(dbLicense, null, false);
    if (!response.status) response.status = LicenseStatus.PENDING_ACTIVATION;
    return { ...response, message: "Debe ingresar NIT para activar licencia" };
  }

  if (!dbLicense.nit || dbLicense.nit.trim() === "") {
    logger.info("LICENSE", "state=PENDING_ACTIVATION");
    const response = buildLicenseResponse({ ...dbLicense, status: LicenseStatus.PENDING_ACTIVATION }, null, false);
    if (!response.status) response.status = LicenseStatus.PENDING_ACTIVATION;
    return { ...response, message: "Debe ingresar NIT para activar licencia" };
  }

  if (dbLicense.status === LicenseStatus.PENDING_ACTIVATION) {
    logger.info("LICENSE", "state=PENDING_ACTIVATION");
    const response = buildLicenseResponse(dbLicense, null, false);
    if (!response.status) response.status = LicenseStatus.PENDING_ACTIVATION;
    return { ...response, message: "Debe ingresar NIT para activar licencia" };
  }

  try {
    const synced = await syncLicenseWithDocuCloud(dbLicense, process.env.LICENSE_DEFAULT_NIT);
    if (synced) {
      logger.info("LICENSE", "state=ACTIVE");
      return synced;
    }
  } catch (error) {
    if (error?.statusCode && error.statusCode !== 502) {
      throw error;
    }
    const now = new Date();
    const offlineValid = dbLicense.offlineGraceUntil && now <= new Date(dbLicense.offlineGraceUntil);
    if (offlineValid) {
      const saved = await prisma.license.update({ where: { id: dbLicense.id }, data: { lastValidation: now } });
      const cachedRaw = saved.licenseToken ? JSON.parse(saved.licenseToken) : null;
      logger.warn("LICENSE", "SOURCE=OFFLINE_MODE");
      return buildLicenseResponse(saved, cachedRaw, true);
    }

    const blocked = await prisma.license.update({ where: { id: dbLicense.id }, data: { status: LicenseStatus.BLOCKED, lastValidation: now } });
    const cachedRaw = blocked.licenseToken ? JSON.parse(blocked.licenseToken) : null;
    logger.info("LICENSE", "SOURCE=LOCAL_CACHE");
    return buildLicenseResponse({ ...blocked, status: LicenseStatus.BLOCKED }, cachedRaw, true);
  }

  return buildLicenseResponse(dbLicense, null, false);
};

const activateLicense = async ({ nit }) => {
  if (!nit || !nit.trim()) throw new ApiError(400, "NIT is required for activation");
  const installationHash = getTeamFingerprint();
  const dbLicense = await ensureLocalBootstrapLicense();
  logger.info("LICENSE", "state=ACTIVATING");
  const docuCloudData = await postDocuCloud("/api/licencias/activar-online", buildCentralPayload(nit.trim(), installationHash));
  const response = buildDocuCloudResponse({ ...dbLicense, nit: nit.trim(), status: LicenseStatus.ACTIVE }, docuCloudData, false);
  logger.info("LICENSE", "SOURCE=DOCUCLOUD");
  await persistLicenseCache(dbLicense, response, docuCloudData);
  logger.info("LICENSE", "state=ACTIVE");
  return response;
};

const initializeLicense = async () => {
  const dbLicense = await ensureLocalBootstrapLicense();
  if (!dbLicense.nit || dbLicense.status === LicenseStatus.PENDING_ACTIVATION) {
    logger.info("LICENSE", "state=PENDING_ACTIVATION");
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
