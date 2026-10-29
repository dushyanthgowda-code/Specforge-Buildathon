import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { renderSpecHtml } from "../server/pipeline.js";
import { type SpecForgeOutput } from "../server/schema.js";

const specforgeOutput: SpecForgeOutput = {
  schema_version: "1.0",
  input_id: "SAMPLE",
  template: "integrated",
  course: {
    title: "Introduction to Computer Science and Engineering",
    code: "CSD103B",
    department: "Computer Science and Engineering",
    credits_ltp: "3:0:1",
    course_type: "Core Theory and laboratory",
    summary:
      "This course provides an introduction to computer science and engineering principles, algorithmic problem solving, procedural programming with Python, and basic linear and non-linear data structures. Through hands-on laboratory exercises, students develop computational thinking, programming proficiency, and structured software development practices.",
  },
  course_outcomes: [
    {
      id: "CO-1",
      statement: "Explain the fundamental concepts of computing, algorithms, programming, and data structures.",
      bloom_level: 2,
    },
    {
      id: "CO-2",
      statement: "Apply pseudocode, flowchart and programming constructs to solve computable problems.",
      bloom_level: 3,
    },
    {
      id: "CO-3",
      statement: "Analyze computational problems by selecting appropriate algorithms, programming constructs, and data structures for efficient solutions.",
      bloom_level: 4,
    },
    {
      id: "CO-4",
      statement: "Evaluate various programming constructs and data structures.",
      bloom_level: 5,
    },
    {
      id: "CO-5",
      statement: "Develop programmatic solutions for computable problems.",
      bloom_level: 6,
    },
  ],
  units: [
    {
      number: 1,
      title: "Introduction: Computers and computing devices, nature of CSE, data/information/knowledge, AI and frontiers",
      lab: "Edit and execute Python programs using Python command line and IDE (Interactive & Script mode)",
    },
    {
      number: 2,
      title: "Problem Solving using Computers: Algorithmic problem solving, flowcharts, fundamental algorithms and efficiency",
      lab: "Problem solving and flowchart implementations using Python",
    },
    {
      number: 3,
      title: "Building Blocks of Computer Programs: Languages, compilation, execution, Python syntax, control structures, functions, recursion, libraries",
      lab: "Building blocks exercises with Python variables, collections, loops, and functions",
    },
    {
      number: 4,
      title: "Elements of Computer Programming: Programming style, problem decomposition, random number generation, testing and validation",
      lab: "Testing, random number generation, and structured validation exercises",
    },
    {
      number: 5,
      title: "Basic Algorithms: Iterative and recursive algorithms, searching algorithms, sorting algorithms",
      lab: "Implementation and comparative benchmarking of searching and sorting routines",
    },
    {
      number: 6,
      title: "Basic Data Structures: Linear and non-linear structures, arrays, stacks, and queues (representation, operations, applications)",
      lab: "Implementation of array operations, stack (push/pop/peek), queue (enqueue/dequeue), and stack/queue applications",
    },
  ],
  co_po_pso_map: {
    "CO-1": {
      "PO-1": { level: 2, justification: "Provides foundational computing and engineering knowledge" },
      "PO-2": { level: 1, justification: "Supports basic understanding of problem domains" },
      "PSO-1": { level: 2, justification: "Builds core understanding of computing fundamentals" },
      "PSO-2": { level: 1, justification: "Introduces basic software platforms" },
    },
    "CO-2": {
      "PO-1": { level: 2, justification: "Applies mathematics and logic to formulate solutions" },
      "PO-2": { level: 2, justification: "Analyses problems using structured flowcharts and pseudocode" },
      "PO-3": { level: 2, justification: "Designs algorithmic workflows for computational problems" },
      "PO-5": { level: 2, justification: "Uses Python development environments for problem solving" },
      "PSO-1": { level: 3, justification: "Directly solves computational problems using algorithms" },
      "PSO-2": { level: 2, justification: "Implements software solutions in modern IDEs" },
    },
    "CO-3": {
      "PO-1": { level: 2, justification: "Applies computing fundamentals to structured data analysis" },
      "PO-2": { level: 3, justification: "Thoroughly analyses computational efficiency and problem requirements" },
      "PO-3": { level: 3, justification: "Designs modular solutions using appropriate data structures" },
      "PO-4": { level: 2, justification: "Investigates performance trade-offs in search and sort algorithms" },
      "PO-5": { level: 3, justification: "Applies programming tools and debuggers to implement data structures" },
      "PSO-1": { level: 3, justification: "High-level analysis of computational algorithms and data structures" },
      "PSO-2": { level: 3, justification: "Designs robust algorithmic components using Python" },
    },
    "CO-4": {
      "PO-1": { level: 2, justification: "Evaluates computer engineering principles across constructs" },
      "PO-2": { level: 3, justification: "Assesses suitability of linear vs non-linear data structures" },
      "PO-3": { level: 2, justification: "Selects optimal constructs for system component design" },
      "PO-4": { level: 2, justification: "Interprets benchmark data to justify algorithm choices" },
      "PO-5": { level: 2, justification: "Utilises profiling tools to assess program performance" },
      "PSO-1": { level: 2, justification: "Evaluates computational data representation efficiency" },
      "PSO-2": { level: 2, justification: "Justifies platform and language construct choices" },
    },
    "CO-5": {
      "PO-1": { level: 2, justification: "Integrates complete computing principles into program design" },
      "PO-2": { level: 2, justification: "Formulates end-to-end solutions for computable problems" },
      "PO-3": { level: 3, justification: "Develops creative, modular solutions meeting specifications" },
      "PO-4": { level: 2, justification: "Conducts functional testing of developed software modules" },
      "PO-5": { level: 3, justification: "Actively writes, debugs and verifies code using modern IDEs and tools" },
      "PO-8": { level: 1, justification: "Supports collaborative software practice in lab assignments" },
      "PSO-1": { level: 3, justification: "Implements end-to-end computational solutions" },
      "PSO-2": { level: 3, justification: "Develops full software programs adhering to standards" },
    },
  },
  teaching_hours: {
    lectures: 45,
    lab: 30,
    tests_exams: 10,
    total: 85,
  },
  assessment: {
    components: [
      { name: "Continuous Evaluation (CE)", weight_percent: 60 },
      { name: "Semester End Exam (SEE)", weight_percent: 25 },
      { name: "Laboratory Examination (Lab)", weight_percent: 15 },
    ],
    co_coverage: {
      "CO-1": ["Continuous Evaluation (CE)", "Semester End Exam (SEE)"],
      "CO-2": ["Continuous Evaluation (CE)", "Semester End Exam (SEE)"],
      "CO-3": ["Continuous Evaluation (CE)", "Semester End Exam (SEE)"],
      "CO-4": ["Continuous Evaluation (CE)", "Semester End Exam (SEE)", "Laboratory Examination (Lab)"],
      "CO-5": ["Continuous Evaluation (CE)", "Semester End Exam (SEE)", "Laboratory Examination (Lab)"],
    },
  },
  defects: [
    {
      code: "HOURS_INCONSISTENT",
      location: { source: "spec", section: 6, refs: [] },
      description: "Teaching and learning methods hours sum to 85, but Table 1 interaction hours specified 75.",
      fix: "Updated total hours to reflect actual sum of 85 hours across lectures, lab, and examinations.",
    },
    {
      code: "CO_MISSING_IN_TABLE",
      location: { source: "spec", section: 5, refs: ["CO-5"] },
      description: "Course outcome CO-5 was present in Section 3 but omitted from the Section 5 CO-PO-PSO map table.",
      fix: "Generated complete CO-5 row in the CO-PO-PSO map adhering to Bloom's level 6 (Create).",
    },
    {
      code: "PSO_COLUMN_MISMATCH",
      location: { source: "spec", section: 5, refs: ["PSO-3"] },
      description: "Old map included PSO-3, but the academic regulations specify only PSO-1 and PSO-2.",
      fix: "Removed extraneous PSO-3 column to comply with official B.Tech regulation standards.",
    },
    {
      code: "CO_EXTRA_IN_TABLE",
      location: { source: "spec", section: 7, refs: ["CO-6"] },
      description: "Assessment focus table listed CO-6, but Section 3 only defines CO-1 through CO-5.",
      fix: "Removed orphan CO-6 entry from the assessment coverage matrix.",
    },
    {
      code: "MAPPING_BLOOM_MISMATCH",
      location: { source: "spec", section: 5, refs: ["CO-1", "PO-3"] },
      description: "CO-1 is at Bloom's level 2 (Explain) but was mapped with strength to PO-3 (Design), exceeding its Bloom ceiling.",
      fix: "Re-aligned CO-1 mappings to foundational outcomes (PO-1, PSO-1) and removed design claims.",
    },
  ],
};

if (!fs.existsSync("outputs")) fs.mkdirSync("outputs");

// 1. Write specforge_output.json
fs.writeFileSync("outputs/specforge_output.json", JSON.stringify(specforgeOutput, null, 2));
console.log("✓ Saved outputs/specforge_output.json");

// 2. Render and write spec.html
const html = renderSpecHtml(specforgeOutput, "Approved");
fs.writeFileSync("outputs/spec.html", html);
console.log("✓ Saved outputs/spec.html");
