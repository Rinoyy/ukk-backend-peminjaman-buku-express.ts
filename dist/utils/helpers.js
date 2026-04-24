"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExpiredPending = exports.calculatePickupDeadline = exports.calculateDueDate = exports.calculateLateFee = exports.PICKUP_DEADLINE_DAYS = exports.LOAN_DURATION_DAYS = exports.LATE_FEE_PER_DAY = void 0;
// Konstanta aturan peminjaman
exports.LATE_FEE_PER_DAY = 1000; // Rp 1.000 per hari
exports.LOAN_DURATION_DAYS = 7; // 7 hari masa pinjam
exports.PICKUP_DEADLINE_DAYS = 2; // 2 hari batas ambil buku
/**
 * Menghitung denda keterlambatan pengembalian buku
 * @param dueDate - Tanggal jatuh tempo pengembalian
 * @param returnDate - Tanggal aktual pengembalian
 * @returns Total denda dalam Rupiah (0 jika tidak terlambat)
 */
const calculateLateFee = (dueDate, returnDate) => {
    const diffTime = returnDate.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * exports.LATE_FEE_PER_DAY : 0;
};
exports.calculateLateFee = calculateLateFee;
/**
 * Menghitung tanggal jatuh tempo berdasarkan tanggal pinjam
 * @param borrowDate - Tanggal peminjaman disetujui
 * @returns Tanggal jatuh tempo
 */
const calculateDueDate = (borrowDate) => {
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + exports.LOAN_DURATION_DAYS);
    return dueDate;
};
exports.calculateDueDate = calculateDueDate;
/**
 * Menghitung batas waktu pengambilan buku
 * @param approvalDate - Tanggal peminjaman disetujui
 * @returns Tanggal batas pengambilan
 */
const calculatePickupDeadline = (approvalDate) => {
    const deadline = new Date(approvalDate);
    deadline.setDate(deadline.getDate() + exports.PICKUP_DEADLINE_DAYS);
    return deadline;
};
exports.calculatePickupDeadline = calculatePickupDeadline;
/**
 * Mengecek apakah peminjaman sudah melewati batas pengambilan (24 jam)
 * @param createdAt - Waktu peminjaman dibuat
 * @param now - Waktu sekarang (default: Date.now)
 * @returns true jika sudah lebih dari 24 jam
 */
const isExpiredPending = (createdAt, now = new Date()) => {
    const diffMs = now.getTime() - createdAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 24;
};
exports.isExpiredPending = isExpiredPending;
