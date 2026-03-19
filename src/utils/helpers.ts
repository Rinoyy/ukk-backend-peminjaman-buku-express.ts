// Konstanta aturan peminjaman
export const LATE_FEE_PER_DAY = 1000; // Rp 1.000 per hari
export const LOAN_DURATION_DAYS = 7;   // 7 hari masa pinjam
export const PICKUP_DEADLINE_DAYS = 2; // 2 hari batas ambil buku

/**
 * Menghitung denda keterlambatan pengembalian buku
 * @param dueDate - Tanggal jatuh tempo pengembalian
 * @param returnDate - Tanggal aktual pengembalian
 * @returns Total denda dalam Rupiah (0 jika tidak terlambat)
 */
export const calculateLateFee = (dueDate: Date, returnDate: Date): number => {
    const diffTime = returnDate.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * LATE_FEE_PER_DAY : 0;
};

/**
 * Menghitung tanggal jatuh tempo berdasarkan tanggal pinjam
 * @param borrowDate - Tanggal peminjaman disetujui
 * @returns Tanggal jatuh tempo
 */
export const calculateDueDate = (borrowDate: Date): Date => {
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + LOAN_DURATION_DAYS);
    return dueDate;
};

/**
 * Menghitung batas waktu pengambilan buku
 * @param approvalDate - Tanggal peminjaman disetujui
 * @returns Tanggal batas pengambilan
 */
export const calculatePickupDeadline = (approvalDate: Date): Date => {
    const deadline = new Date(approvalDate);
    deadline.setDate(deadline.getDate() + PICKUP_DEADLINE_DAYS);
    return deadline;
};

/**
 * Mengecek apakah peminjaman sudah melewati batas pengambilan (24 jam)
 * @param createdAt - Waktu peminjaman dibuat
 * @param now - Waktu sekarang (default: Date.now)
 * @returns true jika sudah lebih dari 24 jam
 */
export const isExpiredPending = (createdAt: Date, now: Date = new Date()): boolean => {
    const diffMs = now.getTime() - createdAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 24;
};
