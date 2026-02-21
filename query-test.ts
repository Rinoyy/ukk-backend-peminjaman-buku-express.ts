import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const borrowings = await prisma.borrowing.findMany({
            include: {
                user: { select: { username: true } },
                bookCopy: {
                    include: { book: { select: { title: true, author: true } } }
                },
                payment: true
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log("Success:", borrowings.length);
    } catch (e) {
        console.error("Prisma Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
