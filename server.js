// Load environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');

const app = express();

// Configuration từ .env file
const PORT = process.env.PORT || 80;
const IPV6_ADDRESS = process.env.IPV6_ADDRESS || '::';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Serve static files
app.use(express.static(path.join(__dirname)));

// Route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Create HTTP server for IPv6-only support
const server = http.createServer(app);

// Start server trên địa chỉ IPv6 cụ thể (IPv6-only, no dual-stack)
server.listen(PORT, IPV6_ADDRESS, () => {
    const address = server.address();

    console.log('========================================');
    console.log(`Server đang chạy:`);
    console.log(`- Environment: ${NODE_ENV}`);
    console.log(`- IPv6 Address: ${IPV6_ADDRESS}`);
    console.log(`- Port: ${PORT}`);
    console.log(`- URL: http://[${IPV6_ADDRESS}]:${PORT}`);
    if (address && address.family) {
        console.log(`- Address Family: ${address.family} (IPv6 Only)`);
    }
    console.log('========================================');
    if (PORT < 1024) {
        console.log('\nLưu ý: Port < 1024 cần quyền administrator/root');
        console.log('Windows: Chạy terminal với quyền Administrator');
        console.log('Linux/Mac: Sử dụng sudo node server.js');
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Có lỗi xảy ra!');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} đã được sử dụng bởi ứng dụng khác`);
        process.exit(1);
    } else if (err.code === 'EACCES') {
        console.error(`Không có quyền sử dụng port ${PORT}. Cần chạy với quyền administrator/root`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});
