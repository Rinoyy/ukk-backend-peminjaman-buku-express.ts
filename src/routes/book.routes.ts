import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getBooks, getBookById, createBook, updateBook, deleteBook } from '../controllers/book.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// Multer config for book images
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

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
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

router.get('/', authenticateJWT, getBooks);
router.get('/:id', authenticateJWT, getBookById);

// Admin Only - with optional image upload
router.post('/', authenticateJWT, authorizeRole(['ADMIN']), upload.single('image'), createBook);
router.put('/:id', authenticateJWT, authorizeRole(['ADMIN']), upload.single('image'), updateBook);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteBook);

export default router;
