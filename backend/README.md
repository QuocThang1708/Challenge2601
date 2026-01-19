# HRM Backend API

Backend API server cho hệ thống HRM với phong cách thiết kế Đức.

## Tech Stack

- Node.js + Express
- JSON File Storage (đơn giản, không cần database)
- JWT Authentication
- bcrypt Password Hashing

## Installation

```bash
cd backend
npm install
```

## Configuration

File `.env` đã được tạo sẵn với:

```
PORT=5000
JWT_SECRET=hrm_secret_key_change_in_production_2026
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

## Running the Server

```bash
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Users (Admin only)

- `GET /api/users` - Danh sách tất cả users
- `GET /api/users/:id` - Chi tiết user
- `POST /api/users` - Tạo user mới
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user
- `PATCH /api/users/:id/status` - Đổi trạng thái user

### Statistics

- `GET /api/statistics` - Thống kê dashboard

### Others

- `GET /api/health` - Health check

## Default Admin Account

```
Email: admin@congdoan.vn
Password: admin123
```

## Data Storage

Dữ liệu được lưu trong file `data/users.json`.

## Frontend Integration

Frontend đã được cấu hình để kết nối với backend tại `http://localhost:5000/api`.

File `js/api.js` chứa helper functions để gọi API.

## CORS

CORS đã được enable để frontend có thể gọi API từ file:// protocol.
