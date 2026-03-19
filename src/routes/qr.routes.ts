import { Router } from 'express';
import QRCode from 'qrcode';

const router = Router();

// ── Public ───────────────────────────────────────────────────
// GET /api/qr?text=... — generate QR Code sebagai gambar PNG
router.get('/', async (req, res) => {
    const text = req.query.text as string;

    if (!text) {
        return res.status(400).json({ message: "Query 'text' wajib diisi" });
    }

    try {
        const qr = await QRCode.toBuffer(text);
        res.setHeader('Content-Type', 'image/png');
        res.send(qr);
    } catch (error) {
        res.status(500).json({ message: 'Gagal generate QR Code' });
    }
});

export default router;
