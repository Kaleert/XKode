/* server.js */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const Client = require('ssh2-sftp-client');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Static
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    app.use('/cdn/xterm', express.static(path.join(nodeModulesPath, 'xterm')));
    app.use('/cdn/fit', express.static(path.join(nodeModulesPath, 'xterm-addon-fit')));
}

// Storage Roots
const TERMUX_HOME = '/data/data/com.termux/files/home';
const homeRoot = fs.existsSync(TERMUX_HOME) ? TERMUX_HOME : process.env.HOME;
const connections = {
    'local-home': { type: 'local', root: homeRoot, name: 'Termux Home' }
};
if (fs.existsSync('/storage/emulated/0')) {
    connections['local-storage'] = { type: 'local', root: '/storage/emulated/0', name: 'Internal Storage' };
}

const getClient = (id) => connections[id] || connections['local-home'];

app.get('/api/ping', (req, res) => res.send('pong'));

app.get('/api/storages', (req, res) => {
    res.json(Object.keys(connections).map(id => ({ id, type: connections[id].type, name: connections[id].name })));
});

// CONNECT SFTP
app.post('/api/storages/connect-sftp', async (req, res) => {
    const sftp = new Client();
    try {
        console.log('SFTP Connecting to:', req.body.host);
        await sftp.connect(req.body);
        const id = `sftp-${uuidv4()}`;
        connections[id] = { type: 'sftp', client: sftp, root: '/', name: req.body.name || req.body.host };
        console.log('SFTP Connected, ID:', id);
        res.json({ id, name: connections[id].name, type: 'sftp' });
    } catch (e) { 
        console.error('SFTP Error:', e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// LIST FILES
app.post('/api/fs/list', async (req, res) => {
    try {
        let { storageId, path: p } = req.body;
        const conn = getClient(storageId);
        
        if (conn.type === 'local') {
            let targetPath = conn.root;
            if (p && p !== '/') targetPath = path.join(conn.root, p.startsWith('/') ? p.slice(1) : p);
            
            if (!fs.existsSync(targetPath)) return res.json([]);
            try {
                const files = await fs.readdir(targetPath);
                const items = await Promise.all(files.map(async f => {
                    try {
                        const fullPath = path.join(targetPath, f);
                        const s = await fs.lstat(fullPath);
                        return { name: f, path: p === '/' ? `/${f}` : `${p}/${f}`, isDirectory: s.isDirectory() };
                    } catch { return null; }
                }));
                res.json(items.filter(Boolean).sort((a,b) => b.isDirectory - a.isDirectory));
            } catch (err) { res.json([{ name: 'Permission Denied', path: p, isDirectory: false }]); }
        } else {
            // SFTP
            const target = p || '/';
            console.log(`[SFTP] List: ${target}`);
            const list = await conn.client.list(target);
            const items = list.map(i => ({
                name: i.name, 
                path: target === '/' ? `/${i.name}` : `${target}/${i.name}`, 
                isDirectory: i.type === 'd'
            }));
            res.json(items.sort((a,b) => b.isDirectory - a.isDirectory));
        }
    } catch (e) { 
        console.error("FS List Error:", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// READ FILE
app.post('/api/fs/read', async (req, res) => {
    try {
        const { storageId, path: p } = req.body;
        const conn = getClient(storageId);
        
        if (conn.type === 'local') {
             const realPath = path.join(conn.root, p.startsWith('/') ? p.slice(1) : p);
             const stats = await fs.stat(realPath);
             if (stats.size > 2 * 1024 * 1024) return res.status(400).send("File too large (>2MB)");
             const content = await fs.readFile(realPath, 'utf8');
             res.send(content || "");
        } else {
             console.log(`[SFTP] Read: ${p}`);
             const buf = await conn.client.get(p);
             if (buf.length > 2 * 1024 * 1024) return res.status(400).send("File too large");
             res.send(buf.toString());
        }
    } catch (e) { res.status(500).send(e.message); }
});

// SAVE FILE
app.post('/api/fs/save', async (req, res) => {
    try {
        const { storageId, path: p, content } = req.body;
        const conn = getClient(storageId);
        if (conn.type === 'local') {
             const realPath = path.join(conn.root, p.startsWith('/') ? p.slice(1) : p);
             await fs.writeFile(realPath, content);
        } else {
             await conn.client.put(Buffer.from(content), p);
        }
        res.send('Saved');
    } catch (e) { res.status(500).send(e.message); }
});

// TERMINAL
const sessions = {};
io.on('connection', (socket) => {
    sessions[socket.id] = {};
    socket.on('term:create', (id) => {
        if (sessions[socket.id][id]) return;
        try {
            let shell = process.env.SHELL || 'bash';
            if (fs.existsSync('/data/data/com.termux/files/usr/bin/bash')) shell = '/data/data/com.termux/files/usr/bin/bash';
            const ptyProcess = pty.spawn(shell, [], { name: 'xterm-256color', cols: 80, rows: 30, cwd: homeRoot, env: process.env });
            sessions[socket.id][id] = ptyProcess;
            ptyProcess.onData(data => socket.emit('term:data', { id, data }));
            ptyProcess.onExit(() => { socket.emit('term:exit', { id }); if (sessions[socket.id]) delete sessions[socket.id][id]; });
        } catch (e) {}
    });
    socket.on('term:input', ({ id, data }) => sessions[socket.id]?.[id]?.write(data));
    socket.on('term:resize', ({ id, cols, rows }) => { try{sessions[socket.id]?.[id]?.resize(cols, rows)}catch(e){} });
    socket.on('term:kill', (id) => { sessions[socket.id]?.[id]?.kill(); delete sessions[socket.id][id]; });
    socket.on('disconnect', () => { if (sessions[socket.id]) { Object.values(sessions[socket.id]).forEach(p => {try{p.kill()}catch(e){}}); delete sessions[socket.id]; }});
});

server.listen(3000, '0.0.0.0', () => console.log('Server running on port 3000'));