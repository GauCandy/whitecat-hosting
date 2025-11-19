// Load environment variables
require('dotenv').config();

// Server Node.js đơn giản không cần Express
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration từ .env file
const PORT = process.env.PORT || 80;
const IPV6_ADDRESS = process.env.IPV6_ADDRESS || '::';
const NODE_ENV = process.env.NODE_ENV || 'development';

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Create server
const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Xử lý URL
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Lấy extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    // Đọc và gửi file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File không tồn tại
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                // Lỗi server
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            // Thành công
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
});

// Bind server vào địa chỉ IPv6 cụ thể
server.listen(PORT, IPV6_ADDRESS, () => {
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
        console.log('Linux/Mac: Sử dụng sudo node server-simple.js');
    }
});

// Error handling
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} đã được sử dụng bởi ứng dụng khác`);
    } else if (err.code === 'EACCES') {
        console.error(`Không có quyền sử dụng port ${PORT}. Cần chạy với quyền administrator/root`);
    } else {
        console.error('Lỗi server:', err);
    }
    process.exit(1);
});
