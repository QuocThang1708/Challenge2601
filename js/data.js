// ============================================
// HRM System - Mock Data
// Dữ liệu mẫu cho demo
// ============================================

// ============================================
// SAMPLE EMPLOYEES
// ============================================
const sampleEmployees = [
  {
    id: "CB0001",
    name: "Nguyễn Văn An",
    email: "an.nv@congdoan.vn",
    phone: "0901234567",
    gender: "Nam",
    birthDate: "1985-03-15",
    idCard: "001085123456",
    address: "Hà Nội",
    department: "Hành chính",
    position: "Trưởng phòng",
    unionDate: "2010-01-15",
    status: "Đang công tác",
    avatar:
      "https://ui-avatars.com/api/?name=Nguyen+Van+An&background=000&color=fff&size=128",
  },
  {
    id: "CB0002",
    name: "Trần Thị Bình",
    email: "binh.tt@congdoan.vn",
    phone: "0902345678",
    gender: "Nữ",
    birthDate: "1990-07-22",
    idCard: "001090234567",
    address: "Hồ Chí Minh",
    department: "Tài chính",
    position: "Kế toán trưởng",
    unionDate: "2015-06-01",
    status: "Đang công tác",
    avatar:
      "https://ui-avatars.com/api/?name=Tran+Thi+Binh&background=E53935&color=fff&size=128",
  },
  {
    id: "CB0003",
    name: "Lê Văn Cường",
    email: "cuong.lv@congdoan.vn",
    phone: "0903456789",
    gender: "Nam",
    birthDate: "1988-11-10",
    idCard: "001088345678",
    address: "Đà Nẵng",
    department: "Nhân sự",
    position: "Chuyên viên",
    unionDate: "2012-03-20",
    status: "Đang công tác",
    avatar:
      "https://ui-avatars.com/api/?name=Le+Van+Cuong&background=757575&color=fff&size=128",
  },
  {
    id: "CB0004",
    name: "Phạm Thị Dung",
    email: "dung.pt@congdoan.vn",
    phone: "0904567890",
    gender: "Nữ",
    birthDate: "1992-05-18",
    idCard: "001092456789",
    address: "Hải Phòng",
    department: "Kỹ thuật",
    position: "Kỹ sư",
    unionDate: "2016-09-15",
    status: "Đang công tác",
    avatar:
      "https://ui-avatars.com/api/?name=Pham+Thi+Dung&background=000&color=fff&size=128",
  },
  {
    id: "CB0005",
    name: "Hoàng Văn Em",
    email: "em.hv@congdoan.vn",
    phone: "0905678901",
    gender: "Nam",
    birthDate: "1987-09-25",
    idCard: "001087567890",
    address: "Cần Thơ",
    department: "Marketing",
    position: "Trưởng phòng",
    unionDate: "2011-11-10",
    status: "Đang công tác",
    avatar:
      "https://ui-avatars.com/api/?name=Hoang+Van+Em&background=E53935&color=fff&size=128",
  },
];

// ============================================
// CV DATA
// ============================================
const sampleCVs = [
  {
    employeeId: "CB0001",
    versions: [
      {
        id: "cv-001-v1",
        version: "1.0",
        fileName: "CV_NguyenVanAn_v1.pdf",
        uploadDate: "2024-01-15",
        size: "2.3 MB",
        status: "Đã duyệt",
      },
      {
        id: "cv-001-v2",
        version: "2.0",
        fileName: "CV_NguyenVanAn_v2.pdf",
        uploadDate: "2025-06-20",
        size: "2.5 MB",
        status: "Hiện tại",
      },
    ],
  },
];

// ============================================
// QUALIFICATIONS
// ============================================
const sampleQualifications = {
  CB0001: {
    education: [
      {
        degree: "Thạc sĩ Quản trị Kinh doanh",
        institution: "Đại học Kinh tế Quốc dân",
        year: "2008-2010",
        major: "Quản trị Kinh doanh",
      },
      {
        degree: "Cử nhân Kinh tế",
        institution: "Đại học Ngoại thương",
        year: "2003-2007",
        major: "Kinh tế Đối ngoại",
      },
    ],
    experience: [
      {
        position: "Trưởng phòng Hành chính",
        company: "Công đoàn Việt Nam",
        period: "2015 - Hiện tại",
        description: "Quản lý toàn bộ hoạt động hành chính",
      },
      {
        position: "Phó phòng Hành chính",
        company: "Công đoàn Việt Nam",
        period: "2010 - 2015",
        description: "Hỗ trợ quản lý công tác hành chính",
      },
    ],
    skills: [
      { name: "Quản lý dự án", level: 90 },
      { name: "Lãnh đạo đội nhóm", level: 85 },
      { name: "MS Office", level: 95 },
      { name: "Tiếng Anh", level: 80 },
    ],
    achievements: [
      {
        title: "Chiến sĩ thi đua cấp Bộ",
        year: "2022",
        description: "Có nhiều đóng góp xuất sắc cho tổ chức",
      },
      {
        title: "Bằng khen Công đoàn",
        year: "2020",
        description: "Hoàn thành xuất sắc nhiệm vụ",
      },
    ],
  },
};

// ============================================
// STATISTICS
// ============================================
const sampleStatistics = {
  totalEmployees: 156,
  activeEmployees: 142,
  inactiveEmployees: 14,
  departments: {
    "Hành chính": 35,
    "Tài chính": 28,
    "Nhân sự": 22,
    "Kỹ thuật": 45,
    Marketing: 26,
  },
  byGender: {
    Nam: 89,
    Nữ: 67,
  },
  byStatus: {
    "Đang công tác": 142,
    "Nghỉ việc": 10,
    "Chuyển đơn vị": 4,
  },
  recentActivities: [
    {
      id: 1,
      type: "Cập nhật hồ sơ",
      user: "Nguyễn Văn An",
      time: "2026-01-12 09:30",
      description: "Cập nhật thông tin liên hệ",
    },
    {
      id: 2,
      type: "Tải CV",
      user: "Trần Thị Bình",
      time: "2026-01-12 08:15",
      description: "Tải lên CV phiên bản mới",
    },
    {
      id: 3,
      type: "Đăng ký tài khoản",
      user: "Lê Văn Cường",
      time: "2026-01-11 16:45",
      description: "Tạo tài khoản mới",
    },
  ],
};

// ============================================
// REPORTS
// ============================================
const sampleReports = [
  {
    id: "rpt-001",
    name: "Báo cáo tổng hợp cán bộ Quý 1/2026",
    type: "Tổng hợp",
    createdDate: "2026-01-10",
    createdBy: "Admin",
    status: "Hoàn thành",
    fileSize: "1.2 MB",
  },
  {
    id: "rpt-002",
    name: "Thống kê theo đơn vị tháng 12/2025",
    type: "Theo đơn vị",
    createdDate: "2025-12-28",
    createdBy: "Admin",
    status: "Hoàn thành",
    fileSize: "850 KB",
  },
  {
    id: "rpt-003",
    name: "Báo cáo biến động nhân sự 2025",
    type: "Biến động",
    createdDate: "2025-12-31",
    createdBy: "Admin",
    status: "Hoàn thành",
    fileSize: "2.1 MB",
  },
];

// ============================================
// EXPORT DATA
// ============================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    sampleEmployees,
    sampleCVs,
    sampleQualifications,
    sampleStatistics,
    sampleReports,
  };
}
