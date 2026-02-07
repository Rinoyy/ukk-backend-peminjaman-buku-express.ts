import QRCode from 'qrcode';

export const generateQRCode = async (data: string): Promise<string> => {
    try {
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error('Error generating QR code:', err);
        throw new Error('Failed to generate QR code');
    }
};
