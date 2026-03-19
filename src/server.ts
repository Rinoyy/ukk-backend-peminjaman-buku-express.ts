import app from './app';
import { initCronJobs } from './cron';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    initCronJobs();
});
