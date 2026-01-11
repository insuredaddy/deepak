import multer from "multer";
import { config } from "../config";

export const uploadMiddleware = multer({
    dest: config.upload.uploadDir,
    limits: {
        fileSize: config.upload.maxFileSize,
    },
    fileFilter: (_req, file, cb) => {
        if (config.upload.allowedMimeTypes.includes(file.mimetype as "application/pdf" | "image/png" | "image/jpeg" | "text/plain")) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    },
});
