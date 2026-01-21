const fs = require("fs").promises;
const path = require("path");

/**
 * CV Parser Agent (Simulated AI)
 * Uses a pipeline of Heuristics, Regex, and Pattern Matching to extract structured data.
 */
class CVParserAgent {
  constructor() {
    this.sections = {
      education: [
        "education",
        "hoc van",
        "trinh do",
        "bang cap",
        "dao tao",
        "academic",
      ],
      experience: [
        "experience",
        "kinh nghiem",
        "lam viec",
        "work history",
        "employment",
        "cong tac",
      ],
      skills: [
        "skill",
        "ky nang",
        "chuyen mon",
        "technologies",
        "technical",
        "ngoai ngu",
        "language",
      ],
      achievements: [
        "achievement",
        "award",
        "thanh tuu",
        "giai thuong",
        "chung chi",
        "certification",
        "honor",
      ],
    };
  }

  normalizeText(text) {
    // Basic normalization: unify newlines
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  detectSection(line) {
    const lower = line
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Remove accents roughly for detection

    // Heuristic: Section headers are usually short
    if (line.length > 100) return null; // Relaxed limit from 50 to 100

    for (const [section, keywords] of Object.entries(this.sections)) {
      if (keywords.some((k) => lower.includes(k))) {
        return section;
      }
    }
    return null;
  }

  extractDate(text) {
    // Matches: 2020, 2020-2022, 01/2020, Jan 2020, Present, Hien tai
    const yearRegex = /\b(19|20)\d{2}\b/g;
    const rangeRegex =
      /\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2}|Present|Hi\u1ec7n t\u1ea1i|Now)\b/i;

    const rangeMatch = text.match(rangeRegex);
    if (rangeMatch) {
      return { start: rangeMatch[1], end: rangeMatch[2] };
    }

    const years = text.match(yearRegex);
    if (years && years.length > 0) {
      if (years.length >= 2) return { start: years[0], end: years[1] };
      return { start: years[0], end: "" };
    }
    return { start: null, end: null };
  }

  parse(rawText) {
    const lines = this.normalizeText(rawText);
    const result = {
      education: [],
      experience: [],
      skills: [],
      achievements: [],
    };

    let currentSection = null;
    let justSwitchedSection = false;

    // Process State Machine
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const detected = this.detectSection(line);

      if (detected) {
        currentSection = detected;
        justSwitchedSection = true; // Mark that we just hit a header
        continue;
      }

      if (!currentSection) continue;

      // Skip potential other headers (Uppercase short lines) that weren't detected
      if (line === line.toUpperCase() && line.length < 40 && line.length > 3) {
        continue;
      }

      // Parsing Logic per Section
      if (currentSection === "education") {
        this.parseEducationLine(line, result.education, justSwitchedSection);
      } else if (currentSection === "experience") {
        this.parseExperienceLine(line, result.experience, justSwitchedSection);
      } else if (currentSection === "skills") {
        this.parseSkillLine(line, result.skills);
      } else if (currentSection === "achievements") {
        this.parseAchievementLine(line, result.achievements);
      }

      justSwitchedSection = false; // Reset after processing line
    }

    return result;
  }

  parseEducationLine(line, list, forceNew) {
    const { start, end } = this.extractDate(line);

    if (line.length > 10) {
      const isDateLine = /\d{4}/.test(line);

      if (start || forceNew) {
        // New Entry due to Date OR Section Header Logic
        list.push({
          id: Date.now() + Math.random().toString(),
          school: start
            ? line
                .replace(start, "")
                .replace(end || "", "")
                .replace(/[-–]/g, "")
                .trim()
            : line,
          degree: "Chứng chỉ/Bằng cấp",
          startYear: start || new Date().getFullYear().toString(),
          endYear: end || "",
          description: "Trích xuất tự động",
          createdAt: new Date().toISOString(),
        });
      } else if (list.length > 0) {
        // Associate with previous entry
        const last = list[list.length - 1];
        if (last.degree === "Chứng chỉ/Bằng cấp") {
          // If previous entry has default degree, assume this line is the Degree Name
          last.degree = line;
        } else {
          last.description += ". " + line;
        }
      } else {
        // Fallback: Entry without date
        list.push({
          id: Date.now() + Math.random().toString(),
          school: line,
          degree: "Chứng chỉ/Bằng cấp",
          startYear: new Date().getFullYear().toString(),
          endYear: "",
          description: "",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  parseExperienceLine(line, list, forceNew) {
    const { start, end } = this.extractDate(line);

    if (line.length > 8) {
      if (start || forceNew) {
        list.push({
          id: Date.now() + Math.random().toString(),
          company: start
            ? line.split(/[–,-]/)[0].trim()
            : "Kinh nghiệm làm việc",
          position: start ? "Nhân viên" : line,
          startDate: start || new Date().getFullYear().toString(),
          endDate: end || "Hiện tại",
          description: start ? "" : "Mô tả kinh nghiệm",
          createdAt: new Date().toISOString(),
        });
      } else if (list.length > 0) {
        const last = list[list.length - 1];
        if (last.position === "Nhân viên") {
          last.position = line;
        } else {
          last.description += ". " + line;
        }
      }
    }
  }

  parseSkillLine(line, list) {
    if (line.includes(",") || line.includes("•") || line.includes("·")) {
      const parts = line.split(/,|•|·/);
      parts.forEach((p) => {
        const s = p.trim();
        if (s.length > 2 && s.length < 50) {
          list.push({
            id: Date.now() + Math.random().toString(),
            name: s,
            level: 3,
            createdAt: new Date().toISOString(),
          });
        }
      });
    } else {
      if (line.length > 2 && line.length < 50) {
        list.push({
          id: Date.now() + Math.random().toString(),
          name: line,
          level: 3,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  parseAchievementLine(line, list) {
    if (line.length > 5) {
      const { start } = this.extractDate(line);
      list.push({
        id: Date.now() + Math.random().toString(),
        title: line,
        issuer: "Không xác định",
        date: start || new Date().getFullYear().toString(),
        description: "Trích xuất từ CV",
        createdAt: new Date().toISOString(),
      });
    }
  }
}

module.exports = new CVParserAgent();
