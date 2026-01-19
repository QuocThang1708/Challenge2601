# Email Verification - API Documentation

## Xác Thực Tài Khoản Qua EMAIL

Theo yêu cầu từ HRM.docx: **"Xác thực tài khoản (email)"**

### ✅ Required Fields (Bắt Buộc)

Khi đăng ký, các trường sau là **BẮT BUỘC**:

1. **Họ tên** (name) - Tên đầy đủ của cán bộ
2. **Email** (email) - Email hợp lệ (dùng để xác thực)
3. **Số điện thoại** (phone) - Số VN 10 chữ số (0x...)
4. **Mã cán bộ** (employeeId) - Mã định danh duy nhất
5. **Mật khẩu** (password) - Tối thiểu 6 ký tự

### 📋 Optional Fields (Tùy chọn - nên điền)

- **Đơn vị** (department)
- **Chức vụ** (position)
- **Giới tính** (gender)
- **Ngày sinh** (birthDate)

### ✔️ Validation Rules

- **Email**: Phải đúng format (example@domain.com)
- **Phone**: Số VN 10 chữ số (0[3|5|7|8|9]xxxxxxxx)
- **Password**: Tối thiểu 6 ký tự
- **Unique**: Email, Phone, EmployeeId không được trùng

### Flow Xác Thực

1. **Đăng ký** → Nhận mã xác thực 6 số
2. **Nhập mã** → Kích hoạt tài khoản
3. **Đăng nhập** → Sử dụng hệ thống

---

## API Endpoints

### 1. POST /api/auth/register

**Đăng ký tài khoản mới**

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

**Response:**

```json
{
  "success": true,
  "message": "Đăng ký thành công! Vui lòng kiểm tra email/SMS để xác thực tài khoản.",
  "data": {
    "id": "1736683649123",
    "employeeId": "CB0002",
    "name": "Nguyễn Văn A",
    "email": "a.nguyen@example.com",
    "verificationCode": "123456",
    "message": "Mã xác thực đã gửi đến a.nguyen@example.com và 0901234567"
  }
}
```

**Notes:**

- User được tạo với status: **"Chờ xác thực"**
- Mã xác thực có hiệu lực **15 phút**
- Trong demo, mã được trả về trong response (production sẽ gửi email/SMS thật)

---

### 2. POST /api/auth/verify

**Xác thực tài khoản**

**Request:**

```json
{
  "email": "a.nguyen@example.com",
  "verificationCode": "123456"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay."
}
```

**Response (Error - Wrong Code):**

```json
{
  "success": false,
  "message": "Mã xác thực không đúng"
}
```

**Response (Error - Expired):**

```json
{
  "success": false,
  "message": "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới."
}
```

**After Verification:**

- `verified` = true
- `status` = "Đang công tác"
- User có thể đăng nhập

---

### 3. POST /api/auth/resend-verification

**Gửi lại mã xác thực**

**Request:**

```json
{
  "email": "a.nguyen@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Mã xác thực mới đã được gửi đến email/SMS của bạn",
  "data": {
    "verificationCode": "654321"
  }
}
```

**Notes:**

- Tạo mã mới có hiệu lực 15 phút
- Mã cũ bị vô hiệu hóa

---

## Testing với curl

### 1. Đăng ký

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "0909999999",
    "employeeId": "CB9999",
    "password": "test123"
  }'
```

### 2. Xác thực

```bash
curl -X POST http://localhost:5000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "verificationCode": "123456"
  }'
```

### 3. Gửi lại mã

```bash
curl -X POST http://localhost:5000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

---

## User Status Flow

```
Đăng ký
  ↓
"Chờ xác thực" (verified=false)
  ↓
Nhập mã xác thực
  ↓
"Đang công tác" (verified=true)
  ↓
Có thể đăng nhập
```

---

## For Production

Để deploy production, cần thay thế:

1. **Email Service**: Dùng SendGrid, AWS SES, hoặc Nodemailer
2. **SMS Service**: Dùng Twilio, AWS SNS
3. **Remove demo code**: Không trả về `verificationCode` trong response
4. **Add rate limiting**: Giới hạn số lần gửi lại mã

---

## ✅ Status

**HOÀN THÀNH** - Xác thực email/SMS theo yêu cầu HRM.docx!
