const fs = require("fs");
const path = require("path");

const USERS_PATH = path.join(__dirname, "data/users.json");
const HISTORY_PATH = path.join(__dirname, "data/job_history.json");
const REPORTS_PATH = path.join(__dirname, "data/reports.json");

async function runDebug() {
  console.log("Starting Debug...");

  try {
    // 1. Load Data
    console.log("Reading Users...");
    const usersRaw = fs.readFileSync(USERS_PATH, "utf8");
    const usersDb = JSON.parse(usersRaw);
    const users = usersDb.users || [];
    console.log(`Loaded ${users.length} users.`);

    console.log("Reading History...");
    const historyRaw = fs.readFileSync(HISTORY_PATH, "utf8");
    const historyFull = JSON.parse(historyRaw);
    console.log(`Loaded ${historyFull.length} history items.`);

    // 2. Simulate Filter Logic (Movement)
    const dateFrom = "2026-01-01";
    const dateTo = "2026-01-16";
    const department = "Ban Giám Đốc";

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    console.log("Filtering History...");
    let filteredHistory = historyFull.filter((h) => {
      const t = new Date(h.timestamp);
      return t >= from && t <= to;
    });
    console.log(`Filtered: ${filteredHistory.length} items.`);

    // 3. Enrich Logic
    console.log("Enriching...");
    const enriched = filteredHistory.map((h) => {
      const u = users.find((user) => String(user.id) === String(h.userId));
      // Log missing user to be safe
      if (!u)
        console.log(`Warning: User not found for history userId: ${h.userId}`);

      return {
        ...h,
        userName: u ? u.name : "Unknown/Deleted",
        userCode: u ? u.employeeId : "N/A",
      };
    });

    // 4. Refilter by Dept
    // This was the logic in reports.js
    console.log("Refiltering by Dept...");
    const criteriaDept = department; // "Ban Giám Đốc"

    // BUG SUSPICION: In reports.js, I did this:
    /*
          if (criteria.department) {
            enriched = enriched.filter((h) => {
              const u = users.find((user) => user.id === h.userId);
              return u && u.department === criteria.department;
            });
          }
        */
    // Let's replicate EXACTLY:
    let finalEnriched = enriched;
    if (criteriaDept) {
      finalEnriched = enriched.filter((h) => {
        // Wait, in map() above I already matched user.
        // In my actual code in reports.js I re-find the user. Inefficient but shouldn't crash.
        // UNLESS h.userId is somehow causing find to crash? No.
        const u = users.find((user) => String(user.id) === String(h.userId));
        return u && u.department === criteriaDept;
      });
    }
    console.log(`Final Count: ${finalEnriched.length}`);

    // 5. CSV Gen
    console.log("Generating CSV...");
    const header =
      "Thoi Gian,Ma CB,Ho Ten,Loai Bien Dong,Noi Dung,Cu,Moi,Ghi Chu\n";
    const rows = finalEnriched
      .map((h) => {
        const time = new Date(h.timestamp).toLocaleString("vi-VN");
        const typeName =
          h.type === "LUAN_CHUYEN"
            ? "Luân chuyển/Bổ nhiệm"
            : h.type === "THAY_DOI_TRANG_THAI"
            ? "Thay đổi trạng thái"
            : h.type;
        return `"${time}","${h.userCode}","${h.userName}","${typeName}","${h.fieldName}","${h.oldValue}","${h.newValue}","${h.note}"`;
      })
      .join("\n");
    const csvContent = header + rows;
    console.log("CSV Generated successfully.");
    console.log("Preview first 100 chars:", csvContent.substring(0, 100));
  } catch (error) {
    console.error("CRASHED:", error);
  }
}

runDebug();
