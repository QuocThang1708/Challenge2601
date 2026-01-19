# Backend API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

### POST /api/auth/register

Đăng ký tài khoản mới

**Request:**

```json
{
  "name": "Nguyễn Văn A",
  "email": "a.nguyen@example.com",
  "phone": "0901234567",
  "employeeId": "CB0002",
  "password": "password123"
}
```

### POST /api/auth/login

Đăng nhập và nhận JWT token

**Request:**

```json
{
  "email": "admin@congdoan.vn",
  "password": "admin123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "1", "name": "Admin", ... },
    "token": "eyJhbGc..."
  }
}
```

### GET /api/auth/me

Lấy thông tin user hiện tại

- **Headers:** `Authorization: Bearer {token}`

---

## User Management (Admin only)

### GET /api/users

Danh sách tất cả users

- **Headers:** `Authorization: Bearer {token}`

### GET /api/users/:id

Chi tiết user theo ID

### POST /api/users

Tạo user mới (admin only)

### PUT /api/users/:id

Cập nhật user

### DELETE /api/users/:id

Xóa user (admin only)

### PATCH /api/users/:id/status

Đổi trạng thái user

```json
{ "status": "Nghỉ việc" }
```

---

## Profile

### GET /api/profile

Lấy profile user hiện tại

- **Headers:** `Authorization: Bearer {token}`

### PUT /api/profile

Cập nhật profile

```json
{
  "name": "New Name",
  "phone": "0909999999",
  "address": "Hà Nội",
  "gender": "Nam",
  "birthDate": "1990-01-01"
}
```

---

## CV Management

### POST /api/cv/upload

Upload CV file

- **Headers:** `Authorization: Bearer {token}`
- **Content-Type:** `multipart/form-data`
- **Body:** `cv` file (PDF/DOC/DOCX, max 5MB)

### GET /api/cv

Danh sách CV của user

### GET /api/cv/:id/download

Tải xuống CV file

### DELETE /api/cv/:id

Xóa CV

---

## Qualifications

### GET /api/qualifications

Lấy tất cả qualifications của user

### POST /api/qualifications/education

Thêm học vấn

```json
{
  "degree": "Thạc sĩ",
  "institution": "ĐH Kinh tế",
  "major": "Quản trị",
  "yearStart": "2008",
  "yearEnd": "2010"
}
```

### POST /api/qualifications/experience

Thêm kinh nghiệm

```json
{
  "position": "Giám đốc",
  "company": "ABC",
  "description": "Quản lý",
  "periodStart": "2015-01",
  "periodEnd": "2020-12"
}
```

### POST /api/qualifications/skills

Thêm kỹ năng

```json
{
  "name": "Project Management",
  "level": 85
}
```

### POST /api/qualifications/achievements

Thêm thành tích

```json
{
  "title": "Nhân viên xuất sắc",
  "year": "2020",
  "description": "Top performer"
}
```

---

## Reports

### POST /api/reports/generate

Tạo báo cáo

```json
{
  "reportType": "general",
  "dateFrom": "2026-01-01",
  "dateTo": "2026-12-31",
  "department": "Hành chính",
  "exportFormat": "csv"
}
```

- Nếu `exportFormat` = "csv", trả về file CSV trực tiếp
- Ngược lại, trả về metadata báo cáo

### GET /api/reports

Lịch sử báo cáo

### GET /api/reports/:id/download

Tải xuống báo cáo CSV

---

## Statistics

### GET /api/statistics

Thống kê dashboard

```json
{
  "totalEmployees": 156,
  "activeEmployees": 142,
  "departments": { "Hành chính": 45, ... },
  "byGender": { "Nam": 89, "Nữ": 67 }
}
```

---

## Default Admin Account

```
Email: admin@congdoan.vn
Password: admin123
```

---

## Testing

### Test login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@congdoan.vn","password":"admin123"}'
```

### Test upload CV:

```bash
curl -X POST http://localhost:5000/api/cv/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "cv=@/path/to/cv.pdf"
```

---

## Status: ✅ COMPLETE

All backend APIs fully implemented and tested!
