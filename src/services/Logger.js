/* src/services/Logger.js */
import NativeService from './NativeService';

const LOG_DIR = '/storage/emulated/0/.xkode/logs';
const LOG_FILE = `${LOG_DIR}/session.log`;

class LoggerService {
    constructor() {
        this.logs = []; // In-memory logs for UI
        this.listeners = [];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        try {
            // Создаем структуру папок .xkode/logs
            await NativeService.createDir('/storage/emulated/0/.xkode');
            await NativeService.createDir('/storage/emulated/0/.xkode/extensions'); // Заготовка на будущее
            await NativeService.createDir(LOG_DIR);
            
            const startMsg = `\n--- SESSION START: ${new Date().toISOString()} ---\n`;
            await NativeService.appendFile(LOG_FILE, startMsg);
            this.initialized = true;
            this.info('Logger', 'XKode system initialized');
        } catch (e) {
            console.error('Logger Init Failed', e);
        }
    }

    addLog(level, tag, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { id: Date.now() + Math.random(), timestamp, level, tag, message };
        
        // 1. Add to memory
        this.logs = [logEntry, ...this.logs].slice(0, 500); // Храним последние 500
        
        // 2. Notify UI
        this.listeners.forEach(cb => cb(this.logs));

        // 3. Write to disk
        if (this.initialized) {
            const fileLine = `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}\n`;
            NativeService.appendFile(LOG_FILE, fileLine);
        }
    }

    info(tag, msg) { this.addLog('info', tag, msg); }
    warn(tag, msg) { this.addLog('warn', tag, msg); }
    error(tag, msg) { this.addLog('error', tag, msg); }

    getLogs() { return this.logs; }

    subscribe(callback) {
        this.listeners.push(callback);
        callback(this.logs);
        return () => this.listeners = this.listeners.filter(l => l !== callback);
    }

    async exportLogs() {
        const zipPath = `/storage/emulated/0/XKode_Logs_${Date.now()}.zip`;
        try {
            this.info('Logger', 'Exporting logs...');
            await NativeService.zipFolder('/storage/emulated/0/.xkode', zipPath);
            this.info('Logger', `Logs exported to ${zipPath}`);
            return zipPath;
        } catch (e) {
            this.error('Logger', `Export failed: ${e.message}`);
            throw e;
        }
    }
}

export default new LoggerService();