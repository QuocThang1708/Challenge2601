# Gmail SMTP Setup Guide

## 🎯 Hướng Dẫn Cấu Hình Gmail SMTP

### Bước 1: Tạo Gmail App Password

1. **Đăng nhập Gmail** của bạn
2. Truy cập: https://myaccount.google.com/security
3. Tìm **"2-Step Verification"** (Xác minh 2 bước)
   - Nếu chưa bật → **BẬT LÊN** trước
4. Sau khi bật 2-Step, scroll xuống tìm **"App passwords"** (Mật khẩu ứng dụng)
5. Click **"App passwords"**
6. Chọn:
   - App: **Mail**
   - Device: **Windows Computer** (hoặc Other)
7. Click **Generate** → Copy mã 16 ký tự (dạng: `xxxx xxxx xxxx xxxx`)

### Bước 2: Cập Nhật File `.env`

Mở file `c:\HRM-AI\backend\.env` và update:

```bash
# Gmail SMTP Configuration
EMAIL_USER=your-email@gmail.com       # ← Thay bằng Gmail của bạn
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx    # ← Paste App Password vừa tạo
```

**Ví dụ thực tế:**

```bash
EMAIL_USER=nhatminh@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

### Bước 3: Restart Backend

```bash
# Stop backend hiện tại (Ctrl+C)
# Start lại
cd c:\HRM-AI\backend
npm start
```

### Bước 4: Test!

1. Mở `http://localhost:5000` hoặc user portal
2. Đăng ký tài khoản với **EMAIL THẬT của bạn**
3. Check hộp thư → **Email xác thực sẽ đến trong vài giây!**

---

## ✅ Email Template

Email sẽ có format như này:

```
Tiêu đề: Xác thực tài khoản - HRM System

Nội dung:
┌─────────────────────────────┐
│      HRM SYSTEM             │
├─────────────────────────────┤
│ Xin chào [Tên]!             │
│                             │
│ Mã xác thực của bạn:        │
│                             │
│  ┌─────────────────┐        │
│  │    825469       │        │
│  └─────────────────┘        │
│                             │
│ Hiệu lực: 15 phút           │
└─────────────────────────────┘
```

---

## 🔒 Bảo Mật

- ✅ App Password **KHÔNG PHẢI** mật khẩu Gmail thật
- ✅ Có thể thu hồi bất cứ lúc nào
- ✅ Chỉ dùng cho ứng dụng này
- ⚠️ **KHÔNG** commit `.env` lên Git!

---

## 🐛 Troubleshooting

### Lỗi: "Invalid login"

→ Check lại App Password, xóa khoảng trắng

### Lỗi: "Less secure app access"

→ Dùng **App Password**, không dùng password Gmail thật

### Email không đến

→ Check **Spam folder**
→ Đợi 1-2 phút

### Lỗi: "self signed certificate"

→ Add vào emailService.js:

```javascript
tls: {
  rejectUnauthorized: false;
}
```

---

## 📊 Status

✅ Nodemailer installed
✅ Email service created
✅ Auth.js updated
✅ .env configured (cần update credentials)
⏳ Chờ bạn setup Gmail App Password

**NEXT STEP**: Tạo App Password và update `.env`!
