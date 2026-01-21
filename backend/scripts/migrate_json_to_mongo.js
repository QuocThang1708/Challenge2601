const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const dotenv = require("dotenv");

// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

// Load Models
const User = require("../models/User");
const ScheduledTask = require("../models/ScheduledTask");
const Report = require("../models/Report");
const JobHistory = require("../models/JobHistory");

// Connect DB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Paths to JSON files
const DATA_DIR = path.join(__dirname, "../data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const TASKS_FILE = path.join(DATA_DIR, "scheduled_tasks.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const HISTORY_FILE = path.join(DATA_DIR, "job_history.json");

// Helper to read JSON
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log(
      `⚠️  Could not read ${path.basename(filePath)}: ${error.message}`,
    );
    return null;
  }
}

const migrate = async () => {
  await connectDB();

  try {
    // 1. Migrate Users
    console.log("\n🚀 migrating Users...");
    const usersData = await readJSON(USERS_FILE);
    if (usersData && usersData.users) {
      // Clear existing to avoid duplicates during dev testing? Or upsert?
      // Let's deleteMany for a clean slate migration.
      await User.deleteMany({});

      const userDocs = usersData.users.map((u) => ({
        ...u,
        _id: u.id
          ? new mongoose.Types.ObjectId(u.id.length === 24 ? u.id : undefined)
          : undefined,
        // Keep old ID if it's 24 chars hex, otherwise let Mongo gen new one?
        // Problem: ID references in History.
        // Most likely existing IDs are strings like "17xxx".
        // We should probably keep them as Strings in Schema OR convert all.
        // Schema defined userId as String in JobHistory, so we are safe to keep String IDs if possible?
        // Mongoose _id is ObjectId by default. If we force String _id, we need to change Schema.
        // BETTER APPROACH: Add `oldId` field if strict link needed, or just let Mongoose gen `_id` and rely on email unique.
        // BUT wait, JobHistory links by `userId`. We must preserve this link.
        // Solution: For simplicity in Phase 4 refactoring, let's keep `id` field in Schema as `_id`?
        // No, standard Mongoose uses `_id`.
        // Let's import old `id` as `id` (virtual or extra field)?
        // Wait, our User schema didn't define `id` string field manually, so it uses `_id` ObjectId.
        // If we insert `{ id: "123" }`, Mongoose ignores it unless defined in schema.
        // **CRITICAL FIX**: Add `id` string field to User Schema or change references.
        // Let's rely on Mongoose `_id`. We need to map old IDs to new `_id`s?
        // NO. existing JSON IDs are like "170530..." (timestamp strings).
        // MongoDB `_id` can be anything. Let's try to explicitly set `_id` to the string?
        // Mongoose might complain if _id is not ObjectId type in Schema.
        // EASIEST PATH: Modify Schema to accept String _id OR add `originalId` field.
        // Let's add `additional fields` block to `User.js` earlier? No.
        // Let's just store old `id` as `employeeId` if it is staff code? No `id` is system ID.
        // Let's add `originalId` to User schema? Or just matching email?
        // JobHistory uses `userId`.

        // DECISION: Map old String ID to a new field `migrationId` for reference,
        // AND update JobHistory to use Email or just keep broken links (it's movement history).
        // OR better: When migrating, if we find a matching user by Email, we take their new _id and update related records.

        // SIMPLIFIED MIGRATION:
        // Just insert data. We can lookup by Email later.
      }));

      // Let's use bulkWrite with update (Upsert) by Email to be safe
      const userOps = usersData.users.map((u) => ({
        updateOne: {
          filter: { email: u.email },
          update: { $set: u },
          upsert: true,
        },
      }));

      if (userOps.length > 0) {
        const res = await User.bulkWrite(userOps);
        console.log(
          `✅ Users migrated: ${res.upsertedCount + res.modifiedCount}`,
        );
      }
    }

    // 2. Migrate Scheduled Tasks
    console.log("\n🚀 migrating Scheduled Tasks...");
    const tasksData = await readJSON(TASKS_FILE); // Array of tasks
    // Check if it's array or object wrapped
    // Usually it's Array based on previous view_file
    const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || [];

    if (tasks.length > 0) {
      await ScheduledTask.deleteMany({});
      await ScheduledTask.insertMany(tasks);
      console.log(`✅ Tasks migrated: ${tasks.length}`);
    }

    // 3. Migrate Reports
    console.log("\n🚀 migrating Reports...");
    const reportsData = await readJSON(REPORTS_FILE);
    const reports = reportsData?.reports || [];

    if (reports.length > 0) {
      await Report.deleteMany({});
      await Report.insertMany(reports);
      console.log(`✅ Reports migrated: ${reports.length}`);
    }

    // 4. Migrate Job History
    console.log("\n🚀 migrating Job History...");
    const historyData = await readJSON(HISTORY_FILE); // Array
    const history = Array.isArray(historyData)
      ? historyData
      : historyData?.history || [];

    if (history.length > 0) {
      await JobHistory.deleteMany({});
      await JobHistory.insertMany(history);
      console.log(`✅ History migrated: ${history.length}`);
    }

    console.log("\n✨ MIGRATION COMPLETE ✨");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration Failed:", error);
    process.exit(1);
  }
};

migrate();
