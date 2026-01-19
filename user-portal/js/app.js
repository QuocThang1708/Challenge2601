// ============================================
// HRM System - JavaScript Application
// German Design - Minimalist & Functional
// ============================================

// ============================================
// MODAL FUNCTIONS
// ============================================
function showLoginModal() {
  showModal("loginModal");
}

function showRegisterModal() {
  showModal("registerModal");
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

// Close modal on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("active");
    document.body.style.overflow = "auto";
  }
});

// Close modal on ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.active").forEach((modal) => {
      modal.classList.remove("active");
    });
    document.body.style.overflow = "auto";
  }
});

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  // Icons based on type
  const icons = {
    success:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()" title="Đóng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400); // Wait for transition
  }, duration);
}

// ============================================
// AUTHENTICATION (Real Backend API)
// ============================================

// Store registered email for verification
let pendingVerificationEmail = "";
let forgotPasswordEmail = "";

// Toggle password visibility
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const btn = input.parentElement.querySelector(".password-toggle");
  const eyeOpen =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeClosed =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = eyeClosed;
  } else {
    input.type = "password";
    btn.innerHTML = eyeOpen;
  }
}
async function handleLogin(event) {
  event.preventDefault();

  const emailEl = document.getElementById("loginEmail");
  const passwordEl = document.getElementById("loginPassword");

  // Clear errors
  document.getElementById("error-loginEmail").textContent = "";
  document.getElementById("error-loginPassword").textContent = "";

  let hasError = false;

  if (!emailEl.value.trim()) {
    document.getElementById("error-loginEmail").textContent =
      "Vui lòng nhập Email / Mã cán bộ";
    hasError = true;
  }

  if (!passwordEl.value) {
    document.getElementById("error-loginPassword").textContent =
      "Vui lòng nhập mật khẩu";
    hasError = true;
  }

  if (hasError) return;

  const email = emailEl.value;
  const password = passwordEl.value;

  try {
    // showToast("Đang đăng nhập...", "info");
    document.body.style.cursor = "wait";

    const data = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Store token and user data
    localStorage.setItem("authToken", data.data.token);
    localStorage.setItem("currentUser", JSON.stringify(data.data.user));
    localStorage.setItem("isLoggedIn", "true");

    // RBAC CHECK
    if (data.data.user.role !== "user") {
      showToast("Bạn không có quyền truy cập Cổng Cán Bộ", "error");
      localStorage.removeItem("authToken");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("isLoggedIn");
      return;
    }

    showToast("Đăng nhập thành công!", "success");
    closeModal("loginModal");

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);
  } catch (error) {
    showToast(error.message || "Đăng nhập thất bại", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const nameEl = document.getElementById("regName");
  const emailEl = document.getElementById("regEmail");
  const phoneEl = document.getElementById("regPhone");
  const employeeIdEl = document.getElementById("regEmployeeId");
  const passwordEl = document.getElementById("regPassword");

  // Clear errors
  document.getElementById("error-regName").textContent = "";
  document.getElementById("error-regEmail").textContent = "";
  document.getElementById("error-regPhone").textContent = "";
  document.getElementById("error-regEmployeeId").textContent = "";
  document.getElementById("error-regPassword").textContent = "";

  let hasError = false;

  if (!nameEl.value.trim()) {
    document.getElementById("error-regName").textContent =
      "Vui lòng nhập họ và tên";
    hasError = true;
  }

  if (!emailEl.value.trim()) {
    document.getElementById("error-regEmail").textContent =
      "Vui lòng nhập email";
    hasError = true;
  }

  if (!phoneEl.value.trim()) {
    document.getElementById("error-regPhone").textContent =
      "Vui lòng nhập số điện thoại";
    hasError = true;
  }

  if (!employeeIdEl.value.trim()) {
    document.getElementById("error-regEmployeeId").textContent =
      "Vui lòng nhập mã cán bộ";
    hasError = true;
  }

  if (!passwordEl.value) {
    document.getElementById("error-regPassword").textContent =
      "Vui lòng nhập mật khẩu";
    hasError = true;
  } else if (passwordEl.value.length < 6) {
    document.getElementById("error-regPassword").textContent =
      "Mật khẩu phải có ít nhất 6 ký tự";
    hasError = true;
  }

  if (hasError) return;

  const name = nameEl.value;
  const email = emailEl.value;
  const phone = phoneEl.value;
  const employeeId = employeeIdEl.value;
  const password = passwordEl.value;

  try {
    // showToast("Đang đăng ký...", "info");
    document.body.style.cursor = "wait";

    await apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, employeeId, password }),
    });

    showToast(
      "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã xác thực.",
      "success",
      5000
    );
    closeModal("registerModal");

    // Clear form
    document.getElementById("registerForm").reset();

    // Set pending email and show verification modal
    pendingVerificationEmail = email;
    document.getElementById("verificationEmail").textContent = email;

    setTimeout(() => {
      showModal("verificationModal");
    }, 500);
  } catch (error) {
    showToast(error.message || "Đăng ký thất bại", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

// Handle verification
async function handleVerification(event) {
  event.preventDefault();

  const verificationCodeEl = document.getElementById("verificationCode");

  // Clear error
  document.getElementById("error-verificationCode").textContent = "";

  if (!verificationCodeEl.value.trim()) {
    document.getElementById("error-verificationCode").textContent =
      "Vui lòng nhập mã xác thực";
    return;
  } else if (!/^\d{6}$/.test(verificationCodeEl.value.trim())) {
    document.getElementById("error-verificationCode").textContent =
      "Mã xác thực phải là 6 chữ số";
    return;
  }

  const verificationCode = verificationCodeEl.value;

  if (!pendingVerificationEmail) {
    showToast("Không tìm thấy email. Vui lòng đăng ký lại.", "error");
    return;
  }

  try {
    document.body.style.cursor = "wait";

    await apiCall("/auth/verify", {
      method: "POST",
      body: JSON.stringify({
        email: pendingVerificationEmail,
        verificationCode: verificationCode,
      }),
    });

    showToast("Xác thực thành công! Bạn có thể đăng nhập ngay.", "success");

    // Close verification modal and show login modal
    closeModal("verificationModal");
    showModal("loginModal");

    // Clear pending email
    pendingVerificationEmail = "";

    // Reset form
    document.getElementById("verificationForm").reset();
  } catch (error) {
    showToast(
      error.message || "Xác thực thất bại, vui lòng kiểm tra lại mã",
      "error"
    );
  } finally {
    document.body.style.cursor = "default";
  }
}

// Resend verification code
async function resendVerification() {
  if (!pendingVerificationEmail) {
    showToast("Không tìm thấy email. Vui lòng đăng ký lại.", "error");
    return;
  }

  try {
    document.body.style.cursor = "wait";

    await apiCall("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: pendingVerificationEmail }),
    });

    showToast("Mã xác thực mới đã được gửi đến email của bạn!", "success");
  } catch (error) {
    showToast(error.message || "Gửi lại mã thất bại", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

function showForgotPasswordModal() {
  showModal("forgotPasswordModal");
}

async function handleForgotPassword(event) {
  event.preventDefault();
  const emailEl = document.getElementById("forgotEmail");

  // Clear error
  document.getElementById("error-forgotEmail").textContent = "";

  if (!emailEl.value.trim()) {
    document.getElementById("error-forgotEmail").textContent =
      "Vui lòng nhập email";
    return;
  }

  const email = emailEl.value;
  forgotPasswordEmail = email;

  try {
    document.body.style.cursor = "wait";

    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (data.success) {
      showToast("Mã xác thực đã được gửi đến email của bạn", "success");
      closeModal("forgotPasswordModal");
      showModal("resetPasswordModal");
    } else {
      showToast(data.message || "Gửi mã thất bại", "error");
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    showToast("Lỗi kết nối", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

async function handleResetPassword(event) {
  event.preventDefault();

  const codeEl = document.getElementById("resetCode");
  const newPasswordEl = document.getElementById("newPassword");
  const confirmPasswordEl = document.getElementById("confirmPassword");

  // Clear errors
  document.getElementById("error-resetCode").textContent = "";
  document.getElementById("error-newPassword").textContent = "";
  document.getElementById("error-confirmPassword").textContent = "";

  if (!codeEl.value.trim()) {
    document.getElementById("error-resetCode").textContent =
      "Vui lòng nhập mã xác thực";
    return;
  }

  if (newPasswordEl.value.length < 6) {
    document.getElementById("error-newPassword").textContent =
      "Mật khẩu phải có ít nhất 6 ký tự";
    return;
  }

  if (newPasswordEl.value !== confirmPasswordEl.value) {
    document.getElementById("error-confirmPassword").textContent =
      "Mật khẩu xác nhận không khớp";
    return;
  }

  try {
    document.body.style.cursor = "wait";

    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: forgotPasswordEmail,
        code: codeEl.value,
        newPassword: newPasswordEl.value,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showToast("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.", "success");
      closeModal("resetPasswordModal");
      showModal("loginModal");
      document.getElementById("resetPasswordForm").reset();
    } else {
      showToast(data.message || "Đặt lại mật khẩu thất bại", "error");
    }
  } catch (error) {
    console.error("Reset password error:", error);
    showToast("Lỗi kết nối", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

async function resendResetCode() {
  if (!forgotPasswordEmail) {
    showToast("Không tìm thấy email. Vui lòng thử lại.", "error");
    return;
  }

  try {
    document.body.style.cursor = "wait";

    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotPasswordEmail }),
    });

    const data = await response.json();

    if (data.success) {
      showToast("Mã xác thực mới đã được gửi.", "success");
    } else {
      showToast(data.message || "Gửi lại mã thất bại", "error");
    }
  } catch (error) {
    showToast("Lỗi kết nối", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

// Note: logout, requireAuth, getCurrentUser are now in api.js

// ============================================
// FORM VALIDATION
// ============================================
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;

  const inputs = form.querySelectorAll(
    "input[required], select[required], textarea[required]"
  );
  let isValid = true;

  inputs.forEach((input) => {
    if (!input.value.trim()) {
      input.classList.add("form-error");
      isValid = false;

      // Show error message
      let errorMsg = input.parentElement.querySelector(".form-error-message");
      if (!errorMsg) {
        errorMsg = document.createElement("div");
        errorMsg.className = "form-error-message";
        errorMsg.textContent = "Trường này là bắt buộc";
        input.parentElement.appendChild(errorMsg);
      }
    } else {
      input.classList.remove("form-error");
      const errorMsg = input.parentElement.querySelector(".form-error-message");
      if (errorMsg) errorMsg.remove();
    }
  });

  return isValid;
}

// Remove error on input
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("form-error")) {
    e.target.classList.remove("form-error");
    const errorMsg = e.target.parentElement.querySelector(
      ".form-error-message"
    );
    if (errorMsg) errorMsg.remove();
  }
});

// ============================================
// TABLE UTILITIES
// ============================================
function sortTable(tableId, columnIndex) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  rows.sort((a, b) => {
    const aVal = a.cells[columnIndex].textContent.trim();
    const bVal = b.cells[columnIndex].textContent.trim();
    return aVal.localeCompare(bVal, "vi");
  });

  // Re-append sorted rows
  rows.forEach((row) => tbody.appendChild(row));
}

function filterTable(tableId, searchValue) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const rows = tbody.querySelectorAll("tr");

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    if (text.includes(searchValue.toLowerCase())) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// ============================================
// GLOBAL MODAL (CONFIRM & ALERT)
// ============================================
let confirmResolve = null;

function showConfirm(message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;

    // Create modal if not exists
    ensureGlobalModal();

    // Set content
    const title = document.getElementById("globalModalTitle");
    const content = document.getElementById("globalModalMessage");
    const cancelBtn = document.getElementById("globalModalCancel");
    const okBtn = document.getElementById("globalModalOk");

    if (title) title.textContent = "XÁC NHẬN";
    if (content) content.textContent = message;
    if (cancelBtn) {
      cancelBtn.style.display = "inline-flex";
      cancelBtn.onclick = () => {
        closeModal("globalModal");
        if (confirmResolve) confirmResolve(false);
      };
    }
    if (okBtn) {
      okBtn.textContent = "Đồng ý";
      okBtn.onclick = () => {
        closeModal("globalModal");
        if (confirmResolve) confirmResolve(true);
      };
    }

    showModal("globalModal");
  });
}

function showAlert(message) {
  return new Promise((resolve) => {
    // Create modal if not exists
    ensureGlobalModal();

    // Set content
    const title = document.getElementById("globalModalTitle");
    const content = document.getElementById("globalModalMessage");
    const cancelBtn = document.getElementById("globalModalCancel");
    const okBtn = document.getElementById("globalModalOk");

    if (title) title.textContent = "THÔNG BÁO";
    if (content) content.textContent = message;
    if (cancelBtn) cancelBtn.style.display = "none"; // Hide cancel for alert
    if (okBtn) {
      okBtn.textContent = "Đóng";
      okBtn.onclick = () => {
        closeModal("globalModal");
        resolve();
      };
    }

    showModal("globalModal");
  });
}

function ensureGlobalModal() {
  if (document.getElementById("globalModal")) return;

  const modalHtml = `
    <div class="modal-overlay" id="globalModal">
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">
          <h2 class="modal-title" id="globalModalTitle">THÔNG BÁO</h2>
          <button class="modal-close" onclick="closeModal('globalModal')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p id="globalModalMessage" style="font-size: 1.1rem; color: #333;"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="globalModalCancel">Hủy</button>
          <button class="btn btn-primary" id="globalModalOk">Đồng ý</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// FILE UPLOAD UTILITY
// ============================================
function handleFileUpload(
  inputElement,
  allowedTypes = [".pdf", ".doc", ".docx"]
) {
  const file = inputElement.files[0];
  if (!file) return null;

  const fileExt = "." + file.name.split(".").pop().toLowerCase();

  if (!allowedTypes.includes(fileExt)) {
    showToast(`Chỉ chấp nhận file: ${allowedTypes.join(", ")}`, "error");
    inputElement.value = "";
    return null;
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    showToast("File không được vượt quá 5MB", "error");
    inputElement.value = "";
    return null;
  }

  return file;
}

// ============================================
// DRAG & DROP FILE UPLOAD
// ============================================
function initDragDrop(dropZoneId, callback) {
  const dropZone = document.getElementById(dropZoneId);
  if (!dropZone) return;

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.style.borderColor = "var(--color-red)";
      dropZone.style.background = "var(--color-gray-100)";
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.style.borderColor = "var(--color-black)";
      dropZone.style.background = "var(--color-white)";
    });
  });

  dropZone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (callback) callback(files);
  });
}

// ============================================
// EXPORT TO CSV
// ============================================
function exportTableToCSV(tableId, filename = "export.csv") {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll("tr");

  rows.forEach((row) => {
    const cols = row.querySelectorAll("td, th");
    const csvRow = Array.from(cols).map((col) => {
      return '"' + col.textContent.trim().replace(/"/g, '""') + '"';
    });
    csv.push(csvRow.join(","));
  });

  // Download
  const csvContent = "\uFEFF" + csv.join("\n"); // Add BOM for Excel
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================
// INITIALIZE ON LOAD
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  // Check if toast container exists, if not create it
  if (!document.getElementById("toastContainer")) {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  // Ensure global modal exists
  ensureGlobalModal();

  // Update navigation for current page
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});

console.log("HRM System - German Design Loaded ✓");
