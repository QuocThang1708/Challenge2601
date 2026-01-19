# 2 Website Riêng Biệt - Hướng Dẫn

## 📂 Cấu Trúc

```
HRM-AI/
├── user-portal/           # Website 1: Cổng Cán Bộ
│   ├── index.html         # Landing + Login
│   ├── dashboard.html     # User dashboard
│   ├── profile.html       # Hồ sơ
│   ├── cv.html            # CV management
│   ├── qualifications.html # Trình độ
│   ├── js/
│   │   ├── api.js
│   │   └── app.js
│   └── css/
│
├── admin-portal/          # Website 2: Hệ Thống Quản Trị
│   ├── index.html         # Admin login
│   ├── dashboard.html     # Admin dashboard
│   ├── users.html         # User management
│   ├── reports.html       # Reports
│   ├── js/
│   │   ├── api.js
│   │   └── app.js
│   └── css/
│
├── shared/
│   └── styles.css         # Design system dùng chung
│
└── backend/               # Backend API dùng chung
```

## 🚀 Cách Chạy

### Website 1: User Portal (Cổng Cán Bộ)

```
Mở: c:\HRM-AI\user-portal\index.html

Login:
- Email: user@example.com
- Hoặc đăng ký tài khoản mới
```

### Website 2: Admin Portal (Hệ Thống Quản Trị)

```
Mở: c:\HRM-AI\admin-portal\index.html

Login (Admin only):
- Email: admin@congdoan.vn
- Password: admin123
```

### Backend API

```bash
cd backend
npm start
# Runs on http://localhost:5000
```

## ✅ Hoàn Thành

**User Portal**: Landing, Dashboard, Profile, CV, Qualifications  
**Admin Portal**: Login, Dashboard, Users, Reports  
**Backend**: Single API cho cả 2 websites  
**Design**: Shared German design system

---

**MỞ FILE HTML ĐỂ SỬ DUNG WEBSITE!**
