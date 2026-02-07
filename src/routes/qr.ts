import { Router } from "express";
import QRCode from "qrcode";

const router = Router();

// GET /qr?text=halo
router.get("/", async (req, res) => {
  const text = req.query.text as string;

  if (!text) {
    return res.status(400).json({
      message: "query 'text' is required",
    });
  }

  try {
    const qr = await QRCode.toBuffer(text);

    res.setHeader("Content-Type", "image/png");
    res.send(qr);
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate QR",
    });
  }
});

export default router;
