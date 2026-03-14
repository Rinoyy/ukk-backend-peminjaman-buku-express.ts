import express from "express";
import cors from 'cors';
import path from 'path';
import authRoutes from "./routes/auth.routes";
import bookRoutes from "./routes/book.routes";
import borrowRoutes from "./routes/borrow.routes";
import userRoutes from "./routes/user.routes";
import categoryRoutes from "./routes/category.routes";
import visitRoutes from "./routes/visit.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrow", borrowRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/visits", visitRoutes);

app.get("/", (_, res) => {
  res.json({ message: "API is running 🚀" });
});

export default app;
