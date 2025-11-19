# Website Quảng Cáo Hosting

Website quảng cáo và bán dịch vụ hosting với các tính năng vượt trội.

## Cài Đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình địa chỉ IPv6

Mở file `server.js` hoặc `server-simple.js` và thay đổi giá trị `IPV6_ADDRESS`:

```javascript
const IPV6_ADDRESS = 'YOUR_IPV6_ADDRESS'; // Thay bằng địa chỉ IPv6 của bạn
```

Ví dụ:
- `::1` - localhost IPv6
- `2001:db8::1` - địa chỉ IPv6 công khai
- `fe80::1` - địa chỉ IPv6 local-link

### 3. Chạy server

#### Trên Windows (cần quyền Administrator):

Mở Command Prompt hoặc PowerShell với quyền Administrator, sau đó:

**Với Express:**
```bash
npm start
```

**Hoặc version đơn giản (không cần Express):**
```bash
npm run start-simple
```

#### Trên Linux/Mac:

**Với Express:**
```bash
sudo node server.js
```

**Hoặc version đơn giản:**
```bash
sudo node server-simple.js
```

## Truy Cập Website

Sau khi server chạy thành công, truy cập:

```
http://[YOUR_IPV6_ADDRESS]:80
```

Ví dụ với localhost IPv6:
```
http://[::1]:80
```

## Lưu Ý

- **Port 80** yêu cầu quyền administrator/root
- Đảm bảo firewall cho phép kết nối đến port 80
- Nếu không muốn dùng port 80, thay đổi `PORT` thành port khác (như 3000, 8080)
- Để sử dụng với domain, cần cấu hình DNS record AAAA trỏ đến địa chỉ IPv6

## Cấu Trúc File

```
.
├── index.html          # Trang chủ
├── style.css           # CSS styling
├── script.js           # JavaScript cho tương tác
├── server.js           # Server với Express
├── server-simple.js    # Server đơn giản không dùng Express
├── package.json        # NPM dependencies
└── README.md          # File hướng dẫn này
```

## Tùy Chỉnh

### Thay đổi port
Mở `server.js` hoặc `server-simple.js` và thay đổi:
```javascript
const PORT = 3000; // Thay 80 bằng port mong muốn
```

### Thay đổi nội dung
- **Thông tin công ty**: Chỉnh sửa [index.html](index.html)
- **Giá cả**: Chỉnh sửa phần pricing trong [index.html](index.html)
- **Màu sắc**: Chỉnh sửa CSS variables trong [style.css](style.css)
- **Logo**: Thay đổi phần `.logo` trong [index.html](index.html)

## Scripts

- `npm start` - Chạy server với Express
- `npm run start-simple` - Chạy server đơn giản
- `npm run dev` - Chạy server với nodemon (auto-reload)

## Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra địa chỉ IPv6 có đúng không
2. Đảm bảo đang chạy với quyền administrator/root
3. Kiểm tra port 80 có bị ứng dụng khác sử dụng không
4. Kiểm tra firewall settings
