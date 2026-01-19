const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const jwt = require("jsonwebtoken");

const DB_PATH = path.join(__dirname, "../data/roles.json");

// Middleware to check if user is authenticated (can reuse global one, but for simplicity here)
async function authMiddleware(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error();
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { roles: [] };
  }
}

// GET /api/roles - List all roles
router.get("/", authMiddleware, async (req, res) => {
  try {
    const db = await readDB();
    res.json({
      success: true,
      data: db.roles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/roles - Create or Update Role
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { id, name, description, type, department } = req.body;
    if (!id || !name) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const db = await readDB();
    const existingIndex = db.roles.findIndex((r) => r.id === id);

    if (existingIndex >= 0) {
      // Update
      db.roles[existingIndex] = {
        ...db.roles[existingIndex],
        name,
        description,
        type,
        department,
      };
    } else {
      // Create
      db.roles.push({
        id,
        name,
        description,
        type: type || "custom",
        department,
      });
    }

    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true, message: "Role saved successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/roles/:id - Delete Role
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDB();

    // Check if system role
    const role = db.roles.find((r) => r.id === id);
    if (!role)
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });

    // Optional: Protect system roles? For now allow deleting but maybe warn.
    // Let's filter it out.
    db.roles = db.roles.filter((r) => r.id !== id);

    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
