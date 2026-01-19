# HRM-AI Project

Hệ thống Quản lý Nhân sự (HRM) tích hợp AI.

## Cấu trúc Dự án

- `admin-portal`: Giao diện dành cho người quản trị.
- `user-portal`: Giao diện dành cho nhân viên/người dùng.
- `backend`: API Server (Node.js/Express).
- `shared`: Các tài nguyên dùng chung (CSS/JS).

## Hướng dẫn Cài đặt & Chạy Dự án

### 1. Backend

Di chuyển vào thư mục backend:

```bash
cd backend
```

Cài đặt các thư viện cần thiết:

```bash
npm install
```

Cấu hình biến môi trường:

- Copy file `.env.example` thành `.env`.
- Cập nhật các thông số `JWT_SECRET`, `EMAIL_USER`, và `EMAIL_PASSWORD` (nếu cần dùng tính năng gửi mail).

Khởi chạy server:

```bash
npm start
```

### 2. Frontend (Admin/User Portal)

Dự án sử dụng HTML/CSS/JS thuần, bạn có thể mở trực tiếp các file `.html` bằng trình duyệt hoặc dùng extension **Live Server** trên VS Code để chạy.

- **Quản trị viên (Admin Portal)**: `admin-portal/index.html` (Trang đăng nhập Admin)
- **Nhân viên (User Portal)**: `user-portal/index.html` (Trang landing page và đăng nhập)

## Yêu cầu Hệ thống

- Node.js (v14 trở lên)
- NPM (v6 trở lên)
