"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCopyStatus = exports.deleteCopy = exports.addCopy = exports.getBookCopies = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const qr_1 = require("../utils/qr");
// Get copies of a book
const getBookCopies = async (req, res) => {
    const { bookId } = req.params;
    try {
        const copies = await prisma_1.default.bookCopy.findMany({
            where: { bookId: Number(bookId) }
        });
        res.json(copies);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching copies", error });
    }
};
exports.getBookCopies = getBookCopies;
// Add copy to existing book
const addCopy = async (req, res) => {
    const { bookId } = req.body;
    try {
        const lastCopy = await prisma_1.default.bookCopy.findFirst({
            where: { bookId: Number(bookId) },
            orderBy: { copyNumber: 'desc' }
        });
        const newCopyNumber = (lastCopy?.copyNumber || 0) + 1;
        const copy = await prisma_1.default.bookCopy.create({
            data: {
                bookId: Number(bookId),
                copyNumber: newCopyNumber,
                status: 'AVAILABLE'
            }
        });
        // Generate QR
        const book = await prisma_1.default.book.findUnique({ where: { id: Number(bookId) } });
        const qrData = JSON.stringify({
            type: 'BOOK_COPY',
            bookId: book?.id,
            copyId: copy.id,
            title: book?.title,
            copyNumber: newCopyNumber
        });
        const qrCode = await (0, qr_1.generateQRCode)(qrData);
        const updatedCopy = await prisma_1.default.bookCopy.update({
            where: { id: copy.id },
            data: { qrCode }
        });
        res.json(updatedCopy);
    }
    catch (error) {
        res.status(500).json({ message: "Error adding copy", error });
    }
};
exports.addCopy = addCopy;
const deleteCopy = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.bookCopy.delete({ where: { id: Number(id) } });
        res.json({ message: "Copy deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting copy", error });
    }
};
exports.deleteCopy = deleteCopy;
const updateCopyStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['AVAILABLE', 'DAMAGED', 'LOST', 'BORROWED', 'RESERVED'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }
    try {
        const copy = await prisma_1.default.bookCopy.findUnique({ where: { id: Number(id) } });
        if (!copy)
            return res.status(404).json({ message: "Copy not found" });
        // Prevent modifying BORROWED or RESERVED copies directly to maintain data integrity
        if (copy.status === 'BORROWED' || copy.status === 'RESERVED') {
            return res.status(400).json({ message: "Cannot change status of a borrowed/reserved book. Please process through borrow flow." });
        }
        // Prevent changing TO borrowed/reserved manually (should use borrow flow)
        if (status === 'BORROWED' || status === 'RESERVED') {
            return res.status(400).json({ message: "Cannot manually set status to BORROWED/RESERVED. Use borrowing flow." });
        }
        const updated = await prisma_1.default.bookCopy.update({
            where: { id: Number(id) },
            data: { status }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating copy status", error });
    }
};
exports.updateCopyStatus = updateCopyStatus;
