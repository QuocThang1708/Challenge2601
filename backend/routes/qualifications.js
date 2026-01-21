const express = require("express");
const router = express.Router();
const Qualification = require("../models/Qualification");
const { auth } = require("../middlewares/auth");

// GET /api/qualifications - Get user's qualifications
router.get("/", auth, async (req, res) => {
  try {
    let qual = await Qualification.findOne({ userId: req.user.id.toString() });

    // Return empty structure if not found (to match frontend expectation)
    if (!qual) {
      return res.json({
        success: true,
        data: {
          education: [],
          experience: [],
          skills: [],
          achievements: [],
        },
      });
    }

    res.json({ success: true, data: qual });
  } catch (error) {
    console.error("Get qualifications error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/qualifications/education - Add education
router.post("/education", auth, async (req, res) => {
  try {
    let qual = await Qualification.findOne({ userId: req.user.id.toString() });
    if (!qual) {
      qual = new Qualification({ userId: req.user.id.toString() });
    }

    const newEdu = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    qual.education.push(newEdu);
    await qual.save();

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
    let qual = await Qualification.findOne({ userId: req.user.id.toString() });
    if (!qual) {
      qual = new Qualification({ userId: req.user.id.toString() });
    }

    const newExp = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    qual.experience.push(newExp);
    await qual.save();

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
    let qual = await Qualification.findOne({ userId: req.user.id.toString() });
    if (!qual) {
      qual = new Qualification({ userId: req.user.id.toString() });
    }

    // Default level if not provided
    const skillData = {
      ...req.body,
      level: req.body.level ? parseInt(req.body.level) : 1,
    };

    const newSkill = {
      id: Date.now().toString(),
      ...skillData,
      createdAt: new Date().toISOString(),
    };

    qual.skills.push(newSkill);
    await qual.save();

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
    let qual = await Qualification.findOne({ userId: req.user.id.toString() });
    if (!qual) {
      qual = new Qualification({ userId: req.user.id.toString() });
    }

    const newAchievement = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    qual.achievements.push(newAchievement);
    await qual.save();

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
// NOTE: Frontend sends index, which assumes order preservation.
// Mongoose arrays preserve order.
router.put("/education/:index", auth, async (req, res) => {
  try {
    const qual = await Qualification.findOne({
      userId: req.user.id.toString(),
    });
    const index = parseInt(req.params.index);

    if (!qual || !qual.education[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    // Update fields using Object.assign or spread
    // We need to mark modified if strictly needed, but direct assignment usually works for Mixed types if we re-assign the specific index or markModified.
    // However, Mixed array modification detection can be tricky.
    // Best practice for Mixed array: assign new object or markModified.
    const updated = {
      ...qual.education[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    qual.education.set(index, updated);

    await qual.save();
    res.json({ success: true, message: "Đã cập nhật học vấn" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/qualifications/education/:index - Delete education
router.delete("/education/:index", auth, async (req, res) => {
  try {
    const qual = await Qualification.findOne({
      userId: req.user.id.toString(),
    });
    const index = parseInt(req.params.index);

    if (!qual || !qual.education[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    qual.education.splice(index, 1);
    await qual.save();
    res.json({ success: true, message: "Đã xóa học vấn" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/qualifications/experience/:index - Update experience
router.put("/experience/:index", auth, async (req, res) => {
  try {
    const qual = await Qualification.findOne({
      userId: req.user.id.toString(),
    });
    const index = parseInt(req.params.index);

    if (!qual || !qual.experience[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    const updated = {
      ...qual.experience[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    qual.experience.set(index, updated);

    await qual.save();
    res.json({ success: true, message: "Đã cập nhật kinh nghiệm" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/qualifications/experience/:index - Delete experience
router.delete("/experience/:index", auth, async (req, res) => {
  try {
    const qual = await Qualification.findOne({
      userId: req.user.id.toString(),
    });
    const index = parseInt(req.params.index);

    if (!qual || !qual.experience[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    qual.experience.splice(index, 1);
    await qual.save();
    res.json({ success: true, message: "Đã xóa kinh nghiệm" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/qualifications/skills/:index - Update skill
router.put("/skills/:index", auth, async (req, res) => {
  try {
    const qual = await Qualification.findOne({
      userId: req.user.id.toString(),
    });
    const index = parseInt(req.params.index);

    if (!qual || !qual.skills[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    const updated = {
      ...qual.skills[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    if (req.body.level) updated.level = parseInt(req.body.level);

    qual.skills.set(index, updated);

    await qual.save();
    res.json({ success: true, message: "Đã cập nhật kỹ năng" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/qualifications/skills/:index - Delete skill
router.delete("/skills/:index", auth, async (req, res) => {
  try {
    const qual = await Qualification.findOne({
      userId: req.user.id.toString(),
    });
    const index = parseInt(req.params.index);

    if (!qual || !qual.skills[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    qual.skills.splice(index, 1);
    await qual.save();
    res.json({ success: true, message: "Đã xóa kỹ năng" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/qualifications/achievements/:index - Update achievement
router.put("/achievements/:index", auth, async (req, res) => {
  try {
    const qual = await Qualification.findOne({
      userId: req.user.id.toString(),
    });
    const index = parseInt(req.params.index);

    if (!qual || !qual.achievements[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    const updated = {
      ...qual.achievements[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    qual.achievements.set(index, updated);

    await qual.save();
    res.json({ success: true, message: "Đã cập nhật thành tích" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/qualifications/achievements/:index - Delete achievement
router.delete("/achievements/:index", auth, async (req, res) => {
  try {
    const qual = await Qualification.findOne({
      userId: req.user.id.toString(),
    });
    const index = parseInt(req.params.index);

    if (!qual || !qual.achievements[index]) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }

    qual.achievements.splice(index, 1);
    await qual.save();
    res.json({ success: true, message: "Đã xóa thành tích" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
