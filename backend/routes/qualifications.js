const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const { auth } = require("../middlewares/auth");

const QUAL_PATH = path.join(__dirname, "../data/qualifications.json");

// Read/Write helpers
async function readQualifications() {
  try {
    const data = await fs.readFile(QUAL_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function writeQualifications(data) {
  await fs.writeFile(QUAL_PATH, JSON.stringify(data, null, 2));
}

// GET /api/qualifications - Get user's qualifications
router.get("/", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const userQuals = allQuals[req.user.id] || {
      education: [],
      experience: [],
      skills: [],
      achievements: [],
    };

    res.json({ success: true, data: userQuals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/qualifications/education - Add education
router.post("/education", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();

    if (!allQuals[req.user.id]) {
      allQuals[req.user.id] = {
        education: [],
        experience: [],
        skills: [],
        achievements: [],
      };
    }

    const newEdu = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    allQuals[req.user.id].education.push(newEdu);
    await writeQualifications(allQuals);

    res
      .status(201)
      .json({ success: true, message: "Đã thêm học vấn", data: newEdu });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/qualifications/experience - Add experience
router.post("/experience", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();

    if (!allQuals[req.user.id]) {
      allQuals[req.user.id] = {
        education: [],
        experience: [],
        skills: [],
        achievements: [],
      };
    }

    const newExp = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    allQuals[req.user.id].experience.push(newExp);
    await writeQualifications(allQuals);

    res
      .status(201)
      .json({ success: true, message: "Đã thêm kinh nghiệm", data: newExp });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/qualifications/skills - Add skill
router.post("/skills", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();

    if (!allQuals[req.user.id]) {
      allQuals[req.user.id] = {
        education: [],
        experience: [],
        skills: [],
        achievements: [],
      };
    }

    const newSkill = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    allQuals[req.user.id].skills.push(newSkill);
    await writeQualifications(allQuals);

    res
      .status(201)
      .json({ success: true, message: "Đã thêm kỹ năng", data: newSkill });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/qualifications/achievements - Add achievement
router.post("/achievements", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();

    if (!allQuals[req.user.id]) {
      allQuals[req.user.id] = {
        education: [],
        experience: [],
        skills: [],
        achievements: [],
      };
    }

    const newAchievement = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    allQuals[req.user.id].achievements.push(newAchievement);
    await writeQualifications(allQuals);

    res.status(201).json({
      success: true,
      message: "Đã thêm thành tích",
      data: newAchievement,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/qualifications/education/:index - Update education
router.put("/education/:index", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const index = parseInt(req.params.index);

    if (!allQuals[req.user.id] || !allQuals[req.user.id].education[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    allQuals[req.user.id].education[index] = {
      ...allQuals[req.user.id].education[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await writeQualifications(allQuals);
    res.json({ success: true, message: "Đã cập nhật học vấn" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/qualifications/education/:index - Delete education
router.delete("/education/:index", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const index = parseInt(req.params.index);

    if (!allQuals[req.user.id] || !allQuals[req.user.id].education[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    allQuals[req.user.id].education.splice(index, 1);
    await writeQualifications(allQuals);
    res.json({ success: true, message: "Đã xóa học vấn" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/qualifications/experience/:index - Update experience
router.put("/experience/:index", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const index = parseInt(req.params.index);

    if (!allQuals[req.user.id] || !allQuals[req.user.id].experience[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    allQuals[req.user.id].experience[index] = {
      ...allQuals[req.user.id].experience[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await writeQualifications(allQuals);
    res.json({ success: true, message: "Đã cập nhật kinh nghiệm" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/qualifications/experience/:index - Delete experience
router.delete("/experience/:index", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const index = parseInt(req.params.index);

    if (!allQuals[req.user.id] || !allQuals[req.user.id].experience[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    allQuals[req.user.id].experience.splice(index, 1);
    await writeQualifications(allQuals);
    res.json({ success: true, message: "Đã xóa kinh nghiệm" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/qualifications/skills/:index - Update skill
router.put("/skills/:index", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const index = parseInt(req.params.index);

    if (!allQuals[req.user.id] || !allQuals[req.user.id].skills[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    allQuals[req.user.id].skills[index] = {
      ...allQuals[req.user.id].skills[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await writeQualifications(allQuals);
    res.json({ success: true, message: "Đã cập nhật kỹ năng" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/qualifications/skills/:index - Delete skill
router.delete("/skills/:index", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const index = parseInt(req.params.index);

    if (!allQuals[req.user.id] || !allQuals[req.user.id].skills[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    allQuals[req.user.id].skills.splice(index, 1);
    await writeQualifications(allQuals);
    res.json({ success: true, message: "Đã xóa kỹ năng" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/qualifications/achievements/:index - Update achievement
router.put("/achievements/:index", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const index = parseInt(req.params.index);

    if (!allQuals[req.user.id] || !allQuals[req.user.id].achievements[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    allQuals[req.user.id].achievements[index] = {
      ...allQuals[req.user.id].achievements[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await writeQualifications(allQuals);
    res.json({ success: true, message: "Đã cập nhật thành tích" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/qualifications/achievements/:index - Delete achievement
router.delete("/achievements/:index", auth, async (req, res) => {
  try {
    const allQuals = await readQualifications();
    const index = parseInt(req.params.index);

    if (!allQuals[req.user.id] || !allQuals[req.user.id].achievements[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    allQuals[req.user.id].achievements.splice(index, 1);
    await writeQualifications(allQuals);
    res.json({ success: true, message: "Đã xóa thành tích" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
