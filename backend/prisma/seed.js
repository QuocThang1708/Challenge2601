const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@congdoan.vn";
  const rawPassword = "admin123";
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // Check if admin already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    console.log("🌱 Seeding default admin user...");
    await prisma.user.create({
      data: {
        employeeId: "ADMIN001",
        name: "Quản Trị Hệ Thống",
        email: email,
        phone: "0900000000",
        password: hashedPassword,
        gender: "Khác",
        birthDate: new Date("2000-01-01"),
        idCard: "000000000000",
        address: "Hệ thống Quản trị HRM",
        department: "Ban Quản Trị",
        position: "Administrator",
        unionDate: new Date("2020-01-01"),
        status: "Đang công tác",
        role: "admin", // or 'superadmin' based on your logic
      },
    });
    console.log(`✅ Admin created: ${email} / ${rawPassword}`);
  } else {
    console.log("ℹ️ Admin user already exists. Skipping seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
