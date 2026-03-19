import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes         from './routes/auth.routes';
import bookRoutes         from './routes/book.routes';
import bookCopyRoutes     from './routes/bookCopy.routes';
import borrowRoutes       from './routes/borrow.routes';
import categoryRoutes     from './routes/category.routes';
import exportRoutes       from './routes/export.routes';
import notificationRoutes from './routes/notification.routes';
import qrRoutes           from './routes/qr.routes';
import userRoutes         from './routes/user.routes';
import visitRoutes        from './routes/visit.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Static files — gambar cover buku
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/books',         bookRoutes);
app.use('/api/book-copies',   bookCopyRoutes);
app.use('/api/borrow',        borrowRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/export',        exportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/qr',            qrRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/visits',        visitRoutes);

app.get('/', (_, res) => {
    res.json({ message: 'API Sistem Peminjaman Buku berjalan 🚀' });
});

export default app;
