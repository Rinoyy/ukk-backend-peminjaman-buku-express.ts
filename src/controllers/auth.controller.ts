import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma'; // adjust path
import { generateQRCode } from '../utils/qr';

const SECRET_KEY = process.env.JWT_SECRET || 'secret';

export const register = async (req: Request, res: Response): Promise<void> => {
    const { username, password, role } = req.body;

    // 1. Restriction Checks
    if (role === 'ADMIN') {
        res.status(403).json({ message: 'Cannot register as ADMIN manually.' });
        return;
    }

    // Only SISWA is allowed for public registration
    if (role !== 'SISWA') {
        res.status(400).json({ message: 'Invalid role for registration.' });
        return;
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            res.status(400).json({ message: 'Username already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Initial user creation to get ID
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role,
            },
        });

        // Generate specific QR Data: userID-role-timestamp
        const qrData = JSON.stringify({
            id: user.id,
            role: user.role,
            username: user.username,
            valid: true
        });

        const qrCodeImage = await generateQRCode(qrData);

        // Update user with QR Code
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { qrCode: qrCodeImage },
        });

        res.status(201).json({ message: 'User registered successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
};
