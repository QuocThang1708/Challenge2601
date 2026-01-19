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
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

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

  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const phone = document.getElementById("regPhone").value;
  const employeeId = document.getElementById("regEmployeeId").value;
  const password = document.getElementById("regPassword").value;

  // Validate
  if (password.length < 6) {
    showToast("Mật khẩu phải có ít nhất 6 ký tự", "error");
    return;
  }

  try {
    // showToast("Đang đăng ký...", "info");
    document.body.style.cursor = "wait";

    await apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, employeeId, password }),
    });

    showToast("Đăng ký thành công! Vui lòng đăng nhập.", "success", 5000);
    closeModal("registerModal");

    // Clear form
    document.getElementById("registerForm").reset();

    // Show login modal
    setTimeout(() => {
      showModal("loginModal");
    }, 1000);
  } catch (error) {
    showToast(error.message || "Đăng ký thất bại", "error");
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
// PASSWORD VISIBILITY TOGGLE
// ============================================
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const btn = input.parentElement.querySelector(".password-toggle");
  if (!btn) return;

  const eyeOpen =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeClosed =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = eyeClosed;
  } else {
    input.type = "password";
    btn.innerHTML = eyeOpen;
  }
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
