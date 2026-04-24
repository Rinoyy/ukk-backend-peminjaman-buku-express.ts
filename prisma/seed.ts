import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Membersihkan semua tabel...');

    // Hapus dalam urutan yang benar (FK terlebih dahulu)
    await prisma.notification.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.borrowing.deleteMany();
    await prisma.visit.deleteMany();
    await prisma.bookCopy.deleteMany();
    await prisma.book.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.studentNISN.deleteMany();
    await prisma.staffNIP.deleteMany();

    console.log('✅ Semua tabel berhasil dikosongkan.\n');

    // ─── 1. NISN Siswa yang Diizinkan ───────────────────────────────────────
    console.log('📋 Mengisi data NISN siswa...');
    const nisnList = [
        { nisn: '1234567890', name: 'Budi Santoso' },
        { nisn: '0987654321', name: 'Siti Rahayu' },
        { nisn: '1122334455', name: 'Ahmad Fauzi' },
        { nisn: '5544332211', name: 'Dewi Lestari' },
        { nisn: '9988776655', name: 'Rizky Pratama' },
    ];

    for (const data of nisnList) {
        await prisma.studentNISN.create({ data });
        console.log(`  + NISN ${data.nisn} — ${data.name}`);
    }

    // ─── 2. NIP Guru & Staff yang Diizinkan ─────────────────────────────────
    console.log('📋 Mengisi data NIP guru dan staff...');
    const nipList = [
        { nip: '196801011990031001', name: 'Bapak Hendra Kusuma', role: 'GURU' },
        { nip: '197205152001122002', name: 'Ibu Ratna Dewi', role: 'GURU' },
        { nip: '198003202005011003', name: 'Bapak Agus Setiawan', role: 'GURU' },
        { nip: '197811102003122004', name: 'Ibu Sari Wulandari', role: 'GURU' },
        { nip: '199001012015031005', name: 'Bapak Diki Firmansyah', role: 'GURU' },
        { nip: '198506152010011006', name: 'Bapak Eko Prasetyo', role: 'STAFF' },
        { nip: '199203042018022007', name: 'Ibu Lina Susanti', role: 'STAFF' },
        { nip: '198809102014011008', name: 'Bapak Fajar Nugroho', role: 'STAFF' },
    ];

    for (const data of nipList) {
        await prisma.staffNIP.create({ data });
        console.log(`  + NIP ${data.nip} — ${data.name} (${data.role})`);
    }

    // ─── 3. Akun Default ──────────────────────────────────────────────────────
    console.log('\n👤 Membuat akun default...');
    const defaultUsers = [
        { username: 'admin', password: 'admin123', role: 'ADMIN' },
    ];

    for (const account of defaultUsers) {
        const hashedPassword = await bcrypt.hash(account.password, 10);
        const user = await prisma.user.create({
            data: {
                username: account.username,
                password: hashedPassword,
                role: account.role,
            },
        });

        const qrData = JSON.stringify({ id: user.id, role: user.role, username: user.username, valid: true });
        const qrCode = await QRCode.toDataURL(qrData);
        await prisma.user.update({ where: { id: user.id }, data: { qrCode } });

        console.log(`  + ${account.username} / ${account.password} (${account.role})`);
    }

    // ─── 4. Kategori ─────────────────────────────────────────────────────────
    console.log('\n📂 Mengisi kategori...');
    const categories = [
        { name: 'JavaScript', description: 'Buku tentang JavaScript dan framework terkait' },
        { name: 'PHP', description: 'Buku tentang PHP dan web development' },
        { name: 'Animasi', description: 'Buku tentang animasi dan motion graphics' },
        { name: 'Database', description: 'Buku tentang database dan SQL' },
        { name: 'Jaringan', description: 'Buku tentang jaringan komputer' },
        { name: 'Desain', description: 'Buku tentang desain grafis dan UI/UX' },
    ];

    const createdCategories: Record<string, number> = {};
    for (const cat of categories) {
        const created = await prisma.category.create({ data: cat });
        createdCategories[cat.name] = created.id;
        console.log(`  + ${cat.name}`);
    }

    // ─── 5. Buku & Salinan ───────────────────────────────────────────────────
    console.log('\n📚 Mengisi buku dan salinan...');
    const books = [
        {
            title: 'Learning JavaScript',
            author: 'Ethan Brown',
            categoryId: createdCategories['JavaScript'],
            description: 'Panduan lengkap untuk mempelajari JavaScript modern dari dasar hingga lanjut.',
            stock: 5,
            price: 95000,
        },
        {
            title: 'Eloquent JavaScript',
            author: 'Marijn Haverbeke',
            categoryId: createdCategories['JavaScript'],
            description: 'Buku klasik yang mengajarkan cara berpikir komputasional menggunakan JavaScript.',
            stock: 3,
            price: 110000,
        },
        {
            title: 'React Up and Running',
            author: 'Stoyan Stefanov',
            categoryId: createdCategories['JavaScript'],
            description: 'Belajar React.js step-by-step untuk membangun aplikasi web modern.',
            stock: 4,
            price: 120000,
        },
        {
            title: 'PHP and MySQL Web Development',
            author: 'Luke Welling',
            categoryId: createdCategories['PHP'],
            description: 'Membahas integrasi PHP dengan MySQL secara mendalam untuk membangun aplikasi dinamis.',
            stock: 6,
            price: 105000,
        },
        {
            title: "The Animator's Survival Kit",
            author: 'Richard Williams',
            categoryId: createdCategories['Animasi'],
            description: 'Buku wajib bagi setiap animator — prinsip dasar animasi, timing, dan spacing.',
            stock: 3,
            price: 150000,
        },
        {
            title: 'SQL in 10 Minutes',
            author: 'Ben Forta',
            categoryId: createdCategories['Database'],
            description: 'Cara tercepat untuk memahami SQL. Padat dan langsung ke inti permasalahan.',
            stock: 5,
            price: 85000,
        },
    ];

    for (const book of books) {
        const createdBook = await prisma.book.create({
            data: {
                title: book.title,
                author: book.author,
                categoryId: book.categoryId,
                description: book.description,
                price: book.price,
            },
        });

        for (let i = 1; i <= book.stock; i++) {
            const copy = await prisma.bookCopy.create({
                data: { bookId: createdBook.id, copyNumber: i, status: 'AVAILABLE' },
            });

            const qrData = JSON.stringify({
                type: 'BOOK_COPY',
                bookId: createdBook.id,
                copyId: copy.id,
                title: createdBook.title,
                copyNumber: i,
            });
            const qrCode = await QRCode.toDataURL(qrData);
            await prisma.bookCopy.update({ where: { id: copy.id }, data: { qrCode } });
        }

        console.log(`  + ${book.title} (${book.stock} eksemplar)`);
    }

    console.log('\n✅ Seed selesai!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
