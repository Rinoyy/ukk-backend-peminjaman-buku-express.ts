"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const cron_1 = require("./cron");
const PORT = process.env.PORT || 3000;
app_1.default.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    (0, cron_1.initCronJobs)();
});
