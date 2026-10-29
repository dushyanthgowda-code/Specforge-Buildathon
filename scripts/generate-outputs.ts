import fs from "fs";
import path from "path";
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
      "This course provides an introduction to Computer Science and Engineering for undergraduate students across engineering disciplines. Unit 1 explores computers, computing devices, the nature and practice of the CSE discipline, and emerging artificial intelligence frontiers. Unit 2 establishes algorithmic problem solving techniques using flowcharts and pseudocode. Unit 3 introduces procedural programming using the Python language, covering fundamental data types, variables, control structures, loops, functions, and recursion. Unit 4 emphasizes good programming style, modular problem decomposition, random number generation, and systematic program testing. Unit 5 investigates fundamental iterative and recursive searching and sorting algorithms. Unit 6 covers essential linear and non-linear data structures, focusing on the representation, operations, and applications of arrays, stacks, and queues. Through integrated practical laboratory sessions, students acquire hands-on software development proficiency.",
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
      title: "Introduction",
      lab: "Edit and execute Python programs using Python command line, Using IDE (Interactive mode, Script mode)",
    },
    {
      number: 2,
      title: "Problem Solving using Computers",
      lab: "Lab Exercises on Problem Solving Using Computers.",
    },
    {
      number: 3,
      title: "Building Blocks of Computer Programs",
      lab: "Lab Exercises on Building Blocks of Computers.",
    },
    {
      number: 4,
      title: "Elements of Computer Programming",
      lab: "Lab Exercises on Problem Solving Using random number generation.",
    },
    {
      number: 5,
      title: "Basic Algorithms",
      lab: "Lab Exercises on Problem Solving Using Iterative and recursive algorithms.",
    },
    {
      number: 6,
      title: "Basic Data Structures",
      lab: "Implement array operations (insertion, deletion, traversal and searching), stack operations (push, pop and peek) using arrays, queue operations (enqueue and dequeue) using arrays, and develop programs demonstrating stack and queue applications.",
    },
  ],
  co_po_pso_map: {
    "CO-1": {
      "PO-1": { level: 2, justification: "Provides foundational computing and engineering fundamentals" },
      "PO-2": { level: 1, justification: "Supports initial problem analysis and classification" },
      "PSO-1": { level: 2, justification: "Builds core understanding of computing and algorithms" },
      "PSO-2": { level: 1, justification: "Introduces basic programming platforms and tools" },
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
