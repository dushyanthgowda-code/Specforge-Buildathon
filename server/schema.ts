import { z } from "zod";

export const CourseSchema = z.object({
  title: z.string(),
  code: z.string(),
  department: z.string(),
  credits_ltp: z.string().regex(/^\d+:\d+:\d+$/, "Credits must be in L:T:P format, e.g. 3:0:1"),
  course_type: z.string(),
  summary: z.string(),
});

export const CourseOutcomeSchema = z.object({
  id: z.string().regex(/^CO-\d+$/),
  statement: z.string(),
  bloom_level: z.number().int().min(1).max(6),
});

export const UnitSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  lab: z.string().nullable(),
});

export const MapCellSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  justification: z.string(),
});

export const CoPoPsoMapSchema = z.record(
  z.string(),
  z.record(z.string(), MapCellSchema.nullable())
);

export const TeachingHoursSchema = z.object({
  lectures: z.number(),
  lab: z.number(),
  tests_exams: z.number(),
  total: z.number(),
}).passthrough();

export const AssessmentSchema = z.object({
  components: z.array(
    z.object({
      name: z.string(),
      weight_percent: z.number(),
    })
  ),
  co_coverage: z.record(z.string(), z.array(z.string())),
});

export const DefectCodeEnum = z.enum([
  "CO_MISSING_IN_TABLE",
  "CO_EXTRA_IN_TABLE",
  "CO_ASSESSMENT_MISMATCH",
  "PSO_COLUMN_MISMATCH",
  "MAPPING_BLOOM_MISMATCH",
  "MAPPING_UNSUPPORTED",
  "WRONG_TEMPLATE",
  "PLACEHOLDER_TEXT",
  "SUMMARY_SYLLABUS_MISMATCH",
  "LABEL_OR_TITLE_MISMATCH",
  "HOURS_INCONSISTENT",
  "WEIGHTAGE_INCONSISTENT",
  "TYPO_OR_FORMAT",
  "SECTION_NOT_IN_TEMPLATE",
  "MARKS_INCONSISTENT",
  "OTHER",
]);

export const DefectSchema = z.object({
  code: DefectCodeEnum,
  location: z.object({
    source: z.enum(["spec", "blueprint", "template"]),
    section: z.number().int().min(1).max(12).nullable(),
    refs: z.array(z.string()),
  }),
  description: z.string(),
  fix: z.string(),
});

export const SpecForgeOutputSchema = z.object({
  schema_version: z.literal("1.0"),
  input_id: z.string(),
  template: z.enum(["integrated", "non_lab"]),
  course: CourseSchema,
  course_outcomes: z.array(CourseOutcomeSchema).min(1),
  units: z.array(UnitSchema),
  co_po_pso_map: CoPoPsoMapSchema,
  teaching_hours: TeachingHoursSchema,
  assessment: AssessmentSchema,
  defects: z.array(DefectSchema),
});

export type SpecForgeOutput = z.infer<typeof SpecForgeOutputSchema>;

// Helper function that normalizes any messy JSON from LLM into strict schema shape
export function normalizeCourseData(data: any) {
  const c = data?.course || {};
  let credits = String(c.credits_ltp || c.credits || "3:0:1")
    .replace(/\s+/g, "")
    .replace(/-/g, ":");
  if (!/^\d+:\d+:\d+$/.test(credits)) credits = "3:0:1";

  const cos = Array.isArray(data?.course_outcomes)
    ? data.course_outcomes.map((co: any, idx: number) => {
        const idMatch = String(co?.id || "").match(/\d+/);
        const coId = idMatch ? `CO-${idMatch[0]}` : `CO-${idx + 1}`;
        let bLevel = 2;
        if (typeof co?.bloom_level === "number") bLevel = co.bloom_level;
        else if (co?.bloom_level) {
          const m = String(co.bloom_level).match(/\d+/);
          if (m) bLevel = parseInt(m[0], 10);
        }
        bLevel = Math.min(6, Math.max(1, bLevel));
        return {
          id: coId,
          statement: String(co?.statement || `Outcome for ${coId}`).trim(),
          bloom_level: bLevel,
        };
      })
    : [
        { id: "CO-1", statement: "Understand the fundamentals of computing", bloom_level: 2 },
        { id: "CO-2", statement: "Apply programming concepts to solve problems", bloom_level: 3 },
      ];

  const units = Array.isArray(data?.units)
    ? data.units.map((u: any, idx: number) => {
        let num = idx + 1;
        if (typeof u?.number === "number") num = u.number;
        else if (u?.number) {
          const m = String(u.number).match(/\d+/);
          if (m) num = parseInt(m[0], 10);
        }
        return {
          number: num,
          title: String(u?.title || `Unit ${num}: Core Topics`),
          lab: u?.lab ? String(u.lab) : null,
        };
      })
    : [
        { number: 1, title: "Introduction and Overview", lab: null },
        { number: 2, title: "Core Concepts and Methods", lab: null },
      ];

  const hours = data?.teaching_hours || {};
  const lec = Number(hours.lectures || 42);
  const lab = Number(hours.lab || (credits.endsWith(":0") ? 0 : 28));
  const test = Number(hours.tests_exams || 4);
  const tot = Number(hours.total || lec + lab + test);

  const assess = data?.assessment || {};
  const comps = Array.isArray(assess.components) && assess.components.length > 0
    ? assess.components.map((cm: any) => ({
        name: String(cm?.name || "Evaluation"),
        weight_percent: Number(cm?.weight_percent || 50),
      }))
    : [
        { name: "Continuous Evaluation (CE)", weight_percent: 60 },
        { name: "Semester End Exam (SEE)", weight_percent: 40 },
      ];

  const coverage: Record<string, string[]> = {};
  cos.forEach((co: any) => {
    const existing = assess?.co_coverage?.[co.id];
    coverage[co.id] = Array.isArray(existing) && existing.length > 0
      ? existing.map(String)
      : [comps[0].name];
  });

  return {
    course: {
      title: String(c.title || "Course Specification").trim(),
      code: String(c.code || "CS101").trim(),
      department: String(c.department || "Computer Science and Engineering").trim(),
      credits_ltp: credits,
      course_type: String(c.course_type || "Core Theory and laboratory").trim(),
      summary: String(c.summary || "This course introduces key theoretical and practical principles.").trim(),
    },
    course_outcomes: cos,
    units,
    teaching_hours: {
      lectures: lec,
      lab,
      tests_exams: test,
      total: tot,
    },
    assessment: {
      components: comps,
      co_coverage: coverage,
    },
  };
}

export function normalizeCoPoPsoMap(
  rawMap: any,
  cos: Array<{ id: string; bloom_level: number }>
): Record<string, Record<string, { level: 1 | 2 | 3; justification: string } | null>> {
  const result: Record<string, Record<string, { level: 1 | 2 | 3; justification: string } | null>> = {};
  const poKeys = ["PO-1", "PO-2", "PO-3", "PO-4", "PO-5", "PO-6", "PO-7", "PO-8", "PO-9", "PO-10", "PO-11", "PSO-1", "PSO-2"];

  cos.forEach((co) => {
    result[co.id] = {};
    const row = rawMap?.[co.id] || {};
    poKeys.forEach((k) => {
      const cell = row[k];
      if (!cell || cell === null) {
        result[co.id][k] = null;
        return;
      }
      let lvl = cell.level;
      if (typeof lvl === "string") {
        const m = lvl.match(/\d+/);
        lvl = m ? parseInt(m[0], 10) : 1;
      }
      if (lvl !== 1 && lvl !== 2 && lvl !== 3) {
        result[co.id][k] = null;
        return;
      }

      // Bloom ceiling check: L1/L2 cannot have 3 for PO-3
      if (co.bloom_level <= 2 && k === "PO-3" && lvl === 3) {
        lvl = 2 as 1 | 2 | 3;
      }

      result[co.id][k] = {
        level: lvl as 1 | 2 | 3,
        justification: String(cell.justification || `Directly mapped based on CO bloom level ${co.bloom_level}`).trim(),
      };
    });

    // Ensure at least PO-1 is mapped
    const hasAny = Object.values(result[co.id]).some((v) => v !== null);
    if (!hasAny) {
      result[co.id]["PO-1"] = {
        level: 2,
        justification: "Provides foundational engineering knowledge",
      };
    }
  });

  return result;
}
