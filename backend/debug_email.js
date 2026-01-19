require("dotenv").config();
const scheduler = require("./services/scheduler");
const fs = require("fs");
const path = require("path");

async function test() {
  console.log("--- DEBUG START ---");
  console.log("EMAIL_USER:", process.env.EMAIL_USER ? "LOADED" : "MISSING");

  // 1. Initialize
  await scheduler.initializeScheduler();

  // 2. Load Task
  const TASKS_PATH = path.join(__dirname, "data/scheduled_tasks.json");
  const formatted = fs.readFileSync(TASKS_PATH, "utf8");
  const tasks = JSON.parse(formatted);

  // Find User's Task (Latest)
  const targetId = "1768549353158";
  const task = tasks.find((t) => t.id === targetId);

  if (!task) {
    console.error("❌ Task not found:", targetId);
    return;
  }

  console.log("Found Task:", task.name, task.id);
  await manuallyRun(task);
}

async function manuallyRun(task) {
  console.log("...Attempting to run task via modified cron...");
  task.cronExpression = "* * * * * *"; // Every second
  scheduler.scheduleTask(task);

  // Wait 4 seconds to let cron fire
  await new Promise((r) => setTimeout(r, 4000));
}

test();
