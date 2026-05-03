import { licenseService } from "../services/licenseService.js";

export const getLicenseStatus = async (req, res) => {
  const license = await licenseService.getLicenseStatusSynced();
  res.json(license);
};

export const registerLicense = async (req, res) => {
  const license = await licenseService.registerLicense(req.body || {});
  res.status(201).json(license);
};

export const validateLicense = async (req, res) => {
  const current = await licenseService.getCurrentLicense();
  const license = await licenseService.validateWithCentralServer(current);
  res.json(license);
};

export const activateLicense = async (req, res) => {
  const license = await licenseService.activateLicense(req.body || {});
  res.json(license);
};
