import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.routes';
import bookRoutes from './routes/book.routes';
import borrowRoutes from './routes/borrow.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import visitRoutes from './routes/visit.routes';
import bookCopyRoutes from './routes/bookCopy.routes';
import qrRoutes from './routes/qr';
import exportRoutes from './routes/export.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded files (book images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/copies', bookCopyRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('QR Backend is running 🚀');
});

import { initCronJobs } from './cron';

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  initCronJobs();
});
