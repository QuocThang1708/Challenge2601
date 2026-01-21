// Fetch scheduled tasks from Render production
const https = require("https");

const RENDER_URL = "https://hrm-ai-backend.onrender.com";

async function checkScheduledTasks() {
  console.log("🔍 Fetching scheduled tasks from Render...\n");

  // Try to access public API or we need auth
  // Let's check if there's a public endpoint

  const options = {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(
      `${RENDER_URL}/api/reports/schedule/list`,
      options,
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          console.log(`Response Status: ${res.statusCode}`);
          console.log("Response:", data.substring(0, 500));

          if (res.statusCode === 401) {
            console.log("\n⚠️ Endpoint requires authentication.");
            console.log("Next step: Login first to get token.");
          } else if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            console.log("\n✅ Tasks found:", parsed.data?.length || 0);
            if (parsed.data) {
              parsed.data.forEach((task) => {
                console.log(`\n- ID: ${task.id}`);
                console.log(`  Name: ${task.name}`);
                console.log(`  Cron: ${task.cronExpression}`);
                console.log(`  Active: ${task.active}`);
                console.log(`  Recipients: ${task.recipients}`);
              });
            }
          }
          resolve(data);
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

checkScheduledTasks();
