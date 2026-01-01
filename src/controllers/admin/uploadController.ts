import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Extend Express Request to include multer properties
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = uniqueSuffix + ext;
        cb(null, filename);
    }
});

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
        if (!multerReq.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const fileUrl = `/uploads/${multerReq.file.filename}`;

        res.status(200).json({
            success: true,
            url: fileUrl,
            filename: multerReq.file.filename,
            mimetype: multerReq.file.mimetype,
            size: multerReq.file.size
        });

    } catch (error: any) {
        console.error('Upload Controller Error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
};
