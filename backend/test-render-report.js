// Test script to trigger manual report generation on Render
const https = require("https");

const RENDER_URL = "https://hrm-ai-backend.onrender.com";
const ADMIN_EMAIL = "admin@congdoan.vn";
const ADMIN_PASSWORD = "Admin@123";

async function loginAndGenerateReport() {
  console.log("🔐 Step 1: Logging in as admin...\n");

  // Login to get auth token
  const loginData = JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  const loginOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": loginData.length,
    },
  };

  try {
    const token = await new Promise((resolve, reject) => {
      const req = https.request(
        `${RENDER_URL}/api/auth/login`,
        loginOptions,
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode === 200) {
              const response = JSON.parse(data);
              console.log("✅ Login successful!");
              console.log("Token:", response.token?.substring(0, 20) + "...\n");
              resolve(response.token);
            } else {
              reject(new Error(`Login failed: ${res.statusCode} - ${data}`));
            }
          });
        },
      );
      req.on("error", reject);
      req.write(loginData);
      req.end();
    });

    console.log("📊 Step 2: Generating report...\n");

    // Generate report
    const reportData = JSON.stringify({
      type: "general",
      from: "2026-01-15",
      to: "2026-01-20",
      email: "hovanquocthang1708+6@gmail.com",
      department: "",
    });

    const reportOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Length": reportData.length,
      },
    };

    const reportResult = await new Promise((resolve, reject) => {
      const req = https.request(
        `${RENDER_URL}/api/reports/generate`,
        reportOptions,
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            console.log(`Response Status: ${res.statusCode}`);
            console.log("Response Body:", data.substring(0, 500));

            if (res.statusCode === 200) {
              console.log("\n✅ SUCCESS! Report generated and email sent!");
              console.log(
                "📧 Check MailTrap inbox for: hovanquocthang1708+6@gmail.com\n",
              );
              resolve(data);
            } else {
              reject(
                new Error(
                  `Report generation failed: ${res.statusCode} - ${data}`,
                ),
              );
            }
          });
        },
      );
      req.on("error", reject);
      req.write(reportData);
      req.end();
    });
  } catch (error) {
    console.error("\n❌ Test FAILED!");
    console.error("Error:", error.message);
    process.exit(1);
  }
}

loginAndGenerateReport();
