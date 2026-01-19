/**
 * SPA Logic for Admin Portal
 * Handles section switching and page-specific logic for Dashboard, Users, Departments, Reports
 */

// --- Confirmation Modal Helpers ---
let confirmCallback = null;

function showConfirmationModal(message, callback) {
  const modal = document.getElementById("confirmationModal");
  if (!modal) return;

  document.getElementById("confirmMessage").textContent = message;
  confirmCallback = callback;

  // Reset OK button listener
  const okBtn = document.getElementById("confirmOkBtn");
  // Clone to remove old listeners
  const newOkBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);

  newOkBtn.addEventListener("click", () => {
    if (confirmCallback) confirmCallback();
    closeConfirmationModal();
  });

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeConfirmationModal() {
  const modal = document.getElementById("confirmationModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

function confirmLockUser(userId) {
  showConfirmationModal(
    "Bạn có chắc chắn muốn KHÓA tài khoản này? Người dùng sẽ không thể đăng nhập cho đến khi được mở khóa.",
    () => toggleUserStatus(userId, "Đã khóa")
  );
}

function confirmUnlockUser(userId) {
  showConfirmationModal("Bạn có chắc chắn muốn MỞ KHÓA tài khoản này?", () =>
    toggleUserStatus(userId, "Đang công tác")
  );
}

// --- Global State ---
// --- Global State ---
let currentSection = "dashboard";
const sections = [
  "dashboard",
  "users",
  "departments",
  "reports",
  "permissions",
  "audit",
];

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  // Check Auth
  requireAuth();

  // Update User Info in Header
  updateUserInfo();

  // Handle initial route
  handleRoute();

  // Listen for hash changes
  window.addEventListener("hashchange", handleRoute);
});

function updateUserInfo() {
  const user = getCurrentUser();
  if (user && user.name) {
    // User Greeting
    const greetingEl = document.getElementById("userGreeting");
    if (greetingEl) greetingEl.textContent = `Xin chào, ${user.name}`;

    // Dashboard Welcome
    const adminNameEl = document.getElementById("adminName");
    if (adminNameEl) adminNameEl.textContent = user.name.toUpperCase();

    const adminInitialsEl = document.getElementById("adminInitials");
    if (adminInitialsEl) {
      const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      adminInitialsEl.textContent = initials;
    }
  }
}

function handleRoute() {
  const hash = window.location.hash.substring(1) || "dashboard";
  if (sections.includes(hash)) {
    switchSection(hash);
  } else {
    switchSection("dashboard");
  }
}

async function switchSection(sectionId) {
  // 1. Update Active State in Navigation
  // Reset all
  document.querySelectorAll(".nav-link, .dropdown-item").forEach((link) => {
    link.classList.remove("active");
  });

  // Activate current link
  const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
  if (activeLink) {
    activeLink.classList.add("active");

    // If inside a dropdown, activate parent
    const dropdownParent = activeLink.closest(".nav-item-dropdown");
    if (dropdownParent) {
      const parentLink = dropdownParent.querySelector(".nav-link");
      if (parentLink) parentLink.classList.add("active");
    }
  }

  // 2. Hide all sections
  sections.forEach((id) => {
    const el = document.getElementById(`${id}-section`);
    if (el) el.style.display = "none";
  });

  // 3. Show target section
  const target = document.getElementById(`${sectionId}-section`);
  if (target) {
    target.style.display = "block";

    // 4. Trigger Load Data for that section
    switch (sectionId) {
      case "dashboard":
        await loadDashboardSection();
        break;
      case "users":
        await loadUsersSection();
        break;
      case "departments":
        await loadDepartmentsSection();
        break;
      case "reports":
        await loadReportsSection();
        break;
      case "permissions":
        await loadPermissionsSection();
        break;
      case "audit":
        await loadAuditLogs();
        break;
    }
  }

  currentSection = sectionId;
}

// =============================================================================
// SECTION: DASHBOARD
// =============================================================================

async function loadDashboardSection() {
  // Show Chart Specific Loaders
  const deptLoader = document.getElementById("dept-chart-loader");
  const genderLoader = document.getElementById("gender-chart-loader");

  const showLoaders = () => {
    if (deptLoader) {
      deptLoader.style.display = "flex";
      setTimeout(() => (deptLoader.style.opacity = "1"), 10);
    }
    if (genderLoader) {
      genderLoader.style.display = "flex";
      setTimeout(() => (genderLoader.style.opacity = "1"), 10);
    }
  };

  showLoaders();

  try {
    const stats = await apiCall("/statistics");
    if (stats.success) {
      // Update Stat Cards
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setTxt("totalEmployees", stats.data.totalEmployees || 0);
      setTxt("activeEmployees", stats.data.activeEmployees || 0);
      setTxt(
        "totalDepartments",
        stats.data.departments ? Object.keys(stats.data.departments).length : 0
      );
      setTxt("recentActivities", stats.data.activityToday || 0);

      // Render Charts
      // Delay slightly for render stability
      // Render Charts with Staggered Effect
      // 1. Department Chart first
      requestAnimationFrame(() => {
        renderDepartmentChart(stats.data.departments);
        // Hide Dept Loader
        if (deptLoader) {
          deptLoader.style.opacity = "0";
          setTimeout(() => {
            deptLoader.style.display = "none";
          }, 300);
        }

        // 2. Gender Chart after delay
        setTimeout(() => {
          renderGenderChart(stats.data.byGender);
          // Hide Gender Loader
          if (genderLoader) {
            genderLoader.style.opacity = "0";
            setTimeout(() => {
              genderLoader.style.display = "none";
            }, 300);
          }
        }, 400); // 400ms delay for Stagger effect
      });

      // Render Recent Activity List
      renderActivityList(stats.data.recentActivities);
    }
  } catch (error) {
    console.error("Dashboard load error:", error);
    // showToast("Không thể tải dashboard", "error");
  } finally {
    // Loaders handled individually
  }
}

function renderDepartmentChart(departments) {
  const canvas = document.getElementById("departmentChart");
  if (!canvas) return;

  // Destroy previous instance if exists to prevent overlapping
  if (window.deptChartInstance) window.deptChartInstance.destroy();

  const labels = Object.keys(departments);
  const data = Object.values(departments);
  const ctx = canvas.getContext("2d");

  window.deptChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Số lượng nhân sự",
          data: data,
          backgroundColor: [
            "#000000",
            "#e30613",
            "#4a4a4a",
            "#9b9b9b",
            "#d1d1d1",
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { display: false } },
        y: { grid: { display: false } },
      },
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: "easeOutQuart",
      },
    },
  });
}

function renderGenderChart(genders) {
  const canvas = document.getElementById("genderChart");
  if (!canvas) return;

  if (window.genderChartInstance) window.genderChartInstance.destroy();

  const ctx = canvas.getContext("2d");
  window.genderChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Nam", "Nữ"],
      datasets: [
        {
          data: [genders.Nam, genders.Nữ],
          backgroundColor: ["#000000", "#e30613"],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: {
              family: "'Helvetica Neue', 'Arial', sans-serif",
              weight: "bold",
            },
            usePointStyle: true,
            padding: 20,
          },
        },
      },
      maintainAspectRatio: false,
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 1000,
        easing: "easeOutQuart",
      },
    },
  });
}

function renderActivityList(activities) {
  const list = document.getElementById("activityList");
  if (!list) return;
  list.innerHTML = "";

  if (!activities || activities.length === 0) {
    list.innerHTML = '<div class="activity-item">Chưa có hoạt động nào.</div>';
    return;
  }

  activities.slice(0, 5).forEach((activity) => {
    const item = document.createElement("div");
    item.className = "activity-item";
    const date = new Date(activity.time);
    const timeString = date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateString = date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });

    item.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
            <strong>${activity.user}</strong> ${activity.description}
            <div style="font-size: 0.75rem; color: #666; margin-top: 4px;">${
              activity.type === "new_user" ? "Thành viên mới" : "Cập nhật CV"
            }</div>
            </div>
            <div style="text-align: right;">
                <span style="font-size: 0.875rem; color: var(--color-gray-700); display: block;">${timeString}</span>
                <span style="font-size: 0.75rem; color: #999;">${dateString}</span>
            </div>
        </div>
        `;
    list.appendChild(item);
  });
}

// =============================================================================
// SECTION: USERS
// =============================================================================
let allUsers = [];

async function loadUsersSection() {
  try {
    const response = await apiCall("/users");
    if (response.success) {
      allUsers = response.data;

      // Init Pagination
      if (!window.pagination) window.pagination = {}; // Ensure global exists
      if (!window.pagination.usersPagination) {
        new PaginationHelper(10, renderUsers, "usersPagination");
      }
      window.pagination.usersPagination.setItems(allUsers);

      await populateDepartmentFilter(); // Populate filter dynamically
    }
  } catch (error) {
    console.error("Load users error:", error);
    showToast("Không thể tải danh sách người dùng", "error");
  }
}

async function populateDepartmentFilter() {
  const select = document.getElementById("filterDepartment");
  if (!select || select.options.length > 1) return; // Avoid repopulating if already done

  try {
    const departments = await apiCall("/departments");
    if (departments && Array.isArray(departments)) {
      departments.forEach((dept) => {
        const option = document.createElement("option");
        option.value = dept.name;
        option.textContent = dept.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Failed to load departments for filter:", error);
  }
}

function renderUsers(users) {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;

  tbody.innerHTML = ""; // Clear existing rows

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4">Không có dữ liệu</td></tr>`;
    return;
  }

  users.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
                <td>
                    <div class="flex items-center gap-2">
                        <img src="${
                          user.avatar
                            ? `${API_BASE_URL}${user.avatar}`
                            : "../shared/default-avatar.png"
                        }" alt="" class="avatar-sm">
                        <div class="flex flex-col">
                            <div class="flex flex-wrap gap-1 mb-1">
                                ${(user.tags || [])
                                  .map(
                                    (tag) =>
                                      `<span class="user-tag">${tag}</span>`
                                  )
                                  .join("")}
                            </div>
                            <span class="font-bold">${user.name}</span>
                        </div>
                    </div>
                </td>
                <td>${user.employeeId}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${getRoleBadgeClass(user.role)}">
                        ${getRoleName(user.role)}
                    </span>
                </td>
                <td>${user.department || "-"}</td>
                <td>${user.position || "-"}</td>
                <td><span class="badge ${
                  user.status === "Đang công tác"
                    ? "badge-success"
                    : "badge-danger"
                }">${user.status}</span></td>
                <td>
                    <div class="flex items-center gap-1 justify-center">
                        <button class="btn-icon" title="Xem chi tiết" onclick="viewUserDetail('${
                          user.id
                        }')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        ${
                          user.status === "Đang công tác"
                            ? `<button class="btn-icon text-red" title="Khóa tài khoản" onclick="confirmLockUser('${user.id}')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                               </button>`
                            : `<button class="btn-icon text-green" title="Mở khóa tài khoản" onclick="confirmUnlockUser('${user.id}')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                               </button>`
                        }
                        <button class="btn-icon text-red" title="Xóa" onclick="deleteUser('${
                          user.id
                        }')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                </td>
            `;
    tbody.appendChild(tr);
  });
}

function getRoleName(role) {
  switch (role) {
    case "admin":
      return "Admin Tổng";
    case "dept_admin":
      return "Admin Đơn vị";
    case "user":
      return "Cán bộ";
    default:
      return role;
  }
}

function getRoleBadgeClass(role) {
  switch (role) {
    case "admin":
      return "badge-danger";
    case "dept_admin":
      return "badge-warning";
    case "user":
      return "badge-primary";
    default:
      return "badge-gray";
  }
}

function filterUsers() {
  const searchValue = document.getElementById("searchUser").value.toLowerCase();
  const departmentFilter = document.getElementById("filterDepartment").value;
  const roleFilter = document.getElementById("filterRole").value;
  const statusFilter = document.getElementById("filterStatus").value;

  let filtered = allUsers.filter((user) => {
    const matchSearch =
      !searchValue ||
      user.name.toLowerCase().includes(searchValue) ||
      user.email.toLowerCase().includes(searchValue) ||
      (user.employeeId && user.employeeId.toLowerCase().includes(searchValue));

    const matchDepartment =
      !departmentFilter || user.department === departmentFilter;
    const matchRole = !roleFilter || user.role === roleFilter;
    const matchStatus = !statusFilter || user.status === statusFilter;

    return matchSearch && matchDepartment && matchStatus && matchRole;
  });

  if (window.pagination && window.pagination.usersPagination) {
    window.pagination.usersPagination.setItems(filtered);
  } else {
    renderUsers(filtered);
  }
}

async function openAddUserModal() {
  await Promise.all([
    populateDepartmentSelect("newDepartment"),
    populateUserRoleSelect("newRole"),
  ]);
  showModal("addUserModal");
}

async function populateDepartmentSelect(targetId = "newDepartment") {
  const select = document.getElementById(targetId);
  if (!select) return;

  // Keep the default option
  select.innerHTML = '<option value="">Chọn phòng ban</option>';

  try {
    const departments = await apiCall("/departments");
    if (departments && Array.isArray(departments)) {
      departments.forEach((dept) => {
        const option = document.createElement("option");
        option.value = dept.name; // Storing name as per current user model
        option.textContent = dept.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Failed to load departments for dropdown:", error);
    showToast("Không thể tải danh sách phòng ban", "error");
  }
}

async function populateUserRoleSelect(targetId = "newRole") {
  const select = document.getElementById(targetId);
  if (!select) return;

  // Default option
  select.innerHTML = '<option value="user">Cán bộ (Mặc định)</option>';

  try {
    const result = await apiCall("/roles");
    const roles = result.data || [];

    // Filter out "user" if it's already key 'user', or just append all unique roles
    roles.forEach((role) => {
      // Avoid duplicate default 'user' if it exists in DB with id 'user'
      if (role.id === "user") {
        select.querySelector('option[value="user"]').textContent = role.name;
        return;
      }

      const option = document.createElement("option");
      option.value = role.id;
      option.textContent = role.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load roles for user modal:", error);
    // Fallback to hardcoded basic roles if API fails?
  }
}

async function handleAddUser(event) {
  event.preventDefault();
  if (!validateForm("addUserForm")) return;

  const newUser = {
    name: document.getElementById("newName").value,
    employeeId: document.getElementById("newEmployeeId").value,
    email: document.getElementById("newEmail").value,
    phone: document.getElementById("newPhone").value,
    password: document.getElementById("newPassword").value,
    department: document.getElementById("newDepartment").value,
    role: document.getElementById("newRole").value, // Capture Role
    position: document.getElementById("newPosition").value,
  };

  try {
    document.body.style.cursor = "wait";
    await apiCall("/users", {
      method: "POST",
      body: JSON.stringify(newUser),
    });

    const msg = newUser.password
      ? "Thêm cán bộ thành công"
      : "Thêm cán bộ thành công. Mật khẩu mặc định: password123";

    showToast(msg, "success");
    closeModal("addUserModal");
    document.getElementById("addUserForm").reset();
    loadUsersSection(); // Reload list
  } catch (error) {
    console.error("Add user error:", error);
    showToast(error.message || "Không thể thêm cán bộ", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

async function handleUpdateUser(event) {
  event.preventDefault();
  const userId = document.getElementById("userId").value;

  if (!userId) return;

  const data = {
    name: document.getElementById("userName").value,
    email: document.getElementById("userEmail").value,
    phone: document.getElementById("userPhone").value,
    department: document.getElementById("userDept").value,
    role: document.getElementById("userRole").value,
    position: document.getElementById("userPosition").value,
    status: document.getElementById("userStatus").value,
    employeeId: document.getElementById("userEmployeeId").value,
    // Extended fields
    birthDate: document.getElementById("userDob").value,
    idCard: document.getElementById("userIdCard").value,
    address: document.getElementById("userAddress").value,
    unionDate: document.getElementById("userJoinDate").value,
    tags: document
      .getElementById("userTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter((t) => t), // Collect Tags
  };

  try {
    document.body.style.cursor = "wait";
    await apiCall(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    showToast("Cập nhật thông tin thành công");
    closeModal("userModal");
    loadUsersSection(); // Reload list
    // Optionally refresh detail view if needed, but we closed it.
  } catch (error) {
    console.error("Update user error:", error);
    showToast(error.message || "Không thể cập nhật thông tin", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

function deleteUser(userId) {
  document.getElementById("deleteUserId").value = userId;
  showModal("deleteConfirmationModal");
}

async function handleDeleteUser() {
  const userId = document.getElementById("deleteUserId").value;
  if (!userId) return;

  try {
    document.body.style.cursor = "wait";
    await apiCall(`/users/${userId}`, { method: "DELETE" });
    showToast("Đã xóa cán bộ thành công");
    closeModal("deleteConfirmationModal");
    loadUsersSection(); // Refresh list
  } catch (error) {
    console.error("Delete user error:", error);
    showToast(error.message || "Không thể xóa cán bộ", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

async function toggleUserStatus(userId, newStatus) {
  try {
    document.body.style.cursor = "wait";
    await apiCall(`/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    showToast(`Đã chuyển trạng thái thành "${newStatus}"`, "success");
    loadUsersSection();
  } catch (error) {
    console.error("Toggle status error:", error);
    showToast(error.message || "Không thể thay đổi trạng thái", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

// User Modal Functions
function switchUserTab(tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((el) => (el.style.display = "none"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((el) => el.classList.remove("active"));

  document.getElementById(`tab-${tabName}`).style.display = "block";

  // Find button with onclick="switchUserTab('tabName')"
  const btns = document.querySelectorAll(".tab-btn");
  btns.forEach((btn) => {
    if (btn.getAttribute("onclick").includes(tabName))
      btn.classList.add("active");
  });

  // Toggle Edit Button Visibility
  const editBtn = document.getElementById("btnEditUser");
  if (editBtn) {
    if (tabName === "cvs") {
      editBtn.style.display = "none";
    } else {
      editBtn.style.display = "inline-block";
    }
  }
}

async function viewUserDetail(userId) {
  // Find user by ID
  const user = allUsers.find((u) => u.id == userId);

  if (!user) {
    console.error("User not found: ", userId);
    return;
  }

  // Set global index/ID for Edit button
  window.currentUserIndex = userId;

  // Reset Tab
  switchUserTab("profile");

  // 1. Populate Header & Basic Info
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const imgEl = document.getElementById("viewUserAvatarImg");
  const initialsEl = document.getElementById("viewUserAvatarInitials");

  if (user.avatar) {
    // Fix: Handle relative paths vs absolute vs API-relative
    let avatarUrl = user.avatar;
    if (!avatarUrl.startsWith("http")) {
      // If it starts with /uploads, it's a static file, not an API route
      // We need to strip '/api' from API_BASE_URL if it exists to get the server root
      const serverBase = API_BASE_URL.replace(/\/api\/?$/, "");
      avatarUrl = `${serverBase}${user.avatar.startsWith("/") ? "" : "/"}${
        user.avatar
      }`;
    }

    imgEl.src = avatarUrl;
    imgEl.style.display = "block";
    initialsEl.style.display = "none";
  } else {
    initialsEl.textContent = initials;
    initialsEl.style.display = "block";
    imgEl.style.display = "none";
  }

  document.getElementById("viewUserName").textContent = user.name.toUpperCase();
  // document.getElementById("viewUserRole").textContent = user.role.toUpperCase(); // Ensure badge looks right
  const roleBadge = document.getElementById("viewUserRole");
  roleBadge.className = `badge ${getRoleBadgeClass(user.role)}`;
  roleBadge.textContent = getRoleName(user.role);

  document.getElementById("viewUserCode").textContent = user.employeeId || "-";
  document.getElementById("viewUserEmail").textContent = user.email;
  document.getElementById("viewUserPhone").textContent = user.phone;
  document.getElementById("viewUserDept").textContent = user.department || "-";
  document.getElementById("viewUserPosition").textContent =
    user.position || "-";
  document.getElementById("viewUserDate").textContent = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("vi-VN")
    : "-";

  // Extended Info (Assuming these exist in the user object from the main list, or need separate fetch?
  // Usually admin list might be partial. Let's assume list has enough or we can fetch details if needed.
  // Based on users.json, 'dob', 'idCard', 'address', 'unionDate' are fields.)
  document.getElementById("viewUserDob").textContent = user.birthDate
    ? new Date(user.birthDate).toLocaleDateString("vi-VN")
    : "-";
  document.getElementById("viewUserIdCard").textContent = user.idCard || "-";
  document.getElementById("viewUserAddress").textContent = user.address || "-";
  document.getElementById("viewUserJoinDate").textContent = user.unionDate
    ? new Date(user.unionDate).toLocaleDateString("vi-VN")
    : "-";

  const statusEl = document.getElementById("viewUserStatus");
  statusEl.innerHTML = `<span class="badge ${
    user.status === "Đang công tác" ? "" : "badge-gray"
  }">${user.status}</span>`;

  // 2. Load CVs
  loadUserCVs(user.id);
  // 3. Load History
  loadUserHistory(user.id);

  // 4. Fill Edit Form with Tags
  document.getElementById("userId").value = user.id;
  document.getElementById("userName").value = user.name;
  document.getElementById("userEmail").value = user.email;
  document.getElementById("userPhone").value = user.phone;
  document.getElementById("userDept").value = user.department;
  document.getElementById("userRole").value = user.role;
  document.getElementById("userPosition").value = user.position;
  document.getElementById("userStatus").value = user.status;
  document.getElementById("userEmployeeId").value = user.employeeId;
  document.getElementById("userDob").value = user.birthDate;
  document.getElementById("userIdCard").value = user.idCard;
  document.getElementById("userAddress").value = user.address;
  document.getElementById("userJoinDate").value = user.unionDate;
  // Tags
  document.getElementById("userTags").value = (user.tags || []).join(", ");

  showModal("viewUserModal");
}

async function loadUserHistory(userId) {
  const listContainer = document.getElementById("viewUserHistoryList");
  listContainer.innerHTML =
    '<li class="text-gray-500 text-center">Đang tải lịch sử...</li>';

  try {
    const response = await apiCall(`/users/${userId}/history`);
    const history = response.data || [];

    if (history.length === 0) {
      listContainer.innerHTML =
        '<li class="text-gray-500 text-center">Chưa có lịch sử biến động nào.</li>';
      return;
    }

    listContainer.innerHTML = history
      .map((item) => {
        const date = new Date(item.timestamp).toLocaleDateString("vi-VN");
        const time = new Date(item.timestamp).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Color coding for types
        let typeColor = "#666";
        if (item.type === "LUAN_CHUYEN") typeColor = "orange";
        if (item.type === "THANG_CHUC") typeColor = "green";
        if (item.type === "THAY_DOI_TRANG_THAI") typeColor = "red";

        return `
        <li style="border-left: 2px solid ${typeColor}; padding-left: 15px; margin-bottom: 15px; position: relative;">
            <div style="position: absolute; left: -6px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: ${typeColor};"></div>
            <div style="font-size: 0.85rem; color: #999;">${date} - ${time}</div>
            <div style="font-weight: 600; color: #333;">${item.fieldName}</div>
            <div style="font-size: 0.95rem;">
                <span style="color: #666; text-decoration: line-through;">${
                  item.oldValue || "(Trống)"
                }</span>
                <i class="fas fa-arrow-right" style="font-size: 0.7em; margin: 0 5px;"></i>
                <span style="color: #000; font-weight: 500;">${
                  item.newValue
                }</span>
            </div>
            ${
              item.note
                ? `<div style="font-size: 0.8em; color: gray; font-style: italic;">"${item.note}"</div>`
                : ""
            }
        </li>`;
      })
      .join("");
  } catch (error) {
    console.error("Failed to load history:", error);
    listContainer.innerHTML =
      '<li class="text-red-500 text-center">Không thể tải lịch sử.</li>';
  }
}

async function loadUserCVs(userId) {
  const listContainer = document.getElementById("viewUserCVList");
  listContainer.innerHTML =
    '<p class="text-gray-500">Đang tải danh sách CV...</p>';

  try {
    const result = await apiCall(`/cv/user/${userId}`);
    const cvs = result.data || [];

    if (cvs.length === 0) {
      listContainer.innerHTML =
        '<p class="text-gray-500">Người dùng này chưa tải lên CV nào.</p>';
      return;
    }

    listContainer.innerHTML = cvs
      .map(
        (cv) => `
            <div class="cv-item">
                <div class="cv-info">
                    <div style="font-weight: 600;">${cv.filename}</div>
                    <div style="font-size: 0.8em; color: gray;">
                        ${new Date(cv.uploadDate).toLocaleDateString(
                          "vi-VN"
                        )} - ${(cv.size / 1024).toFixed(1)} KB
                    </div>
                </div>
                <div class="cv-actions" style="display: flex; gap: 4px;">
                     <button class="btn-icon" title="Xem trước" onclick="previewCV('${
                       cv.id
                     }', '${cv.filename}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon text-blue" title="Tải xuống" onclick="downloadCV('${
                      cv.id
                    }', '${cv.filename}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  } catch (error) {
    console.error("Failed to load CVs:", error);
    listContainer.innerHTML =
      '<p class="text-red-500">Không thể tải danh sách CV.</p>';
  }
}

async function previewCV(cvId, filename) {
  showModal("viewCVModal");
  document.getElementById("viewCVTitle").textContent = filename;

  const container = document.getElementById("cvPreviewContainer");
  const msgDiv = document.getElementById("cvPreviewMessage");

  // Reset
  container.innerHTML = "";
  msgDiv.style.display = "flex";
  msgDiv.innerHTML = '<p class="text-gray-700">Đang tải...</p>';

  // Wire Header Download Button
  const btn = document.getElementById("headerDownloadBtn");
  btn.onclick = () => downloadCV(cvId, filename);

  try {
    // Determine type from filename
    const ext = filename.split(".").pop().toLowerCase();

    // Explicitly handle PDF vs Images
    const isPdf = ext === "pdf";
    const isImage = ["jpg", "jpeg", "png"].includes(ext);

    const blob = await apiCall(`/cv/${cvId}/view`);
    const url = URL.createObjectURL(blob);

    if (isPdf) {
      // Use EMBED for PDFs to trigger native viewer
      container.innerHTML = `<embed src="${url}" type="application/pdf" width="100%" height="100%" />`;
      msgDiv.style.display = "none";
    } else if (isImage) {
      // Use IMG for Images
      container.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block; margin: auto;" />`;
      msgDiv.style.display = "none";
    } else if (blob.type.includes("text/html")) {
      // Use IFRAME for converted HTML (DOCX)
      container.innerHTML = `<iframe src="${url}" style="width: 100%; height: 100%; border: none; background: white;"></iframe>`;
      msgDiv.style.display = "none";
    } else {
      // For non-viewable (like docx), show download link
      msgDiv.innerHTML = `
            <p class="text-gray-700">Định dạng .${ext} không hỗ trợ xem trước trên trình duyệt.</p>
            <a href="${url}" download="${filename}" class="btn btn-primary">Tải xuống</a>
         `;
    }
  } catch (error) {
    console.error("Preview error:", error);
    msgDiv.innerHTML = `<p class="text-red-500">Không thể tải file: ${error.message}</p>`;
  }
}

async function downloadCV(cvId, filename) {
  try {
    const blob = await apiCall(`/cv/${cvId}/download`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    showToast("Lỗi tải xuống: " + error.message, "error");
  }
}

async function editUser(userId) {
  // Use userId if passed, or fallback to window.currentUserIndex which might be an ID now
  const id = userId || window.currentUserIndex;
  const user = allUsers.find((u) => u.id == id);

  if (!user) {
    showToast("Không tìm thấy thông tin người dùng", "error");
    return;
  }

  // Populate User Modal
  document.getElementById("modalTitleUserId").textContent =
    "CHỈNH SỬA NGƯỜI DÙNG";
  document.getElementById("userId").value = user.id;
  document.getElementById("userName").value = user.name;
  document.getElementById("userEmail").value = user.email;
  document.getElementById("userPhone").value = user.phone;
  document.getElementById("userEmployeeId").value = user.employeeId;
  document.getElementById("userDob").value = user.birthDate
    ? user.birthDate.split("T")[0]
    : "";
  document.getElementById("userIdCard").value = user.idCard || "";
  document.getElementById("userAddress").value = user.address || "";
  document.getElementById("userJoinDate").value = user.unionDate
    ? user.unionDate.split("T")[0]
    : "";

  // Populate Dropdowns
  await Promise.all([
    populateDepartmentSelect("userDept"),
    populateUserRoleSelect("userRole"),
  ]);

  // Set Department
  const deptSelect = document.getElementById("userDept");
  if (deptSelect) {
    deptSelect.value = user.department;
    // Fallback if exact value match fails (e.g. slight name diff), strictly we trust ID or Name consistency
  }

  // Set Role
  const roleSelect = document.getElementById("userRole");
  if (roleSelect) {
    roleSelect.value = user.role || "user";
  }

  document.getElementById("userPosition").value = user.position;
  document.getElementById("userStatus").value = user.status;

  showModal("userModal");
}

// Duplicate toggleUserStatus removed. Using the one defined significantly earlier or later if unified.
// Actually, I will remove this block entirely as it conflicts with the other definition.

// =============================================================================
// SECTION: DEPARTMENTS
// =============================================================================
let departments = [];
let departmentToDelete = null;

async function loadDepartmentsSection() {
  try {
    const data = await apiCall("/departments");
    departments = data || [];

    // Init Pagination
    if (!window.pagination.departmentsPagination) {
      new PaginationHelper(10, renderDepartments, "departmentsPagination");
    }
    window.pagination.departmentsPagination.setItems(departments);
  } catch (error) {
    console.error(error);
    showToast("Không thể tải danh sách phòng ban", "error");
  }
}

function renderDepartments(items) {
  const tbody = document.getElementById("departmentTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!items || items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center p-4">Không có dữ liệu.</td></tr>';
    return;
  }

  items.forEach((dep) => {
    const tr = document.createElement("tr");
    const date = dep.createdAt
      ? new Date(dep.createdAt).toLocaleDateString("vi-VN")
      : "-";
    tr.innerHTML = `
            <td><strong>${dep.name}</strong></td>
            <td class="text-gray-700">${dep.description || "-"}</td>
            <td>${date}</td>
            <td>
                <div class="flex items-center gap-1 justify-center">
                    <button class="btn-icon text-blue" title="Sửa" onclick="openEditDepartmentModal('${
                      dep.id
                    }')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="btn-icon text-red" title="Xóa" onclick="openDeleteDepartmentModal('${
                      dep.id
                    }')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

function renderDepartmentsTable() {
  // Deprecated, use filtered pagination
}

function openCreateDepartmentModal() {
  document.getElementById("modalTitle").textContent = "THÊM PHÒNG BAN";
  document.getElementById("departmentForm").reset();
  document.getElementById("depId").value = "";
  document.getElementById("departmentModal").classList.add("active");
}

function openEditDepartmentModal(id) {
  const dep = departments.find((d) => d.id === id);
  if (!dep) return;
  document.getElementById("modalTitle").textContent = "CHỈNH SỬA PHÒNG BAN";
  document.getElementById("depId").value = dep.id;
  document.getElementById("depName").value = dep.name;
  document.getElementById("depDescription").value = dep.description || "";
  document.getElementById("departmentModal").classList.add("active");
}

function closeDepartmentModal() {
  document.getElementById("departmentModal").classList.remove("active");
}

async function handleSaveDepartment(e) {
  e.preventDefault();
  const id = document.getElementById("depId").value;
  const name = document.getElementById("depName").value;
  const description = document.getElementById("depDescription").value;

  try {
    if (id) {
      await apiCall(`/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, description }),
      });
      showToast("Cập nhật thành công!", "success");
    } else {
      await apiCall("/departments", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      showToast("Tạo mới thành công!", "success");
    }
    closeDepartmentModal();
    loadDepartmentsSection();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function openDeleteDepartmentModal(id) {
  departmentToDelete = departments.find((d) => d.id === id);
  if (!departmentToDelete) return;
  document.getElementById("deleteDepName").textContent =
    departmentToDelete.name;
  document
    .getElementById("confirmDeleteDepartmentModal")
    .classList.add("active");
}

function closeDeleteDepartmentModal() {
  departmentToDelete = null;
  document
    .getElementById("confirmDeleteDepartmentModal")
    .classList.remove("active");
}

async function confirmDeleteDepartment() {
  if (!departmentToDelete) return;
  try {
    await apiCall(`/departments/${departmentToDelete.id}`, {
      method: "DELETE",
    });
    showToast("Đã xóa phòng ban!", "success");
    closeDeleteDepartmentModal();
    loadDepartmentsSection();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function filterDepartments() {
  const input = document.getElementById("searchDepartment");
  const filter = input.value.toLowerCase();

  if (!departments) return;

  const filtered = departments.filter((dep) => {
    const name = (dep.name || "").toLowerCase();
    const desc = (dep.description || "").toLowerCase();
    return name.includes(filter) || desc.includes(filter);
  });

  if (window.pagination && window.pagination.departmentsPagination) {
    window.pagination.departmentsPagination.setItems(filtered);
  } else {
    renderDepartments(filtered);
  }
}

// =============================================================================
// SECTION: REPORTS
// =============================================================================
const sampleReports = [
  {
    id: "R001",
    name: "Báo cáo nhân sự Tháng 10",
    type: "Tháng",
    createdBy: "Admin",
    createdDate: "2023-10-31",
    status: "Hoàn thành",
  },
  {
    id: "R002",
    name: "Biến động nhân sự Q3",
    type: "Quý",
    createdBy: "Admin",
    createdDate: "2023-10-01",
    status: "Hoàn thành",
  },
  {
    id: "R003",
    name: "Danh sách khen thưởng 2023",
    type: "Năm",
    createdBy: "Admin",
    createdDate: "2023-11-15",
    status: "Đang xử lý",
  },
];

function loadReportsSection() {
  const tbody = document.getElementById("reportsTableBody");
  if (!tbody) return;
  tbody.innerHTML = sampleReports
    .map(
      (report, index) => `
        <tr>
            <td class="code">${report.id}</td>
            <td>${report.name}</td>
            <td><span class="badge badge-outline">${report.type}</span></td>
            <td>${report.createdBy}</td>
            <td>${formatDate(report.createdDate)}</td>
            <td><span class="badge">${report.status}</span></td>
            <td class="report-actions">
                <button class="btn btn-small btn-outline" onclick="viewReport(${index})">Xem</button>
                <button class="btn btn-small btn-outline" onclick="downloadReport(${index})">Tải</button>
                <button class="btn btn-small btn-outline" onclick="deleteReport(${index})">Xóa</button>
            </td>
        </tr>
    `
    )
    .join("");
}

function handleGenerateReport(event) {
  event.preventDefault();
  if (!validateForm("reportForm")) return;
  const exportFormat = document.getElementById("exportFormat").value;
  document.body.style.cursor = "wait";
  setTimeout(() => {
    showToast(
      `Báo cáo đã được tạo thành công! (${exportFormat.toUpperCase()})`,
      "success"
    );
    loadReportsSection();
    document.body.style.cursor = "default";
  }, 2000);
}

function scheduleReport() {
  showAlert("Chức năng lên lịch báo cáo đang được phát triển.");
}

function generateQuickReport(type) {
  let reportName =
    type === "monthly"
      ? "Báo cáo tháng"
      : type === "quarterly"
        ? "Báo cáo quý"
        : type === "annual"
          ? "Báo cáo năm"
          : "Báo cáo tùy chỉnh";
  document.body.style.cursor = "wait";
  setTimeout(() => {
    showToast(`${reportName} đã được tạo thành công!`, "success");
    document.body.style.cursor = "default";
  }, 1500);
}

function viewReport(index) {
  showAlert(
    `Xem báo cáo: ${sampleReports[index].name}\n\nChức năng đang phát triển`
  );
}

function downloadReport(index) {
  showToast("Tải xuống thành công!", "success");
}

async function deleteReport(index) {
  if (
    await showConfirm(
      `Bạn có chắc muốn xóa báo cáo: ${sampleReports[index].name}?`
    )
  ) {
    showToast("Đã xóa báo cáo", "success");
  }
}

function filterReports(searchValue) {
  const term = searchValue ? searchValue.toLowerCase() : "";
  const filtered = allReports.filter((r) => {
    return (
      !term ||
      r.name.toLowerCase().includes(term) ||
      (r.type && r.type.toLowerCase().includes(term)) ||
      (r.createdBy && r.createdBy.toLowerCase().includes(term))
    );
  });

  if (!window.pagination) window.pagination = {};
  if (!window.pagination.reportsPagination) {
    new PaginationHelper(10, renderReports, "reportsPagination");
  }

  window.pagination.reportsPagination.setItems(filtered);
}

// =============================================================================
// SECTION: PERMISSIONS
// =============================================================================
// =============================================================================
// SECTION: PERMISSIONS
// =============================================================================
let allRoles = [];

async function loadPermissionsSection() {
  console.log("Loading Permissions Section...");
  const tbody = document.getElementById("rolesTableBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="4" class="text-center">Đang tải...</td></tr>';

  try {
    const result = await apiCall("/roles");
    allRoles = result.data || [];
    renderRolesTable(allRoles);
  } catch (error) {
    console.error("Load roles error:", error);
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-red-500">Lỗi khi tải dữ liệu</td></tr>';
  }
}

function renderRolesTable(roles) {
  const tbody = document.getElementById("rolesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (roles && roles.length > 0) {
    roles.forEach((role) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td><code>${role.id}</code></td>
                <td class="font-bold">${role.name}</td>
                <td>${role.description || ""}</td>
                <td>
                    <div class="flex items-center gap-1 justify-center">
                        <button class="btn-icon text-blue" title="Sửa" onclick="openEditRoleModal('${
                          role.id
                        }')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button class="btn-icon text-red" title="Xóa" onclick="deleteRole('${
                          role.id
                        }')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center">Chưa có dữ liệu</td></tr>';
  }
}

function openRoleModal() {
  document.getElementById("roleModalTitle").textContent = "THÊM ROLE MỚI";
  document.getElementById("roleForm").reset();
  document.getElementById("roleId").value = "";
  document.getElementById("roleDepartmentGroup").style.display = "none";
  populateRoleDepartments(); // Function to load departments into role modal
  showModal("roleModal");
}

async function populateRoleDepartments() {
  const select = document.getElementById("roleDepartment");
  if (!select) return;
  select.innerHTML = '<option value="">Chọn phòng ban áp dụng</option>';

  try {
    const departments = await apiCall("/departments");
    if (departments && Array.isArray(departments)) {
      departments.forEach((dept) => {
        const option = document.createElement("option");
        option.value = dept.name;
        option.textContent = dept.name;
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.error("Failed to load departments", e);
  }
}

function handleRoleTypeChange() {
  const type = document.getElementById("roleType").value;
  const deptGroup = document.getElementById("roleDepartmentGroup");
  const deptInput = document.getElementById("roleDepartment");

  if (type === "dept_admin") {
    deptGroup.style.display = "block";
    deptInput.required = true;
  } else {
    deptGroup.style.display = "none";
    deptInput.required = false;
    deptInput.value = "";
  }
}

function openEditRoleModal(roleId) {
  const role = allRoles.find((r) => r.id === roleId);
  if (!role) return;

  document.getElementById("roleModalTitle").textContent = "CHỈNH SỬA ROLE";
  document.getElementById("roleId").value = role.id;
  document.getElementById("roleName").value = role.name;
  document.getElementById("roleType").value = role.type || "user";
  document.getElementById("roleDesc").value = role.description || "";

  populateRoleDepartments().then(() => {
    if (role.department) {
      document.getElementById("roleDepartment").value = role.department;
    }
    handleRoleTypeChange(); // Trigger visibility check
  });

  showModal("roleModal");
}

async function handleSaveRole(e) {
  e.preventDefault();

  const name = document.getElementById("roleName").value;
  // Auto-generate ID if empty (New Role)
  let id = document.getElementById("roleId").value;
  if (!id) {
    id = removeVietnameseTones(name).toLowerCase().replace(/\s+/g, "_");
  }

  const roleData = {
    id: id,
    name: name,
    type: document.getElementById("roleType").value,
    description: document.getElementById("roleDesc").value,
    department: document.getElementById("roleDepartment").value,
  };

  try {
    document.body.style.cursor = "wait";
    await apiCall("/roles", {
      method: "POST",
      body: JSON.stringify(roleData),
    });
    showToast("Lưu Role thành công!", "success");
    closeModal("roleModal");
    loadPermissionsSection();
  } catch (error) {
    showToast(error.message || "Lỗi khi lưu Role", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

async function deleteRole(roleId) {
  if (await showConfirm(`Bạn có chắc muốn xóa Role '${roleId}'?`)) {
    try {
      await apiCall(`/roles/${roleId}`, { method: "DELETE" });
      showToast("Đã xóa Role", "success");
      loadPermissionsSection();
    } catch (error) {
      showToast(error.message || "Không thể xóa Role", "error");
    }
  }
}

function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
}

// =============================================================================
// SECTION: REPORTS
// =============================================================================

let allReports = [];

async function loadReportsSection() {
  document.getElementById("reportsTableBody").innerHTML =
    '<tr><td colspan="7" class="text-center">Đang tải dữ liệu...</td></tr>';

  try {
    const [reportsRes, deptsRes] = await Promise.all([
      apiCall("/reports"),
      apiCall("/departments"),
    ]);

    if (reportsRes.success) {
      allReports = reportsRes.data;

      // Init Pagination
      if (!window.pagination) window.pagination = {};
      if (!window.pagination.reportsPagination) {
        new PaginationHelper(10, renderReports, "reportsPagination");
      }

      // Filter logic
      const currentSearch =
        document.querySelector('input[placeholder="Tìm kiếm báo cáo..."]')
          ?.value || "";
      filterReports(currentSearch);
    }

    // Populate Report Department Dropdown
    const deptSelect = document.getElementById("reportDepartment");
    if (deptSelect && Array.isArray(deptsRes)) {
      deptSelect.innerHTML = '<option value="">Tất cả phòng ban</option>';
      deptsRes.forEach((dept) => {
        deptSelect.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;
      });
    }
  } catch (error) {
    console.error("Load reports error:", error);
    document.getElementById("reportsTableBody").innerHTML =
      '<tr><td colspan="7" class="text-center text-red">Lỗi tải dữ liệu</td></tr>';
  }
}

function renderReports(reports) {
  const tbody = document.getElementById("reportsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!reports || reports.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">Chưa có báo cáo nào</td></tr>';
    return;
  }

  reports.forEach((report) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><code>${report.id}</code></td>
            <td class="font-bold">${report.name}</td>
            <td>${getReportTypeName(report.type)}</td>
            <td>${report.createdBy}</td>
            <td>${new Date(report.createdAt).toLocaleString("vi-VN")}</td>
            <td><span class="badge badge-success">${report.status}</span></td>
            <td>
                <div class="flex items-center gap-1 justify-center">
                    <button class="btn-icon text-blue" title="Tải xuống" onclick="downloadReport('${
                      report.id
                    }')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <!-- View/Delete buttons can be added here if needed, but for now only Download exists in this block -->
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

function getReportTypeName(type) {
  const map = {
    general: "Danh sách trích ngang (Tổng hợp)",
    movement: "Báo cáo Biến động Nhân sự",
    classifications: "Báo cáo Phân loại & Quy hoạch",
  };
  return map[type] || type;
}

async function handleGenerateReport(e) {
  e.preventDefault();

  const type = document.getElementById("reportType").value;
  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;
  const department = document.getElementById("reportDepartment").value;
  const format = "csv";

  if (!type) {
    showToast("Vui lòng chọn loại báo cáo", "error");
    return;
  }

  try {
    document.body.style.cursor = "wait";
    const res = await apiCall("/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        reportType: type,
        dateFrom,
        dateTo,
        department,
        exportFormat: format,
      }),
    });

    if (res.success && res.data) {
      showToast("Tạo báo cáo thành công", "success");
      // Reload list
      loadReportsSection();
    }
  } catch (error) {
    showToast(error.message || "Lỗi tạo báo cáo", "error");
  } finally {
    document.body.style.cursor = "default";
  }
}

function toggleScheduleOptions() {
  const radios = document.getElementsByName("freq");
  let freq = "daily";
  for (let r of radios) if (r.checked) freq = r.value;

  document.getElementById("weeklyOptions").style.display =
    freq === "weekly" ? "block" : "none";
  document.getElementById("monthlyOptions").style.display =
    freq === "monthly" ? "block" : "none";

  // Update visual styles for freq-tab labels
  document.querySelectorAll(".freq-tab").forEach((tab) => {
    const radio = tab.querySelector('input[name="freq"]');
    const span = tab.querySelector("span");
    if (radio && radio.checked) {
      // Active tab
      tab.style.borderColor = "#dc2626";
      tab.style.background = "#fef2f2";
      if (span) span.style.color = "#dc2626";
    } else {
      // Inactive tab
      tab.style.borderColor = "#e0e0e0";
      tab.style.background = "white";
      if (span) span.style.color = "";
    }
  });
}

function selectDay(el) {
  // Week select: Single select for now to match Cron simplicity, or allow multi? User said "Select day".
  // Let's assume Single Select for simplicity of Cron generation on client side.
  const btns = el.parentElement.querySelectorAll(".day-btn");
  btns.forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("selectedWeekDay").value = el.dataset.val;
}

function selectMonthDay(el, day) {
  const btns = el.parentElement.querySelectorAll(".day-btn");
  btns.forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("selectedMonthDay").value = day;
}

// Reset schedule form to default state
function resetScheduleForm() {
  document.getElementById("scheduleId").value = "";
  document.getElementById("scheduleName").value = "";
  document.getElementById("scheduleReportType").value = "general";
  document.getElementById("scheduleDataPeriod").value = "previous_day";
  document.getElementById("scheduleDepartment").value = "";
  document.getElementById("scheduleRecipients").value = "";
  document.getElementById("scheduleTime").value = "08:00";
  document.getElementById("customDateRange").style.display = "none";
  document.getElementById("scheduleDateFrom").value = "";
  document.getElementById("scheduleDateTo").value = "";

  // Reset frequency to daily
  const dailyRadio = document.querySelector(
    'input[name="freq"][value="daily"]'
  );
  if (dailyRadio) {
    dailyRadio.checked = true;
    toggleScheduleOptions(); // This will also update visual styles
  }

  // Reset hidden values
  document.getElementById("selectedWeekDay").value = "1";
  document.getElementById("selectedMonthDay").value = "1";

  // Clear all day button active states
  document
    .querySelectorAll(".day-btn")
    .forEach((btn) => btn.classList.remove("active"));

  // Reset modal title
  document.querySelector("#scheduleReportModal .modal-title").textContent =
    "LÊN LỊCH BÁO CÁO";
}

function scheduleReport() {
  resetScheduleForm(); // Reset form to clean state
  document.getElementById("scheduleReportModal").classList.add("active");
  // Toggle default options
  toggleScheduleOptions();

  // Populate departments
  const deptSelect = document.getElementById("scheduleDepartment");
  const reportDeptSelect = document.getElementById("reportDepartment");
  if (reportDeptSelect && deptSelect) {
    deptSelect.innerHTML = reportDeptSelect.innerHTML;
  }
}

// Toggle Custom Date Inputs
function toggleCustomDateRange() {
  const period = document.getElementById("scheduleDataPeriod").value;
  const customDiv = document.getElementById("customDateRange");
  if (period === "custom") {
    customDiv.style.display = "grid";
  } else {
    customDiv.style.display = "none";
  }
}

async function handleSaveSchedule(e) {
  e.preventDefault();

  const id = document.getElementById("scheduleId").value;
  const name = document.getElementById("scheduleName").value;
  const reportType = document.getElementById("scheduleReportType").value;
  const dataPeriod = document.getElementById("scheduleDataPeriod").value;
  const department = document.getElementById("scheduleDepartment").value;

  // Custom Range Logic
  let customRange = null;
  if (dataPeriod === "custom") {
    const dFrom = document.getElementById("scheduleDateFrom").value;
    const dTo = document.getElementById("scheduleDateTo").value;
    if (!dFrom || !dTo) {
      showToast("Vui lòng chọn Từ ngày và Đến ngày", "error");
      return;
    }
    customRange = { from: dFrom, to: dTo };
  }

  // Get Freq
  const radios = document.getElementsByName("freq");
  let freq = "daily";
  for (let r of radios) if (r.checked) freq = r.value;

  // Get Time
  const timeStr = document.getElementById("scheduleTime").value || "08:00";
  const [hour, minute] = timeStr.split(":");

  const recipients = document
    .getElementById("scheduleRecipients")
    .value.split(",")
    .map((s) => s.trim());

  // Cron
  let cronExp = `${minute} ${hour} * * *`;
  if (freq === "weekly") {
    const day = document.getElementById("selectedWeekDay").value;
    cronExp = `${minute} ${hour} * * ${day}`;
  } else if (freq === "monthly") {
    const day = document.getElementById("selectedMonthDay").value;
    cronExp = `${minute} ${hour} ${day} * *`;
  }

  const endpoint = id ? `/reports/schedule/${id}` : "/reports/schedule/create";
  const method = id ? "PUT" : "POST";

  try {
    const res = await apiCall(endpoint, {
      method: method,
      body: JSON.stringify({
        name,
        reportType,
        dataPeriod,
        customRange, // Add custom range
        department,
        cronExpression: cronExp,
        recipients,
      }),
    });

    if (res.success) {
      showToast(id ? "Đã cập nhật!" : "Đã lên lịch!", "success");
      closeModal("scheduleReportModal");
      loadScheduledTasks();
      // Reset form
      document.getElementById("scheduleForm").reset();
      document.getElementById("scheduleId").value = "";
      document.getElementById("customDateRange").style.display = "none";
      document.querySelector("#scheduleReportModal .modal-title").textContent =
        "LÊN LỊCH BÁO CÁO";
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Edit Schedule
function editSchedule(id) {
  const task = window.scheduledTasksCache.find(
    (t) => String(t.id) === String(id)
  );
  if (!task) return;

  // Fill Basic Info
  document.getElementById("scheduleId").value = task.id;
  document.getElementById("scheduleName").value = task.name;
  document.getElementById("scheduleReportType").value = task.reportType;
  document.getElementById("scheduleDataPeriod").value =
    task.dataPeriod || "previous_day";
  document.getElementById("scheduleDepartment").value = task.department || "";
  document.getElementById("scheduleRecipients").value = Array.isArray(
    task.recipients
  )
    ? task.recipients.join(",")
    : task.recipients;

  // Handle Custom Date Range
  // Handle Custom Date Range
  if (task.dataPeriod === "custom") {
    document.getElementById("customDateRange").style.display = "grid";

    if (task.customRange) {
      // Format YYYY-MM-DD
      const f = new Date(task.customRange.from);
      const t = new Date(task.customRange.to);
      if (!isNaN(f))
        document.getElementById("scheduleDateFrom").valueAsDate = f;
      if (!isNaN(t)) document.getElementById("scheduleDateTo").valueAsDate = t;
    } else {
      // Reset or leave empty? Leave empty to force user to fill
      document.getElementById("scheduleDateFrom").value = "";
      document.getElementById("scheduleDateTo").value = "";
    }
  } else {
    document.getElementById("customDateRange").style.display = "none";
  }

  // Parse Cron
  // ... (Existing cron parsing logic - kept simple for this snippet, assume daily mostly)
  // Actually, I need to preserve the cron parsing logic from previous version or rewrite it?
  // The previous viewed `editSchedule` wasn't shown fully. I should assume it needs full implementation.
  // Assuming standard cron 'M H * * *'.
  const parts = task.cronExpression.split(" ");
  if (parts.length >= 5) {
    document.getElementById("scheduleTime").value = `${parts[1].padStart(
      2,
      "0"
    )}:${parts[0].padStart(2, "0")}`;
    // Basic freq detection
    // Remove all active classes first
    document
      .querySelectorAll(".freq-tab")
      .forEach((tab) => tab.classList.remove("active"));

    if (parts[4] !== "*") {
      // Weekly
      const weeklyRadio = document.querySelector(
        'input[name="freq"][value="weekly"]'
      );
      weeklyRadio.checked = true;
      weeklyRadio.closest(".freq-tab").classList.add("active");
      document.getElementById("selectedWeekDay").value = parts[4];
      toggleScheduleOptions();
    } else if (parts[2] !== "*") {
      // Monthly
      const monthlyRadio = document.querySelector(
        'input[name="freq"][value="monthly"]'
      );
      monthlyRadio.checked = true;
      monthlyRadio.closest(".freq-tab").classList.add("active");
      document.getElementById("selectedMonthDay").value = parts[2];
      toggleScheduleOptions();
    } else {
      // Daily
      const dailyRadio = document.querySelector(
        'input[name="freq"][value="daily"]'
      );
      dailyRadio.checked = true;
      dailyRadio.closest(".freq-tab").classList.add("active");
      toggleScheduleOptions();
    }
  }

  document.querySelector("#scheduleReportModal .modal-title").textContent =
    "CẬP NHẬT LỊCH";
  openModal("scheduleReportModal");
}

// Toggle Status Function
async function toggleTaskStatus(id, checkbox) {
  const active = checkbox.checked;
  try {
    const res = await apiCall(`/reports/schedule/${id}/toggle`, {
      method: "PUT",
      body: JSON.stringify({ active }),
    });
    if (res.success) {
      showToast(res.message, "success");
      const label =
        checkbox.parentElement.parentElement.querySelector(".status-text");
      if (label) label.textContent = active ? "Đang chạy" : "Tạm dừng";
    } else {
      checkbox.checked = !active;
      showToast(res.message || "Lỗi cập nhật", "error");
    }
  } catch (e) {
    checkbox.checked = !active;
    showToast("Lỗi kết nối", "error");
  }
}

async function loadScheduledTasks() {
  const tbody = document.getElementById("scheduledTasksBody");
  if (!tbody) return;

  // Global store for edit
  window.scheduledTasksCache = [];

  try {
    const res = await apiCall("/reports/schedule/list");
    if (res.success && Array.isArray(res.data)) {
      window.scheduledTasksCache = res.data; // Cache for edit
      if (res.data.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center">Chưa có lịch nào.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data
        .map((t) => {
          const mapType = {
            general: "Tổng hợp",
            movement: "Biến động",
            classifications: "Phân loại",
          };
          return `
                    <tr>
                        <td>${t.name}</td>
                        <td>${mapType[t.reportType] || t.reportType}</td>
                        <td>${t.cronExpression}</td>
                        <td>${t.recipients}</td>
                        <td>
                            <div class="flex items-center gap-1">
                                <label class="switch m-0">
                                    <input type="checkbox" ${
                                      t.active ? "checked" : ""
                                    } onchange="toggleTaskStatus('${
                                      t.id
                                    }', this)">
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </td>
                        <td>
                            <div class="flex items-center gap-1 justify-center">
                                <button class="btn-icon text-blue" title="Chỉnh sửa" onclick="editSchedule('${
                                  t.id
                                }')">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                </button>
                                <button class="btn-icon text-red" title="Xóa" onclick="deleteSchedule('${
                                  t.id
                                }')">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
        })
        .join("");
    }
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-red">Lỗi tải dữ liệu</td></tr>';
  }
}

function editSchedule_deprecated(id) {
  const task = window.scheduledTasksCache.find((t) => t.id === id);
  if (!task) return;

  document.getElementById("scheduleId").value = task.id;
  document.getElementById("scheduleName").value = task.name;
  document.getElementById("scheduleReportType").value = task.reportType;
  if (task.department)
    document.getElementById("scheduleDepartment").value = task.department;
  if (task.dataPeriod)
    document.getElementById("scheduleDataPeriod").value = task.dataPeriod;

  // Parse recipients
  const recips = Array.isArray(task.recipients)
    ? task.recipients.join(", ")
    : task.recipients;
  document.getElementById("scheduleRecipients").value = recips;

  // Parse Cron to UI
  const parts = task.cronExpression.split(" ");
  const minute = parts[0];
  const hour = parts[1];
  const dayMonth = parts[2];
  const dayWeek = parts[4];

  document.getElementById("scheduleTime").value = `${hour.padStart(
    2,
    "0"
  )}:${minute.padStart(2, "0")}`;

  // Determine Freq
  let freq = "daily";
  if (dayWeek !== "*") {
    freq = "weekly";
    document.getElementById("selectedWeekDay").value = dayWeek;
  } else if (dayMonth !== "*") {
    freq = "monthly";
    document.getElementById("selectedMonthDay").value = dayMonth;
  }

  // Set Radio
  const radios = document.getElementsByName("freq");
  for (let r of radios) {
    if (r.value === freq) r.checked = true;
  }
  toggleScheduleOptions();

  // Set Active Buttons
  if (freq === "weekly") {
    document.querySelectorAll("#weeklyOptions .day-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.val === dayWeek);
    });
  }

  // Show Modal
  scheduleReport();
  document.querySelector("#scheduleReportModal .modal-title").textContent =
    "CẬP NHẬT CẤU HÌNH";
}

async function deleteSchedule(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa lịch này không?")) return;
  try {
    const res = await apiCall(`/reports/schedule/${id}`, { method: "DELETE" });
    if (res.success) {
      showToast("Đã xóa lịch", "success");
      loadScheduledTasks();
    } else {
      showToast(res.message, "error");
    }
  } catch (e) {
    showToast("Lỗi xóa lịch", "error");
  }
}

// Modify loadReportsSection to also load tasks
// Modify loadReportsSection to also load tasks
const originalLoadReports = loadReportsSection;
loadReportsSection = async function () {
  if (typeof originalLoadReports === "function") {
    await originalLoadReports();
  }
  loadScheduledTasks();
};

// Fix: Improve Quick Report Logic
function generateQuickReport(period) {
  const now = new Date();
  let from, to;
  const type = "general"; // Default

  if (period === "monthly") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === "quarterly") {
    const quarter = Math.floor(now.getMonth() / 3);
    from = new Date(now.getFullYear(), quarter * 3, 1);
    to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  } else if (period === "annual") {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear(), 11, 31);
  } else {
    document.getElementById("reportType").focus();
    return;
  }

  // Pre-fill form
  document.getElementById("reportType").value = type;
  document.getElementById("dateFrom").value = from.toISOString().split("T")[0];
  document.getElementById("dateTo").value = to.toISOString().split("T")[0];

  // Notify and Auto-submit?
  showToast(
    `Đã chọn Báo cáo ${
      period === "monthly" ? "Tháng" : period === "quarterly" ? "Quý" : "Năm"
    }`,
    "info"
  );
}

function filterReports(query) {
  if (!query) {
    renderReports(allReports);
    return;
  }
  const lower = query.toLowerCase();
  const filtered = allReports.filter(
    (r) =>
      r.name.toLowerCase().includes(lower) ||
      r.id.includes(lower) ||
      r.createdBy.toLowerCase().includes(lower)
  );
  renderReports(filtered);
}

function downloadReport(id) {
  downloadReportFile(id);
}

async function downloadReportFile(id) {
  try {
    showToast("Đang chuẩn bị file tải xuống...", "info");
    const response = await fetch(`${API_BASE_URL}/reports/${id}/download`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Try to get filename from header
    const disposition = response.headers.get("Content-Disposition");
    let filename = `baocao-${id}.csv`;
    if (disposition && disposition.indexOf("attachment") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, "");
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast("Tải xuống hoàn tất", "success");
  } catch (e) {
    showToast("Không thể tải xuống báo cáo", "error");
    console.error(e);
  }
}

// =============================================================================
// SECTION: AUDIT LOGS
// =============================================================================

async function loadAuditLogs() {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';

  try {
    const logs = await apiCall("/audit-logs");

    if (!logs || logs.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center">Chưa có dữ liệu nhật ký</td></tr>';
      return;
    }

    // Store for modal access
    window.auditData = logs;

    // Init Pagination
    if (!window.pagination.auditPagination) {
      new PaginationHelper(10, renderAuditLogs, "auditPagination");
    }
    window.pagination.auditPagination.setItems(logs);
  } catch (error) {
    console.error("Load audit logs error:", error);
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-red">Không thể tải nhật ký</td></tr>';
  }
}

function renderAuditLogs(items) {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Chưa có dữ liệu nhật ký</td></tr>';
    return;
  }

  tbody.innerHTML = items
    .map(
      (log) => `
      <tr>
        <td>${new Date(log.timestamp).toLocaleString("vi-VN")}</td>
        <td>
            <div>${log.actorName}</div>
        </td>
        <td>
            <span class="badge ${getActionBadgeClass(
              log.actionType
            )}">${formatActionType(log.actionType)}</span>
        </td>
        <td>${log.target || "-"}</td>
        <td>
            <span class="badge ${
              log.status === "SUCCESS" ? "badge-success" : "badge-danger"
            }">
                ${log.status === "SUCCESS" ? "Thành công" : "Thất bại"}
            </span>
        </td>
        <td>
            <div class="flex items-center gap-1 justify-center">
                <button class="btn-icon" title="Xem chi tiết" onclick="openAuditDetail('${
                  log.id
                }')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </div>
        </td>
      </tr>
    `
    )
    .join("");
}

function formatActionType(type) {
  const map = {
    LOGIN: "Đăng nhập",
    CREATE_USER: "Thêm cán bộ",
    UPDATE_USER: "Cập nhật cán bộ",
    DELETE_USER: "Xóa cán bộ",
    UPDATE_STATUS: "Đổi trạng thái",
    GENERATE_REPORT: "Tạo báo cáo",
  };
  return map[type] || type;
}

function getActionBadgeClass(type) {
  if (type === "LOGIN") return "badge-info";
  if (type.includes("DELETE")) return "badge-danger";
  if (type.includes("CREATE")) return "badge-success";
  return "badge-primary";
}

// --- Audit Detail Logic ---
let currentAuditJson = "";

function openAuditDetail(logId) {
  // Since we don't have the full object here, we need to find it from the rendered DOM or fetch it.
  // Ideally, loadAuditLogs should store the data in a variable.
  // For simplicity, we'll re-fetch or assume 'window.auditData' exists.
  // Better: Pass the object directly is hard in HTML string.
  // Strategy: Store data in window.auditData when loading.

  const log = window.auditData
    ? window.auditData.find((l) => l.id === logId)
    : null;
  if (!log) return;

  const modal = document.getElementById("auditDetailModal");
  const summary = document.getElementById("auditDetailSummary");
  const content = document.getElementById("auditJsonContent");

  // Summary Text
  summary.innerHTML = `
    <strong>${log.actorName}</strong> ${formatActionType(log.actionType)}
    <span class="text-blue">${log.target || "hệ thống"}</span>
    lúc ${new Date(log.timestamp).toLocaleString("vi-VN")}
  `;

  // Format JSON
  currentAuditJson = JSON.stringify(log, null, 2);
  content.innerHTML = syntaxHighlight(currentAuditJson);

  // Show
  modal.classList.add("active");
}

function copyAuditJson() {
  if (!currentAuditJson) return;
  navigator.clipboard
    .writeText(currentAuditJson)
    .then(() => {
      showToast("Đã sao chép JSON nhật ký", "success");
    })
    .catch(() => {
      showToast("Không thể sao chép", "error");
    });
}

function syntaxHighlight(json) {
  if (typeof json != "string") {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = "json-number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "json-key";
        } else {
          cls = "json-string";
        }
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return '<span class="' + cls + '">' + match + "</span>";
    }
  );
}
// =============================================================================
// SECTION: PAGINATION HELPER
// =============================================================================
class PaginationHelper {
  constructor(itemsPerPage = 10, renderCallback, containerId) {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
    this.renderCallback = renderCallback;
    this.containerId = containerId;
    this.allItems = [];

    // Ensure global registry exists
    if (!window.pagination) window.pagination = {};
    window.pagination[containerId] = this;
  }

  setItems(items) {
    this.allItems = items || [];
    this.currentPage = 1;
    this.update();
  }

  update() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const currentItems = this.allItems.slice(start, end);

    // Render items
    this.renderCallback(currentItems);

    // Render Controls
    this.renderControls();
  }

  renderControls() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const totalPages = Math.ceil(this.allItems.length / this.itemsPerPage);

    // Hide if no pages or single page? (Optional: keep single page for info)
    if (this.allItems.length === 0) {
      container.innerHTML = "";
      return;
    }

    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(
      this.currentPage * this.itemsPerPage,
      this.allItems.length
    );

    let html = `
        <div class="page-info">
            ${startItem}-${endItem} / ${this.allItems.length}
        </div>
        <div class="flex items-center gap-1">
            <button class="page-btn" ${
              this.currentPage === 1 ? "disabled" : ""
            } 
                onclick="window.pagination['${this.containerId}'].prev()">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    // Smart Page Numbers
    // Always show 1, Last, and Current +/- 1
    for (let i = 1; i <= totalPages; i++) {
      // Show if:
      // 1. First or Last Page
      // 2. Within 1 step of current page
      if (
        i === 1 ||
        i === totalPages ||
        (i >= this.currentPage - 1 && i <= this.currentPage + 1)
      ) {
        html += `<button class="page-btn ${
          i === this.currentPage ? "active" : ""
        }" 
                onclick="window.pagination['${
                  this.containerId
                }'].goTo(${i})">${i}</button>`;
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        html += `<span class="px-1 text-gray-400">...</span>`;
      }
    }

    html += `
            <button class="page-btn" ${
              this.currentPage === totalPages ? "disabled" : ""
            } 
                onclick="window.pagination['${this.containerId}'].next()">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    container.innerHTML = html;
  }

  prev() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.update();
    }
  }

  next() {
    const totalPages = Math.ceil(this.allItems.length / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.update();
    }
  }

  goTo(page) {
    this.currentPage = page;
    this.update();
  }
}

// Initialize Global Object
if (!window.pagination) window.pagination = {};

/* SIDEBAR LOGIC */
function switchTab(id) {
  window.location.hash = id;
}

function updateSidebarUI() {
  const hash = window.location.hash.replace("#", "") || "dashboard";
  // Remove active from all
  document
    .querySelectorAll(".sidebar-nav .nav-item")
    .forEach((el) => el.classList.remove("active"));

  // Add active to current
  const activeLink = document.querySelector(
    `.sidebar-nav .nav-item[href='#${hash}']`
  );
  if (activeLink) activeLink.classList.add("active");

  // Update Page Title
  const titleMap = {
    dashboard: "Dashboard",
    users: "Quản lý Nhân sự",
    departments: "Quản lý Phòng ban",
    reports: "Báo cáo & Thống kê",
    permissions: "Phân quyền",
    audit: "Nhật ký Hoạt động",
  };
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.innerText = titleMap[hash] || "Quản trị hệ thống";
}

window.addEventListener("hashchange", updateSidebarUI);
window.addEventListener("load", updateSidebarUI);

// Safe Edit Schedule Function (Overrides previous definitions)
function editSchedule(id) {
  try {
    const task = window.scheduledTasksCache.find(
      (t) => String(t.id) === String(id)
    );
    if (!task) {
      showToast("Không tìm thấy dữ liệu cấu hình", "error");
      return;
    }

    // Basic Info
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal("scheduleId", task.id);
    setVal("scheduleName", task.name);
    setVal("scheduleReportType", task.reportType);
    setVal("scheduleDepartment", task.department || "");
    setVal("scheduleDataPeriod", task.dataPeriod || "previous_day");

    // Recipients
    const recips = Array.isArray(task.recipients)
      ? task.recipients.join(",")
      : task.recipients;
    setVal("scheduleRecipients", recips);

    // Custom Date Range
    if (task.dataPeriod === "custom") {
      document.getElementById("customDateRange").style.display = "grid";
      if (task.customRange) {
        if (task.customRange.from)
          document.getElementById("scheduleDateFrom").value =
            task.customRange.from.split("T")[0];
        if (task.customRange.to)
          document.getElementById("scheduleDateTo").value =
            task.customRange.to.split("T")[0];
      }
    } else {
      document.getElementById("customDateRange").style.display = "none";
    }

    // Cron & Time
    const cron = task.cronExpression || "0 08 * * *";
    const parts = cron.split(" ");
    // parts: [minute, hour, dayMonth, month, dayWeek]
    if (parts.length >= 5) {
      const timeStr = `${parts[1].padStart(2, "0")}:${parts[0].padStart(2, "0")}`;
      setVal("scheduleTime", timeStr);

      // Reset frequency styles
      document.querySelectorAll(".freq-tab").forEach((tab) => {
        tab.classList.remove("active");
        tab.style.borderColor = "#e0e0e0";
        tab.style.background = "white";
        const span = tab.querySelector("span");
        if (span) span.style.color = "";
      });

      let freq = "daily";
      if (parts[4] !== "*") freq = "weekly";
      else if (parts[2] !== "*") freq = "monthly";

      // Set Frequency
      const radio = document.querySelector(
        `input[name='freq'][value='${freq}']`
      );
      if (radio) {
        radio.checked = true;
        // Trigger style update
        toggleScheduleOptions();
      }

      // Set Specific Days
      if (freq === "weekly") {
        document.getElementById("selectedWeekDay").value = parts[4];
        // Highlight week buttons
        setTimeout(() => {
          document
            .querySelectorAll("#weeklyOptions .day-btn")
            .forEach((btn) => {
              btn.classList.remove("active");
              if (btn.dataset.val === parts[4]) btn.classList.add("active");
            });
        }, 50);
      } else if (freq === "monthly") {
        document.getElementById("selectedMonthDay").value = parts[2];
        // Highlight month buttons
        setTimeout(() => {
          document
            .querySelectorAll("#monthlyOptions .day-btn")
            .forEach((btn) => {
              btn.classList.remove("active");
              if (btn.innerText.trim() === parts[2])
                btn.classList.add("active");
            });
        }, 50);
      }
    }

    // Open Modal safely
    document.querySelector("#scheduleReportModal .modal-title").textContent =
      "CẬP NHẬT CẤU HÌNH";

    // Inline open modal logic
    const m = document.getElementById("scheduleReportModal");
    if (m) {
      m.classList.add("active");
      document.body.style.overflow = "hidden";
    } else {
      console.error("Modal not found");
    }
  } catch (err) {
    console.error("Error in editSchedule:", err);
    showToast("Lỗi hiển thị form sửa: " + err.message, "error");
  }
}

// =============================================================================
// CONFIRMATION MODAL HELPERS
// =============================================================================

let onConfirmCallback = null;

function showConfirmationModal(message, callback) {
  const modal = document.getElementById("confirmationModal");
  if (!modal) {
    // Fallback if modal not present
    if (confirm(message)) {
      callback();
    }
    return;
  }

  document.getElementById("confirmationMessage").textContent = message;
  onConfirmCallback = callback;

  // Wire up the button once or ensure it calls the global callback
  const btn = document.getElementById("confirmOkBtn");
  btn.onclick = () => {
    if (onConfirmCallback) onConfirmCallback();
    closeModal("confirmationModal");
  };

  showModal("confirmationModal");
}

// Support older 'await showConfirm()' style if used elsewhere, or refactor consumers.
// For now, let's keep confirmLockUser simple.

function confirmLockUser(userId) {
  // Determine user name for better UX if possible, but ID is sufficient for logic
  const user = allUsers.find((u) => u.id === userId);
  const name = user ? user.name : "này";
  showConfirmationModal(
    `Bạn có chắc chắn muốn KHÓA tài khoản ${name}? Người dùng sẽ không thể đăng nhập.`,
    () => toggleUserStatus(userId, "Nghỉ việc") // Using "Nghỉ việc" as "Locked" map for now
  );
}

function confirmUnlockUser(userId) {
  const user = allUsers.find((u) => u.id === userId);
  const name = user ? user.name : "này";
  showConfirmationModal(
    `Bạn có chắc chắn muốn MỞ KHÓA tài khoản ${name}?`,
    () => toggleUserStatus(userId, "Đang công tác")
  );
}

// Redefine deleteSchedule to use modal (Overrides previous definition)
async function deleteSchedule(id) {
  showConfirmationModal(
    "Bạn có chắc chắn muốn xóa lịch này không?",
    async () => {
      try {
        const res = await apiCall(`/reports/schedule/${id}`, {
          method: "DELETE",
        });
        if (res.success) {
          showToast("Đã xóa lịch", "success");
          loadScheduledTasks();
        } else {
          showToast(res.message, "error");
        }
      } catch (e) {
        showToast("Lỗi xóa lịch", "error");
      }
    }
  );
}

// Helper for other delete actions if needed
function showConfirm(msg) {
  // Legacy support: Wrap promise
  return new Promise((resolve) => {
    showConfirmationModal(msg, () => resolve(true));
    // Note: This simple shim doesn't handle 'Cancel' = resolve(false) well without more logic.
    // For now, let's assume 'deleteRole' etc need refactoring or we rely on the specific modals they use.
    // Actually, deleteRole (line 1586) awaits this.
    // We'll attach a cancel handler to the modal to resolve(false).

    const modal = document.getElementById("confirmationModal");
    const cancelBtn = modal.querySelector(".btn-outline");
    const closeBtn = modal.querySelector(".modal-close");

    const cleanup = () => {
      cancelBtn.onclick = () => closeModal("confirmationModal");
      closeBtn.onclick = () => closeModal("confirmationModal");
    };

    cancelBtn.onclick = () => {
      resolve(false);
      closeModal("confirmationModal");
    };
    closeBtn.onclick = () => {
      resolve(false);
      closeModal("confirmationModal");
    };
  });
}
