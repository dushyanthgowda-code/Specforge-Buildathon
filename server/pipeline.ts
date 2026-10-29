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
5. For Units: number (1, 2, 3...), title, and lab exercises if any (or null).
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

Return JSON with structure:
{
  "course": { "title": "...", "code": "...", "department": "...", "credits_ltp": "3:0:1", "course_type": "...", "summary": "..." },
  "course_outcomes": [ { "id": "CO-1", "statement": "...", "bloom_level": 2 } ],
  "units": [ { "number": 1, "title": "...", "lab": null } ],
  "teaching_hours": { "lectures": 42, "lab": 28, "tests_exams": 4, "total": 74 },
  "assessment": { "components": [ { "name": "...", "weight_percent": 60 } ], "co_coverage": { "CO-1": ["..."] } }
}
`;

  // Use a forgiving schema and then normalize
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
8. Also write a fresh, coherent Course Summary that mentions the core themes of all units.

Course: ${course.title} (${course.code}), Type: ${course.course_type}
Course Outcomes:
${JSON.stringify(cos, null, 2)}
Units:
${JSON.stringify(units, null, 2)}
Assessments:
${JSON.stringify(assessment, null, 2)}

Return JSON:
{
  "co_po_pso_map": {
    "CO-1": {
      "PO-1": { "level": 3, "justification": "..." },
      "PO-2": null
    }
  },
  "summary": "..."
}
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
  const defects: z.infer<typeof DefectSchema>[] = [];

  // V5: Teaching hours sum
  const sumHours = (hours.lectures || 0) + (hours.lab || 0) + (hours.tests_exams || 0);
  if (hours.total && sumHours !== hours.total) {
    defects.push({
      code: "HOURS_INCONSISTENT",
      location: { source: "spec", section: 6, refs: [] },
      description: `Teaching hours rows sum to ${sumHours} but total is stated as ${hours.total}.`,
      fix: `Recomputed total hours to ${sumHours}.`,
    });
  }

  // V6: Assessment weightages sum
  const sumWeight = assessment.components.reduce(
    (acc, c) => acc + (c.weight_percent || 0),
    0
  );
  if (Math.round(sumWeight) !== 100) {
    defects.push({
      code: "WEIGHTAGE_INCONSISTENT",
      location: { source: "spec", section: 7, refs: [] },
      description: `Assessment component weightages sum to ${sumWeight}%, expected 100%.`,
      fix: `Adjusted component weightages to total exactly 100%.`,
    });
  }

  // V3: Every CO is assessed
  const assessedCos = new Set<string>();
  Object.entries(assessment.co_coverage).forEach(([coId, comps]) => {
    if (comps && comps.length > 0) assessedCos.add(coId);
  });
  cos.forEach((co) => {
    if (!assessedCos.has(co.id)) {
      defects.push({
        code: "CO_ASSESSMENT_MISMATCH",
        location: { source: "spec", section: 7, refs: [co.id] },
        description: `${co.id} is not assessed in any component.`,
        fix: `Mapped ${co.id} to appropriate assessment component.`,
      });
    }
  });

  // V2: Every CO mapped to at least 1 PO
  cos.forEach((co) => {
    const row = coMap[co.id] || {};
    const filledPos = Object.keys(row).filter((k) => k.startsWith("PO-") && row[k]);
    if (filledPos.length === 0) {
      defects.push({
        code: "MAPPING_UNSUPPORTED",
        location: { source: "spec", section: 5, refs: [co.id] },
        description: `${co.id} is not mapped to any Programme Outcome.`,
        fix: `Added moderate mapping to PO-1.`,
      });
    }
  });

  // V10: Template check
  const pCredit = Number(course.credits_ltp.split(":")[2] || 0);
  const isLabCourse = pCredit > 0 || course.course_type.toLowerCase().includes("laboratory");
  if (isLabCourse && templateType !== "integrated") {
    defects.push({
      code: "WRONG_TEMPLATE",
      location: { source: "template", section: null, refs: [] },
      description: `Course has practical credits (${course.credits_ltp}) but selected ${templateType}.`,
      fix: `Selected integrated template.`,
    });
  }

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
  const templateHtml = fs.readFileSync(templatePath, "utf8");
  const $ = cheerio.load(templateHtml);

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
      coUl.append(`<li><strong>${co.id}:</strong> ${co.statement}</li>`);
    });
  }

  // Section 4: Units
  const h2Units = $("h2").filter((_i, el) => $(el).text().includes("4. Course Contents"));
  const unitsContainer = h2Units.nextAll("div").first();
  if (unitsContainer.length) {
    unitsContainer.empty();
    data.units.forEach((u) => {
      unitsContainer.append(`
        <div style="margin-bottom: 1em;">
          <span class="static unit-label" style="font-weight:bold;">Unit ${u.number}:</span>
          <span contenteditable="true">${u.title}${u.lab ? ` (Lab: ${u.lab})` : ""}</span>
        </div>
      `);
    });
  }

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
