import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Extend Express Request to include multer properties
interface MulterRequest extends Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

import { storage } from '../../config/cloudinary';

// Init Multer
export const uploadMiddleware = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and PDFs are allowed') as any, false);
        }
    }
});

export const uploadFile = (req: Request, res: Response) => {
    try {
        const multerReq = req as MulterRequest;

        let files: Express.Multer.File[] = [];
        if (multerReq.files) {
            if (Array.isArray(multerReq.files)) {
                files = multerReq.files;
            } else {
                // files is a dictionary of arrays
                Object.values(multerReq.files).forEach(fileArray => {
                    files.push(...fileArray);
                });
            }
        } else if (multerReq.file) {
            files = [multerReq.file];
        }

        if (files.length === 0) {
            res.status(400).json({ error: 'No files uploaded' });
            return;
        }

        const uploadedFiles = files.map(file => {
            // multer-storage-cloudinary provides the secure_url or path in the file object
            const fileUrl = (file as any).path || (file as any).secure_url;
            return {
                url: fileUrl,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.size
            };
        });

        res.status(200).json({
            success: true,
            files: uploadedFiles,
            // Maintain backward compatibility for single upload if needed
            url: uploadedFiles[0].url,
            filename: uploadedFiles[0].filename,
            mimetype: uploadedFiles[0].mimetype,
            size: uploadedFiles[0].size
        });

    } catch (error: any) {
        console.error('Upload Controller Error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
};
