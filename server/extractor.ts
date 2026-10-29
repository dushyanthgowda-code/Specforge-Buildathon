import mammoth from "mammoth";
import * as cheerio from "cheerio";
// @ts-ignore
import WordExtractor from "word-extractor";

export async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const name = file.originalname.toLowerCase();
  const buffer = file.buffer;

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  if (name.endsWith(".doc")) {
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(buffer);
    return extracted.getBody() || "";
  }

  if (name.endsWith(".html") || name.endsWith(".htm")) {
    const $ = cheerio.load(buffer.toString("utf8"));
    return $("body").text() || $.text() || "";
  }

  if (name.endsWith(".pdf")) {
    try {
      // @ts-ignore
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text || "";
    } catch (e) {
      return buffer.toString("utf8");
    }
  }

  return buffer.toString("utf8");
}
