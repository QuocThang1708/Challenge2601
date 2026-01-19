const fs = require("fs");
const http = require("http");
const path = require("path");

// 1. We need a token. We'll login first.
// Hardcoded credentials for dev environment
const loginPayload = JSON.stringify({
  email: "tuyen.nv@sungroup.com.vn",
  password: "password123",
});

const req = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": loginPayload.length,
    },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      const loginResp = JSON.parse(data);
      if (!loginResp.token) {
        console.error("Login Failed:", loginResp);
        process.exit(1);
      }
      const token = loginResp.token;
      console.log("Login Success. Token acquired.");

      // 2. We need to find the CV ID for 'CV_QC_8_nam_kinh_nghiem.docx'
      // List CVs
      const listReq = http.request(
        {
          hostname: "localhost",
          port: 5000,
          path: "/api/cv",
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
        (listRes) => {
          let listData = "";
          listRes.on("data", (c) => (listData += c));
          listRes.on("end", () => {
            const cvList = JSON.parse(listData).data || [];
            const targetCV = cvList.find((c) =>
              c.filename.includes("CV_QC_8_nam_kinh_nghiem")
            );

            if (!targetCV) {
              console.error(
                "Target CV not found in DB. Please upload it first."
              );
              process.exit(1);
            }

            console.log(`Found CV ID: ${targetCV.id}`);

            // 3. Trigger Extraction
            const extReq = http.request(
              {
                hostname: "localhost",
                port: 5000,
                path: `/api/cv/${targetCV.id}/extract-qualifications`,
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              },
              (extRes) => {
                let extData = "";
                extRes.on("data", (c) => (extData += c));
                extRes.on("end", () => {
                  console.log("Extraction Response:", extData);
                  const parsed = JSON.parse(extData);
                  if (parsed.success && parsed.data.experience.length > 0) {
                    console.log(
                      "✅ VERIFICATION SUCCESS: Extracted data found."
                    );
                  } else {
                    console.error("❌ VERIFICATION FAILED: No data or error.");
                  }
                });
              }
            );
            extReq.end();
          });
        }
      );
      listReq.end();
    });
  }
);

req.write(loginPayload);
req.end();
