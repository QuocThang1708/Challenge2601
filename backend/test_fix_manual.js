const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

async function test() {
  console.log("--- Testing PDF Fix Logic ---");

  try {
    const pdf = require("pdf-parse");
    const pdfDistPath = path.join(__dirname, "node_modules/pdfjs-dist");

    const cMapDir = path.join(pdfDistPath, "cmaps");
    const fontDir = path.join(pdfDistPath, "standard_fonts");

    const cMapUrl = pathToFileURL(cMapDir).href + "/";
    const standardFontDataUrl = pathToFileURL(fontDir).href + "/";

    console.log("cMapUrl:", cMapUrl);
    console.log("standardFontDataUrl:", standardFontDataUrl);

    const filePath = path.join(
      __dirname,
      "uploads/cv/cv-1768464434466-591979442.pdf"
    );
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return;
    }
    const dataBuffer = fs.readFileSync(filePath);

    const parser = new pdf({
      data: dataBuffer,
      cMapUrl: cMapUrl,
      cMapPacked: true,
      standardFontDataUrl: standardFontDataUrl,
    });

    const result = await parser.getText();
    console.log("Success! Text length:", result.text.length);
    console.log("Preview:", result.text.substring(0, 100));
  } catch (e) {
    console.error("Test Failed:", e);
  }
}

test();
