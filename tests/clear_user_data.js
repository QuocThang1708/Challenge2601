const fs = require("fs");
const path = require("path");

const qualPath = path.join(__dirname, "../backend/data/qualifications.json");
const usersPath = path.join(__dirname, "../backend/data/users.json");

// Find user ID for 'hovanquocthang1708' or similar
try {
  const users = JSON.parse(fs.readFileSync(usersPath, "utf8")).users;
  const targetEmail = "hovanquocthang1708@gmail.com";
  const user = users.find((u) => u.email === targetEmail);

  if (!user) {
    console.log("User not found.");
    process.exit(1);
  }

  if (fs.existsSync(qualPath)) {
    let qualDB = JSON.parse(fs.readFileSync(qualPath, "utf8"));
    if (qualDB[user.id]) {
      console.log(`Clearing qualifications for user ${user.name} (${user.id})`);
      qualDB[user.id] = {
        education: [],
        experience: [],
        skills: [],
        achievements: [],
      };
      fs.writeFileSync(qualPath, JSON.stringify(qualDB, null, 2));
      console.log("Done.");
    } else {
      console.log("No qualifications found for this user.");
    }
  }
} catch (e) {
  console.error(e);
}
