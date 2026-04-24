"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../utils/helpers");
// ============================================================
// TC-U01 – calculateLateFee
// ============================================================
describe('calculateLateFee', () => {
    test('TC-U01-01: tidak ada denda jika dikembalikan tepat waktu', () => {
        const dueDate = new Date('2025-01-10');
        const returnDate = new Date('2025-01-10');
        expect((0, helpers_1.calculateLateFee)(dueDate, returnDate)).toBe(0);
    });
    test('TC-U01-02: tidak ada denda jika dikembalikan sebelum jatuh tempo', () => {
        const dueDate = new Date('2025-01-10');
        const returnDate = new Date('2025-01-08');
        expect((0, helpers_1.calculateLateFee)(dueDate, returnDate)).toBe(0);
    });
    test('TC-U01-03: denda 1 hari = Rp 1.000', () => {
        const dueDate = new Date('2025-01-10');
        const returnDate = new Date('2025-01-11');
        expect((0, helpers_1.calculateLateFee)(dueDate, returnDate)).toBe(helpers_1.LATE_FEE_PER_DAY * 1);
    });
    test('TC-U01-04: denda 5 hari = Rp 5.000', () => {
        const dueDate = new Date('2025-01-10');
        const returnDate = new Date('2025-01-15');
        expect((0, helpers_1.calculateLateFee)(dueDate, returnDate)).toBe(helpers_1.LATE_FEE_PER_DAY * 5);
    });
    test('TC-U01-05: denda 30 hari = Rp 30.000', () => {
        const dueDate = new Date('2025-01-01');
        const returnDate = new Date('2025-01-31');
        expect((0, helpers_1.calculateLateFee)(dueDate, returnDate)).toBe(helpers_1.LATE_FEE_PER_DAY * 30);
    });
});
// ============================================================
// TC-U02 – calculateDueDate
// ============================================================
describe('calculateDueDate', () => {
    test('TC-U02-01: jatuh tempo = tanggal pinjam + 7 hari', () => {
        const borrowDate = new Date('2025-01-01');
        const dueDate = (0, helpers_1.calculateDueDate)(borrowDate);
        const expected = new Date('2025-01-08');
        expect(dueDate.toDateString()).toBe(expected.toDateString());
    });
    test('TC-U02-02: durasi pinjam sesuai konstanta LOAN_DURATION_DAYS', () => {
        const borrowDate = new Date('2025-03-01');
        const dueDate = (0, helpers_1.calculateDueDate)(borrowDate);
        const diffDays = (dueDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(helpers_1.LOAN_DURATION_DAYS);
    });
});
// ============================================================
// TC-U03 – calculatePickupDeadline
// ============================================================
describe('calculatePickupDeadline', () => {
    test('TC-U03-01: batas ambil = tanggal disetujui + 2 hari', () => {
        const approvalDate = new Date('2025-01-10');
        const deadline = (0, helpers_1.calculatePickupDeadline)(approvalDate);
        const expected = new Date('2025-01-12');
        expect(deadline.toDateString()).toBe(expected.toDateString());
    });
});
// ============================================================
// TC-U04 – isExpiredPending
// ============================================================
describe('isExpiredPending', () => {
    test('TC-U04-01: pending 25 jam → sudah expired', () => {
        const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
        expect((0, helpers_1.isExpiredPending)(createdAt)).toBe(true);
    });
    test('TC-U04-02: pending 10 jam → belum expired', () => {
        const createdAt = new Date(Date.now() - 10 * 60 * 60 * 1000);
        expect((0, helpers_1.isExpiredPending)(createdAt)).toBe(false);
    });
    test('TC-U04-03: pending tepat 24 jam → belum expired (batas eksklusif)', () => {
        const createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
        expect((0, helpers_1.isExpiredPending)(createdAt)).toBe(false);
    });
});
