requireAuth();

document.addEventListener("DOMContentLoaded", async () => {
  document.body.style.cursor = "wait";
  try {
    await loadReportData();
    showToast("Dữ liệu báo cáo đã được cập nhật.", "success");
  } catch (error) {
    console.error(error);
    showToast("Lỗi tải dữ liệu báo cáo", "error");
  } finally {
    document.body.style.cursor = "default";
  }
});

async function loadReportData() {
  // 1. Fetch all required data
  const [userData, cvData, qualData] = await Promise.all([
    apiCall("/auth/me").catch((e) => ({ data: {} })),
    apiCall("/cv").catch((e) => ({ data: [] })),
    apiCall("/qualifications").catch((e) => ({ data: {} })),
  ]);

  const user = userData.data || {};
  const cvs = cvData.data || [];
  const quals = qualData.data || {};

  // 2. Process Profile Stats (Donut)
  // Fields to check
  const profileFields = [
    { key: "phone", label: "Liên hệ" },
    { key: "department", label: "Đơn vị" },
    { key: "position", label: "Chức vụ" },
    { key: "birthDate", label: "Ngày sinh" },
    { key: "address", label: "Địa chỉ" },
    { key: "status", label: "Trạng thái" },
  ];

  let filledCount = 0;
  profileFields.forEach((field) => {
    if (user[field.key]) filledCount++;
  });
  const emptyCount = profileFields.length - filledCount;
  const profilePercent = Math.round((filledCount / profileFields.length) * 100);

  // Update Number
  document.getElementById("kpiProfile").textContent = profilePercent + "%";
  document.getElementById("kpiCV").textContent = cvs.length;

  // 3. Process Qualifications (Radar/Counts)
  const eduCount = quals.education ? quals.education.length : 0;
  const expCount = quals.experience ? quals.experience.length : 0;
  const skillCount = quals.skills ? quals.skills.length : 0;
  const certCount = quals.achievements ? quals.achievements.length : 0;

  // Calculate total years of experience
  let totalExpYears = 0;
  if (quals.experience) {
    quals.experience.forEach((exp) => {
      // Helper to parse loose dates
      const parseDateSafe = (dateStr) => {
        if (!dateStr) return null;
        if (["hiện tại", "present", "now"].includes(dateStr.toLowerCase()))
          return new Date();
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const start = parseDateSafe(exp.startDate);
      // If endDate is missing/invalid, check if it's "Present" logic
      // In our parser, empty endYear often implies Present if it's the latest role
      const end =
        parseDateSafe(exp.endDate) ||
        (exp.endDate === "Hiện tại" ? new Date() : null);

      if (start) {
        // If end is null but start exists, assume it ended same year or is current?
        // Better strategy: If end is null, assume IT IS Current only if explicit, otherwise assume 0 duration or ignore?
        // Let's assume Valid Start + Null End = Present (Current Job) for safety in CV context
        const finalEnd = end || new Date();

        const diffTime = Math.abs(finalEnd - start);
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
        totalExpYears += diffYears;
      }
    });
  }

  document.getElementById("kpiSkills").textContent = skillCount;
  document.getElementById("kpiExp").textContent = totalExpYears.toFixed(1);

  // --- RENDER CHARTS ---
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = "#333";

  // A. Profile Completeness (Donut)
  const ctxProfile = document.getElementById("profileChart").getContext("2d");
  new Chart(ctxProfile, {
    type: "doughnut",
    data: {
      labels: ["Đã điền", "Chưa điền"],
      datasets: [
        {
          data: [filledCount, emptyCount],
          backgroundColor: [
            "#FF4D4D", // Red
            "#E5E7EB", // Gray 200
          ],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: function (context) {
              return ` ${context.label}: ${context.raw} mục`;
            },
          },
        },
      },
      cutout: "70%",
    },
  });

  // B. Skills Analysis (Radar)
  const ctxSkills = document.getElementById("skillsChart").getContext("2d");
  new Chart(ctxSkills, {
    type: "bar", // Using Bar for clearer view vs Radar sometimes
    data: {
      labels: ["Học vấn", "Kinh nghiệm", "Kỹ năng", "Chứng chỉ"],
      datasets: [
        {
          label: "Số lượng mục",
          data: [eduCount, expCount, skillCount, certCount],
          backgroundColor: "#000000",
          barPercentage: 0.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });

  // C. Activity (Real Data Aggregation)
  // Aggregate timestamps from all available sources
  const allActivities = [];

  // 1. Account Creation
  if (user.createdAt) {
    allActivities.push(new Date(user.createdAt));
  }

  // 2. CV Uploads
  if (cvs) {
    cvs.forEach((cv) => {
      if (cv.uploadDate) allActivities.push(new Date(cv.uploadDate));
    });
  }

  // 3. Qualifications Additions (Education, Experience, Skills, Achievements)
  // Note: Our current extracted data has createdAt. Manual adds might not yet, but we check safely.
  ["education", "experience", "skills", "achievements"].forEach((category) => {
    if (quals[category]) {
      quals[category].forEach((item) => {
        if (item.createdAt) allActivities.push(new Date(item.createdAt));
      });
    }
  });

  // Prepare Last 6 Months Labels and Buckets
  const last6Months = [];
  const interactions = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthYear = d.toLocaleDateString("vi-VN", { month: "short" }); // e.g. "thg 8"
    last6Months.push(monthYear);

    // Count activities in this month
    const count = allActivities.filter((date) => {
      return (
        date.getMonth() === d.getMonth() &&
        date.getFullYear() === d.getFullYear()
      );
    }).length;

    interactions.push(count);
  }

  const ctxActivity = document.getElementById("activityChart").getContext("2d");
  new Chart(ctxActivity, {
    type: "line",
    data: {
      labels: last6Months,
      datasets: [
        {
          label: "Hoạt động",
          data: interactions,
          borderColor: "#FF4D4D",
          backgroundColor: "rgba(255, 77, 77, 0.1)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#000",
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return ` Có ${context.raw} hoạt động`;
            },
          },
        },
      },
    },
  });
}
