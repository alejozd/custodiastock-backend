import fs from "fs";
import path from "path";
import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const uploadDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${timestamp}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const isXlsxName = file.originalname.toLowerCase().endsWith(".xlsx");
  const validMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ];

  if (!isXlsxName || !validMimeTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, "Only .xlsx files are allowed"));
  }

  return cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
