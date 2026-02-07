import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Create Admin
    const adminUsername = 'admin';
    const adminPassword = 'admin123';

    const existingAdmin = await prisma.user.findUnique({
        where: { username: adminUsername },
    });

    if (!existingAdmin) {
        console.log('Creating default admin user...');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const user = await prisma.user.create({
            data: {
                username: adminUsername,
                password: hashedPassword,
                role: 'ADMIN',
            },
        });

        const qrData = JSON.stringify({
            id: user.id,
            role: user.role,
            username: user.username,
            valid: true
        });

        const qrCodeImage = await QRCode.toDataURL(qrData);

        await prisma.user.update({
            where: { id: user.id },
            data: { qrCode: qrCodeImage }
        });

        console.log('Default admin created: admin / admin123');
    } else {
        console.log('Admin user already exists.');
    }

    // 2. Create Categories
    const categories = [
        { name: 'JavaScript', description: 'Buku tentang JavaScript dan framework terkait' },
        { name: 'PHP', description: 'Buku tentang PHP dan web development' },
        { name: 'Animasi', description: 'Buku tentang animasi dan motion graphics' },
        { name: 'Database', description: 'Buku tentang database dan SQL' },
        { name: 'Jaringan', description: 'Buku tentang jaringan komputer' },
        { name: 'Desain', description: 'Buku tentang desain grafis dan UI/UX' },
    ];

    for (const cat of categories) {
        const existing = await prisma.category.findUnique({ where: { name: cat.name } });
        if (!existing) {
            await prisma.category.create({ data: cat });
            console.log(`Created category: ${cat.name}`);
        }
    }

    // 3. Create Sample Books with Descriptions & Copies
    const jsCategory = await prisma.category.findUnique({ where: { name: 'JavaScript' } });
    const phpCategory = await prisma.category.findUnique({ where: { name: 'PHP' } });
    const animCategory = await prisma.category.findUnique({ where: { name: 'Animasi' } });
    const dbCategory = await prisma.category.findUnique({ where: { name: 'Database' } });

    const books = [
        {
            title: 'Learning JavaScript',
            author: 'Ethan Brown',
            categoryId: jsCategory?.id,
            description: 'Panduan lengkap untuk mempelajari JavaScript modern dari dasar hingga lanjut. Mencakup ES6, async programming, dan toolchain masa kini.',
            initialStock: 5
        },
        {
            title: 'Eloquent JavaScript',
            author: 'Marijn Haverbeke',
            categoryId: jsCategory?.id,
            description: 'Buku klasik yang mengajarkan cara berpikir komputasional menggunakan JavaScript. Sangat direkomendasikan untuk pemula yang ingin mendalami konsep programming.',
            initialStock: 3
        },
        {
            title: 'React Up and Running',
            author: 'Stoyan Stefanov',
            categoryId: jsCategory?.id,
            description: 'Belajar React.js step-by-step untuk membangun aplikasi web modern yang responsif dan cepat.',
            initialStock: 4
        },
        {
            title: 'PHP and MySQL Web Development',
            author: 'Luke Welling',
            categoryId: phpCategory?.id,
            description: 'Kitab suci bagi pengembang web PHP. Membahas integrasi PHP dengan MySQL secara mendalam untuk membangun aplikasi dinamis.',
            initialStock: 6
        },
        {
            title: 'The Animator\'s Survival Kit',
            author: 'Richard Williams',
            categoryId: animCategory?.id,
            description: 'Buku wajib bagi setiap animator. Berisi prinsip-prinsip dasar animasi, timing, spacing, dan walk cycle yang melegenda.',
            initialStock: 3
        },
        {
            title: 'SQL in 10 Minutes',
            author: 'Ben Forta',
            categoryId: dbCategory?.id,
            description: 'Cara tercepat untuk memahami SQL. Buku saku yang padat dan langsung ke inti permasalahan query database.',
            initialStock: 5
        },
    ];

    for (const book of books) {
        const existing = await prisma.book.findFirst({ where: { title: book.title } });
        if (!existing && book.categoryId) {
            // Create Book
            const createdBook = await prisma.book.create({
                data: {
                    title: book.title,
                    author: book.author,
                    categoryId: book.categoryId,
                    description: book.description,
                }
            });

            // Create Copies
            const copyPromises = [];
            for (let i = 1; i <= book.initialStock; i++) {
                // Create copy record
                const copy = await prisma.bookCopy.create({
                    data: {
                        bookId: createdBook.id,
                        copyNumber: i,
                        status: 'AVAILABLE'
                    }
                });

                // Generate QR
                const qrData = JSON.stringify({
                    type: 'BOOK_COPY',
                    bookId: createdBook.id,
                    copyId: copy.id,
                    title: createdBook.title,
                    copyNumber: i
                });
                const qrCode = await QRCode.toDataURL(qrData);

                // Update copy with QR
                copyPromises.push(
                    prisma.bookCopy.update({
                        where: { id: copy.id },
                        data: { qrCode }
                    })
                );
            }
            await Promise.all(copyPromises);

            console.log(`Created book: ${book.title} with ${book.initialStock} copies`);
        }
    }

    console.log('Seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
