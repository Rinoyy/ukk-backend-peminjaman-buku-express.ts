"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qrcode_1 = __importDefault(require("qrcode"));
const router = (0, express_1.Router)();
// ── Public ───────────────────────────────────────────────────
// GET /api/qr?text=... — generate QR Code sebagai gambar PNG
router.get('/', async (req, res) => {
    const text = req.query.text;
    if (!text) {
        return res.status(400).json({ message: "Query 'text' wajib diisi" });
    }
    try {
        const qr = await qrcode_1.default.toBuffer(text);
        res.setHeader('Content-Type', 'image/png');
        res.send(qr);
    }
    catch (error) {
        res.status(500).json({ message: 'Gagal generate QR Code' });
    }
});
exports.default = router;
