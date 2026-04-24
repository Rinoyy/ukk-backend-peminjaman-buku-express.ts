"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const book_routes_1 = __importDefault(require("./routes/book.routes"));
const bookCopy_routes_1 = __importDefault(require("./routes/bookCopy.routes"));
const borrow_routes_1 = __importDefault(require("./routes/borrow.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const qr_routes_1 = __importDefault(require("./routes/qr.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const visit_routes_1 = __importDefault(require("./routes/visit.routes"));
const studentNisn_routes_1 = __importDefault(require("./routes/studentNisn.routes"));
const staffNip_routes_1 = __importDefault(require("./routes/staffNip.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Static files — gambar cover buku
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', auth_routes_1.default);
app.use('/api/books', book_routes_1.default);
app.use('/api/book-copies', bookCopy_routes_1.default);
app.use('/api/borrow', borrow_routes_1.default);
app.use('/api/categories', category_routes_1.default);
app.use('/api/export', export_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/qr', qr_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/visits', visit_routes_1.default);
app.use('/api/student-nisns', studentNisn_routes_1.default);
app.use('/api/staff-nips', staffNip_routes_1.default);
app.get('/', (_, res) => {
    res.json({ message: 'API Sistem Peminjaman Buku berjalan 🚀' });
});
exports.default = app;
