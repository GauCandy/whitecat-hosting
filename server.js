// Load environment variables
require('dotenv').config();

const express = require('express');
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

// Start server trên địa chỉ IPv6 cụ thể
app.listen(PORT, IPV6_ADDRESS, () => {
    console.log('========================================');
    console.log(`Server đang chạy:`);
    console.log(`- Environment: ${NODE_ENV}`);
    console.log(`- IPv6 Address: ${IPV6_ADDRESS}`);
    console.log(`- Port: ${PORT}`);
    console.log(`- URL: http://[${IPV6_ADDRESS}]:${PORT}`);
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

process.on('EADDRINUSE', () => {
    console.error(`Port ${PORT} đã được sử dụng bởi ứng dụng khác`);
    process.exit(1);
});

process.on('EACCES', () => {
    console.error(`Không có quyền sử dụng port ${PORT}. Cần chạy với quyền administrator/root`);
    process.exit(1);
});
