import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (_req: any, file: any) => {
        return {
            folder: 'sala_assets',
            format: 'webp', // Convert all images to webp for better performance
            public_id: Date.now() + '-' + file.originalname.split('.')[0],
        };
    },
});

export default cloudinary;
