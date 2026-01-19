const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");

const DEPARTMENTS_FILE = path.join(__dirname, "../data/departments.json");

// Helper to read data
async function getDepartments() {
  try {
    const data = await fs.readFile(DEPARTMENTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

// Helper to save data
async function saveDepartments(departments) {
  await fs.writeFile(DEPARTMENTS_FILE, JSON.stringify(departments, null, 2));
}

// GET /api/departments - List all
router.get("/", async (req, res) => {
  try {
    const departments = await getDepartments();
    res.json(departments);
  } catch (error) {
    console.error("Error reading departments:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// POST /api/departments - Create
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Tên phòng ban là bắt buộc" });
    }

    const departments = await getDepartments();

    // Basic duplicate name check
    if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ message: "Tên phòng ban đã tồn tại" });
    }

    const newDep = {
      id: "dep-" + Date.now(),
      name,
      description: description || "",
      createdAt: new Date().toISOString(),
    };

    departments.push(newDep);
    await saveDepartments(departments);

    res.status(201).json(newDep);
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ message: "Lỗi server khi tạo phòng ban" });
  }
});

// PUT /api/departments/:id - Update
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const departments = await getDepartments();
    const index = departments.findIndex((d) => d.id === id);

    if (index === -1) {
      return res.status(404).json({ message: "Không tìm thấy phòng ban" });
    }

    // Check duplicate name if name is changed
    if (name && name !== departments[index].name) {
      if (
        departments.some((d) => d.name.toLowerCase() === name.toLowerCase())
      ) {
        return res.status(400).json({ message: "Tên phòng ban đã tồn tại" });
      }
    }

    const updatedDep = {
      ...departments[index],
      name: name || departments[index].name,
      description:
        description !== undefined
          ? description
          : departments[index].description,
    };

    departments[index] = updatedDep;
    await saveDepartments(departments);

    res.json(updatedDep);
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật" });
  }
});

// DELETE /api/departments/:id - Delete
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let departments = await getDepartments();

    const initialLength = departments.length;
    departments = departments.filter((d) => d.id !== id);

    if (departments.length === initialLength) {
      return res.status(404).json({ message: "Không tìm thấy phòng ban" });
    }

    await saveDepartments(departments);
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ message: "Lỗi server khi xóa" });
  }
});

module.exports = router;
