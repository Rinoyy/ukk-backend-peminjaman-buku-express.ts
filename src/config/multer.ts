import multer from 'multer';
import path from 'path';

/** Konfigurasi penyimpanan file upload ke folder /uploads */
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `book-${uniqueSuffix}${ext}`);
    }
});

/** Instance multer untuk upload gambar buku (maks. 5MB, hanya jpeg/jpg/png/webp/gif) */
export const uploadImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
