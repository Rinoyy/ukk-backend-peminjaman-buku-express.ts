import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/register — daftar akun siswa (NISN) atau guru/staff (NIP)
router.post('/register', register);

// POST /api/auth/login — login semua role
router.post('/login', login);

export default router;
