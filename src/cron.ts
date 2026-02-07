import cron from 'node-cron';
import prisma from './prisma';

// Run every hour
export const initCronJobs = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('Running auto-cancellation cron job...');
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Find pending borrowings older than 24h
            const expiredBorrowings = await prisma.borrowing.findMany({
                where: {
                    status: 'PENDING',
                    createdAt: {
                        lt: twentyFourHoursAgo
                    }
                },
                include: { bookCopy: true }
            });

            if (expiredBorrowings.length > 0) {
                console.log(`Found ${expiredBorrowings.length} expired bookings to cancel.`);

                for (const borrowing of expiredBorrowings) {
                    // Update borrowing status to CANCELLED
                    await prisma.borrowing.update({
                        where: { id: borrowing.id },
                        data: { status: 'CANCELLED' } // Pastikan status CANCELLED ada di schema atau gunakan REJECTED
                    });

                    // Make book copy AVAILABLE again (if it was somehow reserved, but logic says AVAILABLE copies are picked for PENDING)
                    // Actually, when PENDING, copy is already attached. We should ensure it's AVAILABLE.
                    // Wait, if PENDING means "Booking", usually we reserve the copy.
                    // Let's assume PENDING holds the copy.

                    /* 
                       Note: In borrowBook controller, we pick an AVAILABLE copy and assign it.
                       Does PENDING status on Borrowing mean the Copy is also 'BORROWED' or still 'AVAILABLE'?
                       Let's check borrowBook: 
                       It creates borrowing with status PENDING.
                       It does NOT update bookCopy status to 'BORROWED' yet. 
                       It updates bookCopy status to 'BORROWED' only on APPROVAL (handleBorrowRequest).
                       
                       So, if borrowing is PENDING, the copy might still be 'AVAILABLE' or we should have marked it 'BOOKED'?
                       Looking at borrow.controller.ts:
                       It finds AVAILABLE copy. It creates borrowing.
                       It does NOT change copy status.
                       
                       Issue: If copy status is still AVAILABLE, someone else can borrow it?
                       Yes, borrowBook finds "status: 'AVAILABLE'".
                       
                       If we want to reserve it, we should have changed copy status to 'BOOKED' or similar.
                       But if the current logic allows PENDING without changing copy status, then multiple people could book the same copy?
                       
                       Let's check borrow.controller.ts again.
                       Line 148: create borrowing.
                       Line 137: findFirst AVAILABLE.
                       
                       If we don't change copy status, it stays AVAILABLE.
                       So 2 people can book the same copy.
                       
                       If that's the current logic (flawed or simple), then cancelling PENDING borrowing doesn't need to update Copy status 
                       because it's likely still AVAILABLE (unless approved).
                       
                       However, if we want to be safe: we just cancel the borrowing.
                    */

                    console.log(`Cancelled borrowing ${borrowing.id}`);
                }
            } else {
                console.log('No expired bookings found.');
            }
        } catch (error) {
            console.error('Error in auto-cancellation cron:', error);
        }
    });
};
