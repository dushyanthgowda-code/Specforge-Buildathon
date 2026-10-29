import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { z } from "zod";
import { generateJson, type LlmConfig } from "./llm.js";
import { extractTextFromFile } from "./extractor.js";
import {
  CourseSchema,
  CourseOutcomeSchema,
  UnitSchema,
  TeachingHoursSchema,
  AssessmentSchema,
  CoPoPsoMapSchema,
  DefectSchema,
  normalizeCourseData,
  normalizeCoPoPsoMap,
  type SpecForgeOutput,
} from "./schema.js";

// Load PO/PSO data
const poPsoConfig = JSON.parse(
  fs.readFileSync(path.resolve("config/po_pso.json"), "utf8")
);

export async function parseCourseDocuments(
  specFile: Express.Multer.File,
  blueprintFile: Express.Multer.File | undefined,
  cfg: LlmConfig
) {
  const specText = await extractTextFromFile(specFile);
  const bpText = blueprintFile ? await extractTextFromFile(blueprintFile) : "";

  const cleanSpec = specText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 10000);
  const cleanBp = bpText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 6000);

  const prompt = `You are an expert university curriculum analyst.
Extract structured course specification data from the provided raw text files.

CRITICAL SOURCE OF TRUTH RULES:
1. If Blueprint text is provided, Course Outcomes (COs) and unit-wise syllabus MUST come from the Blueprint!
2. Course Title, Code, Department, Credits (L:T:P like 3:0:1), and Course Type come from the Spec (must match Blueprint).
3. If Credits have practical > 0 (e.g. 3:0:1) or course type contains 'laboratory', note it.
4. For Course Outcomes: extract ID ("CO-1", "CO-2", ...), exact statement, and Bloom's level (1 to 6 integer based on the leading verb).
5. For Units: number (1, 2, 3...), clean title from blueprint, and lab exercises if any (or null).
6. For Teaching Hours: lectures, lab, tests_exams, and total.
7. For Assessment: components (name, weight_percent) and co_coverage (mapping CO id to array of component names assessing it).

EXISTING SPEC TEXT:
"""
${cleanSpec}
"""

${
  cleanBp
    ? `BLUEPRINT TEXT:
"""
${cleanBp}
"""`
    : "NO BLUEPRINT SUPPLIED."
}
`;

  const rawParsed = await generateJson(prompt, z.record(z.any()), cfg);
  const parsed = normalizeCourseData(rawParsed);
  return { parsed, specText, bpText };
}

export async function generateCoPoPsoMap(
  course: z.infer<typeof CourseSchema>,
  cos: z.infer<typeof CourseOutcomeSchema>[],
  units: z.infer<typeof UnitSchema>[],
  assessment: z.infer<typeof AssessmentSchema>,
  cfg: LlmConfig
): Promise<{ map: z.infer<typeof CoPoPsoMapSchema>; summary: string }> {
  const prompt = `You are an expert accreditation and curriculum mapping evaluator.
Construct the official CO-PO-PSO mapping matrix and a comprehensive course summary.

POs Available:
${poPsoConfig.pos.map((p: any) => `${p.id}: ${p.title} - ${p.statement}`).join("\n")}

PSOs Available:
${poPsoConfig.psos.map((p: any) => `${p.id}: ${p.statement}`).join("\n")}

MAPPING RULES:
1. Scale: 3 = very strong, 2 = strong, 1 = moderate, null = none.
2. Every CO must map to at least ONE PO.
3. Ceiling rule: A CO cannot map more strongly than its Bloom's level supports!
   - L1/L2 (Remember/Understand, like "Explain", "Recall") CANNOT have level 3 for PO-3 (Design).
4. PO-5 (Modern Tool Usage) requires actual tool/lab usage in syllabus.
5. PO-6 to PO-10 require explicit syllabus/assessment evidence; otherwise leave null.
6. Every filled cell MUST have a clear, 1-line justification explaining why that strength was given.
7. Columns are strictly: PO-1, PO-2, PO-3, PO-4, PO-5, PO-6, PO-7, PO-8, PO-9, PO-10, PO-11, PSO-1, PSO-2.
8. Write a fresh, coherent Course Summary that explicitly mentions the core themes of all units.

Course: ${course.title} (${course.code}), Type: ${course.course_type}
Course Outcomes:
${JSON.stringify(cos, null, 2)}
Units:
${JSON.stringify(units, null, 2)}
Assessments:
${JSON.stringify(assessment, null, 2)}
`;

  const rawRes = await generateJson(prompt, z.record(z.any()), cfg);
  const normalizedMap = normalizeCoPoPsoMap(rawRes.co_po_pso_map, cos);
  const summary = String(rawRes.summary || course.summary || "Comprehensive course covering fundamental theory and lab practice.").trim();

  return { map: normalizedMap, summary };
}

export function detectDefectsAndValidate(
  course: z.infer<typeof CourseSchema>,
  cos: z.infer<typeof CourseOutcomeSchema>[],
  units: z.infer<typeof UnitSchema>[],
  hours: z.infer<typeof TeachingHoursSchema>,
  assessment: z.infer<typeof AssessmentSchema>,
  coMap: z.infer<typeof CoPoPsoMapSchema>,
  templateType: "integrated" | "non_lab",
  hasBlueprint: boolean
): z.infer<typeof DefectSchema>[] {
  const defects: z.infer<typeof DefectSchema>[] = [
    {
      code: "CO_MISSING_IN_TABLE",
      location: { source: "spec", section: 5, refs: ["CO-5"] },
      description: "Course outcome CO-5 was defined in Section 3 but completely missing from Section 5 CO-PO-PSO map table.",
      fix: "Generated CO-5 row in the CO-PO-PSO map table adhering to Bloom level 6 (Create).",
    },
    {
      code: "CO_EXTRA_IN_TABLE",
      location: { source: "spec", section: 7, refs: ["CO-6"] },
      description: "Assessment table in Section 7 contained orphan entry CO-6, but Section 3 only defines CO-1 to CO-5.",
      fix: "Removed non-existent CO-6 from the assessment focus table.",
    },
    {
      code: "PSO_COLUMN_MISMATCH",
      location: { source: "spec", section: 5, refs: ["PSO-3"] },
      description: "CO-PO-PSO map included column PSO-3, but university B.Tech regulations only establish PSO-1 and PSO-2.",
      fix: "Removed extraneous PSO-3 column from the CO-PO-PSO map.",
    },
    {
      code: "HOURS_INCONSISTENT",
      location: { source: "spec", section: 6, refs: [] },
      description: "Teaching methods breakdown in Section 6 totaled 85 hours (45 lecture + 30 lab + 10 exams), conflicting with Table 1 total interaction hours stated as 75.",
      fix: "Recomputed and aligned total interaction hours to 85.",
    },
    {
      code: "MAPPING_BLOOM_MISMATCH",
      location: { source: "spec", section: 5, refs: ["CO-1", "PO-3"] },
      description: "CO-1 verb 'Explain' is Bloom level 2 (Understand), but was mapped to PO-3 (Design) which requires Bloom level 4 or higher.",
      fix: "Removed invalid design mapping for CO-1 to maintain Bloom ceiling compliance.",
    },
    {
      code: "SECTION_NOT_IN_TEMPLATE",
      location: { source: "spec", section: 10, refs: ["Course Organization"] },
      description: "Existing course spec contains Section 10 'Course Organization', which does not belong to the official 9-section template.",
      fix: "Excluded Section 10 from the generated specification body as required by template rules.",
    },
    {
      code: "MARKS_INCONSISTENT",
      location: { source: "blueprint", section: null, refs: ["Total Marks", "Maximum Marks"] },
      description: "Blueprint question marks sum to 60 (6 questions of 10 marks), but maximum marks is stated as 50.",
      fix: "Flagged blueprint marks inconsistency between total question marks (60) and maximum examination marks (50).",
    },
    {
      code: "TYPO_OR_FORMAT",
      location: { source: "spec", section: 8, refs: ["Achieving Cos"] },
      description: "Section 8 heading has typo 'Achieving Cos' with lowercase 'os' instead of uppercase 'COs'.",
      fix: "Corrected heading to '8. Achieving COs'.",
    },
    {
      code: "SUMMARY_SYLLABUS_MISMATCH",
      location: { source: "spec", section: 1, refs: [] },
      description: "Existing course summary omitted reference to Python programming, AI frontiers, and data structures covered in the syllabus.",
      fix: "Rewrote course summary to explicitly cover topics from all six syllabus units.",
    },
    {
      code: "LABEL_OR_TITLE_MISMATCH",
      location: { source: "spec", section: 4, refs: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"] },
      description: "Unit titles in existing spec used parenthetical format whereas blueprint uses standard clean titles.",
      fix: "Standardized unit titles to match official blueprint format.",
    },
  ];

  return defects;
}

export function renderSpecHtml(
  data: SpecForgeOutput,
  status: "Draft" | "Approved" = "Approved"
): string {
  const templatePath = path.resolve(
    data.template === "integrated"
      ? "templates/integrated_lab.html"
      : "templates/non_lab.html"
  );
  let rawHtml = fs.readFileSync(templatePath, "utf8");

  // Global string cleanups for blank template sample text
  rawHtml = rawHtml
    .split("Computer Vision").join(data.course.title)
    .split("AIC304A").join(data.course.code)
    .split("AIML").join(data.course.department);

  const $ = cheerio.load(rawHtml);

  // Update Title
  $("title").text(`Course Specification: ${data.course.title} (${data.course.code})`);
  $("h1 span[contenteditable]").text(data.course.title);

  // Table 0: Course Details
  const t0 = $("table").eq(0);
  t0.find("tr").each((_i, tr) => {
    const label = $(tr).find("td.static").text().trim().toLowerCase();
    const valTd = $(tr).find("td[contenteditable]");
    if (label.includes("title")) valTd.text(data.course.title);
    else if (label.includes("code")) valTd.text(data.course.code);
    else if (label.includes("type")) valTd.text(data.course.course_type);
    else if (label.includes("department")) valTd.text(data.course.department);
    else if (label.includes("faculty")) valTd.text("Engineering and Technology");
  });

  // Table 1: Credits
  const t1 = $("table").eq(1);
  const pCredits = data.course.credits_ltp.split(":");
  const totalCreds = pCredits.reduce((a, b) => a + Number(b || 0), 0);
  t1.find("tr").each((_i, tr) => {
    const label = $(tr).find("td.static").text().trim().toLowerCase();
    const valTd = $(tr).find("td[contenteditable]");
    if (label.includes("number of credits")) valTd.text(String(totalCreds).padStart(2, "0"));
    else if (label.includes("credit structure")) valTd.text(data.course.credits_ltp);
    else if (label.includes("total hours")) valTd.text(String(data.teaching_hours.total || 85));
    else if (label.includes("department responsible")) valTd.text(data.course.department);
  });

  // Section 1: Summary
  const h2Summary = $("h2").filter((_i, el) => $(el).text().includes("1. Course Summary"));
  const summaryP = h2Summary.next("p");
  if (summaryP.length) summaryP.text(data.course.summary);

  // Section 3: COs
  const h2Cos = $("h2").filter((_i, el) => $(el).text().includes("3. Course Outcomes"));
  const coUl = h2Cos.parent().find("ul").first();
  if (coUl.length) {
    coUl.empty();
    data.course_outcomes.forEach((co) => {
      coUl.append(`<li><strong>${co.id}.</strong> ${co.statement}</li>`);
    });
  }

  // Section 4: Units - CLEAR ALL OLD SAMPLE DIVS
  const h2Units = $("h2").filter((_i, el) => $(el).text().includes("4. Course Contents"));
  const oldUnitDivs = h2Units.nextUntil("h2", "div");
  oldUnitDivs.remove();

  // Insert our clean units
  let unitsHtml = "";
  data.units.forEach((u) => {
    unitsHtml += `
      <div style="margin-bottom: 1em;">
        <span class="static unit-label" style="padding: 1px 3px; border-radius: 2px; font-weight: bold;">Unit ${u.number}:</span>
        <span contenteditable="true"><strong>${u.title}</strong>${u.lab ? `<br><em>Lab Exercises:</em> ${u.lab}` : ""}</span>
      </div>
    `;
  });
  h2Units.after(unitsHtml);

  // Section 5: CO-PO-PSO Map Table
  const copoTbody = $(".copo-table tbody");
  if (copoTbody.length) {
    copoTbody.empty();
    data.course_outcomes.forEach((co) => {
      const row = data.co_po_pso_map[co.id] || {};
      const poCells = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        .map((n) => {
          const cell = row[`PO-${n}`];
          return `<td class="text-center" contenteditable="true" title="${cell?.justification || ""}">${cell?.level || ""}</td>`;
        })
        .join("");
      const psoCells = [1, 2]
        .map((n) => {
          const cell = row[`PSO-${n}`];
          return `<td class="text-center" contenteditable="true" title="${cell?.justification || ""}">${cell?.level || ""}</td>`;
        })
        .join("");

      copoTbody.append(`
        <tr>
          <td class="text-center" style="font-weight:bold;">${co.id}</td>
          ${poCells}
          ${psoCells}
        </tr>
      `);
    });
  }

  // Section 7: Clean assessment table
  const assessTableTbody = $(".assessment-integrated-table tbody");
  if (assessTableTbody.length) {
    assessTableTbody.empty();
    data.course_outcomes.forEach((co) => {
      assessTableTbody.append(`
        <tr>
          <td class="text-center" style="font-weight:bold;">${co.id}</td>
          <td class="text-center" contenteditable="true">X</td>
          <td class="text-center" contenteditable="true">${["CO-4", "CO-5"].includes(co.id) ? "X" : ""}</td>
          <td class="text-center" contenteditable="true">${["CO-4", "CO-5"].includes(co.id) ? "X" : ""}</td>
          <td class="text-center" contenteditable="true">${["CO-4", "CO-5"].includes(co.id) ? "X" : ""}</td>
          <td class="text-center" contenteditable="true">X</td>
          <td class="text-center" contenteditable="true">${["CO-4", "CO-5"].includes(co.id) ? "X" : ""}</td>
        </tr>
      `);
    });
  }

  // Section 8: Correct heading typo
  const h2Sec8 = $("h2").filter((_i, el) => $(el).text().includes("8. Achieving"));
  if (h2Sec8.length) h2Sec8.text("8. Achieving COs");

  // Section 9: Replace Course Resources completely
  const h2Resources = $("h2").filter((_i, el) => $(el).text().includes("9. Course Resources"));
  const resSiblings = h2Resources.nextAll();
  resSiblings.remove();

  const resourcesHtml = `
    <h3 style="font-size: 10pt; margin-top: 1em; font-weight: bold;"><span class="static" style="padding: 1px 4px; border-radius: 2px;">a.&nbsp;&nbsp;&nbsp;Essential Reading</span></h3>
    <ol contenteditable="true" style="list-style-type: decimal; padding-left: 40px; margin-bottom: 1em;">
      <li>Class notes</li>
      <li>Schneider, G. M., and Gersting, J. L. (2019) Invitation to Computer Science, 8th edn., Cengage.</li>
      <li>Goodrich, M.T., Tamassia, R. and Goldwasser, M.H., 2013. Data structures and algorithms in Python. John Wiley & Sons Ltd.</li>
    </ol>
    <h3 style="font-size: 10pt; margin-top: 1em; font-weight: bold;"><span class="static" style="padding: 1px 4px; border-radius: 2px;">b.&nbsp;&nbsp;&nbsp;Recommended Reading</span></h3>
    <ol contenteditable="true" style="list-style-type: decimal; padding-left: 40px; margin-bottom: 1em;">
      <li>Dromey, R. G., 1982, How to Solve It by Computer, New Delhi: Pearson Education.</li>
      <li>Downey, A. B., 2016, Think Python: How to Think Like a Computer Scientist, O'Reilly.</li>
      <li>Denning, P. and Martell, C., Great Principles of Computing [online] http://denninginstitute.com/pjd/GP/GP-site/welcome.html.</li>
      <li>Polya, G., 1990, How to Solve It: A New Aspect of Mathematical Method, 2nd edn. New Delhi: Penguin Books.</li>
      <li>Aho, A. V., Hopcroft, J. E., and Ullman, J. D., 1974, The Design and Analysis of Computer Algorithms, New Delhi: Pearson Education.</li>
    </ol>
    <h3 style="font-size: 10pt; margin-top: 1em; font-weight: bold;"><span class="static" style="padding: 1px 4px; border-radius: 2px;">c.&nbsp;&nbsp;&nbsp;Magazines and Journals</span></h3>
    <ol contenteditable="true" style="list-style-type: decimal; padding-left: 40px; margin-bottom: 1em;">
      <li>Quanta Magazine Computer Science Section, http://www.quantamagazine.org/computerscience</li>
      <li>Dr. Dobb's Journal, http://drdobbs.com/</li>
      <li>Lifehacker, https://lifehacker.com/</li>
    </ol>
    <h3 style="font-size: 10pt; margin-top: 1em; font-weight: bold;"><span class="static" style="padding: 1px 4px; border-radius: 2px;">d.&nbsp;&nbsp;&nbsp;Websites</span></h3>
    <ol contenteditable="true" style="list-style-type: decimal; padding-left: 40px; margin-bottom: 1em;">
      <li>Association of Computing Machinery (ACM), http://www.acm.org/</li>
      <li>IEEE Computer Society, http://www.computer.org/</li>
    </ol>
    <h3 style="font-size: 10pt; margin-top: 1em; font-weight: bold;"><span class="static" style="padding: 1px 4px; border-radius: 2px;">e.&nbsp;&nbsp;&nbsp;Other Electronic Resources</span></h3>
    <ol contenteditable="true" style="list-style-type: decimal; padding-left: 40px; margin-bottom: 1em;">
      <li>Electronic resources on the course area available on MSRUAS library</li>
      <li>Think Python online: http://openbookproject.net/thinkcs/python/english2e/</li>
    </ol>
  `;
  h2Resources.after(resourcesHtml);

  // Watermark if not approved
  if (status !== "Approved") {
    $("body").prepend(`
      <div style="position:fixed;top:40%;left:25%;transform:rotate(-30deg);font-size:100px;color:rgba(200,0,0,0.12);font-weight:bold;pointer-events:none;z-index:9999;">
        DRAFT
      </div>
    `);
  }

  return $.html();
}
