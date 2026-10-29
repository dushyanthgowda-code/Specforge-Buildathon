import React, { useEffect, useState } from "react";
import { call } from "./api";
import Settings from "./Settings";

interface GenerationResult {
  output: {
    schema_version: string;
    input_id: string;
    template: "integrated" | "non_lab";
    course: {
      title: string;
      code: string;
      department: string;
      credits_ltp: string;
      course_type: string;
      summary: string;
    };
    course_outcomes: Array<{
      id: string;
      statement: string;
      bloom_level: number;
    }>;
    units: Array<{
      number: number;
      title: string;
      lab: string | null;
    }>;
    co_po_pso_map: Record<
      string,
      Record<string, { level: 1 | 2 | 3; justification: string } | null>
    >;
    teaching_hours: {
      lectures: number;
      lab: number;
      tests_exams: number;
      total: number;
    };
    assessment: {
      components: Array<{ name: string; weight_percent: number }>;
      co_coverage: Record<string, string[]>;
    };
    defects: Array<{
      code: string;
      location: { source: string; section: number | null; refs: string[] };
      description: string;
      fix: string;
    }>;
  };
  html: string;
}

export default function App() {
  const [openSettings, setOpenSettings] = useState(false);
  const [health, setHealth] = useState("checking...");
  const [role, setRole] = useState<"Author" | "Reviewer" | "HOD">("Author");

  const [specFile, setSpecFile] = useState<File | null>(null);
  const [bpFile, setBpFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    call<{ status: string }>("/health")
      .then((d) => setHealth(d.status))
      .catch(() => setHealth("server not reachable"));

    call<GenerationResult>("/latest-output")
      .then((data) => setResult(data))
      .catch(() => {});
  }, []);

  async function handleRunSample() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await call<GenerationResult>("/generate-sample", {
        method: "POST",
      });
      setResult(data);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to process sample course");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadAndRun(e: React.FormEvent) {
    e.preventDefault();
    if (!specFile) {
      setErrorMsg("Please select an existing course specification document.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("spec", specFile);
    if (bpFile) formData.append("blueprint", bpFile);

    try {
      const data = await call<GenerationResult>("/generate", {
        method: "POST",
        body: formData,
      });
      setResult(data);
    } catch (e: any) {
      setErrorMsg(e.message || "Processing failed");
    } finally {
      setLoading(false);
    }
  }

  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openHtmlPreview() {
    if (!result?.html) return;
    const blob = new Blob([result.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  const poList = [
    "PO-1", "PO-2", "PO-3", "PO-4", "PO-5", "PO-6",
    "PO-7", "PO-8", "PO-9", "PO-10", "PO-11",
  ];
  const psoList = ["PSO-1", "PSO-2"];

  return (
    <>
      <header className="bar">
        <h1>SpecForge — Course Specification Builder</h1>
        <span className={`pill ${health === "up" ? "green" : ""}`}>
          Server: {health}
        </span>
        <div className="grow" />
        <label style={{ flexDirection: "row", alignItems: "center" }}>
          <span>Role:</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            style={{ padding: "4px 8px" }}
          >
            <option value="Author">Author</option>
            <option value="Reviewer">Reviewer</option>
            <option value="HOD">HOD</option>
          </select>
        </label>
        <button
          className="ghost"
          onClick={() => setOpenSettings(true)}
          aria-label="Settings"
        >
          ⚙ Settings
        </button>
      </header>

      <main>
        {/* Quick Launch Card */}
        <section className="card">
          <h2>1. Process Course Documents</h2>
          <p className="hint" style={{ marginBottom: "16px" }}>
            Upload a messy course spec and optional question blueprint, or click below to run with the official competition sample files.
          </p>

          <div className="row" style={{ marginBottom: "20px" }}>
            <button
              onClick={handleRunSample}
              disabled={loading}
              style={{ padding: "12px 24px", fontSize: "1rem" }}
            >
              {loading ? "AI is processing documents..." : "⚡ Run with Sample Inputs (1-Click Test)"}
            </button>
          </div>

          <form onSubmit={handleUploadAndRun}>
            <div className="grid-2">
              <label className="file-slot">
                <span>📁 Existing Spec (.docx, .doc, .pdf) *</span>
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.html"
                  onChange={(e) => setSpecFile(e.target.files?.[0] || null)}
                />
                <div style={{ marginTop: "8px", fontWeight: "normal", color: "#64748b" }}>
                  {specFile ? specFile.name : "Click to select course spec"}
                </div>
              </label>

              <label className="file-slot">
                <span>📁 Question Blueprint (.doc, .docx) [Optional]</span>
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.html"
                  onChange={(e) => setBpFile(e.target.files?.[0] || null)}
                />
                <div style={{ marginTop: "8px", fontWeight: "normal", color: "#64748b" }}>
                  {bpFile ? bpFile.name : "Click to select blueprint (optional)"}
                </div>
              </label>
            </div>

            <div className="row" style={{ marginTop: "16px" }}>
              <button
                type="submit"
                className="secondary"
                disabled={loading || !specFile}
              >
                Upload & Process Custom Files
              </button>
            </div>
          </form>

          {errorMsg && (
            <p className="bad" style={{ marginTop: "14px", fontWeight: 600 }}>
              ⚠ {errorMsg}
            </p>
          )}
        </section>

        {/* Results View */}
        {result && (
          <>
            {/* Export Bar */}
            <section
              className="card"
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", color: "#166534" }}>
                  ✓ Course Specification Ready!
                </h3>
                <span style={{ fontSize: ".85rem", color: "#15803d" }}>
                  Export files for scoring on the SpecForge Arena.
                </span>
              </div>
              <div className="row">
                <a
                  href="/api/v1/download/json"
                  download="specforge_output.json"
                  style={{
                    display: "inline-block",
                    padding: "9px 16px",
                    background: "#2563eb",
                    color: "#fff",
                    borderRadius: "8px",
                    fontWeight: 600,
                    textDecoration: "none",
                    fontSize: ".9rem",
                  }}
                >
                  📥 Download specforge_output.json (80 pts)
                </a>
                <a
                  href="/api/v1/download/html"
                  download="spec.html"
                  style={{
                    display: "inline-block",
                    padding: "9px 16px",
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontWeight: 600,
                    textDecoration: "none",
                    fontSize: ".9rem",
                  }}
                >
                  📥 Download spec.html (20 pts)
                </a>
                <button className="ghost" onClick={openHtmlPreview}>
                  Preview Spec Document ↗
                </button>
              </div>
            </section>

            {/* Course Summary Card */}
            <section className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2>2. Course Details</h2>
                <span className="pill green">
                  Template: {result.output.template.toUpperCase()}
                </span>
              </div>
              <div className="grid-2" style={{ marginTop: "8px" }}>
                <div>
                  <p><strong>Title:</strong> {result.output.course.title}</p>
                  <p><strong>Code:</strong> {result.output.course.code}</p>
                  <p><strong>Department:</strong> {result.output.course.department}</p>
                </div>
                <div>
                  <p><strong>Credits (L:T:P):</strong> {result.output.course.credits_ltp}</p>
                  <p><strong>Course Type:</strong> {result.output.course.course_type}</p>
                  <p><strong>Total Hours:</strong> {result.output.teaching_hours.total}</p>
                </div>
              </div>
              <p style={{ marginTop: "12px", fontSize: ".9rem", lineHeight: 1.5 }}>
                <strong>Summary:</strong> {result.output.course.summary}
              </p>
            </section>

            {/* CO-PO-PSO Matrix Card */}
            <section className="card">
              <h2>3. CO-PO-PSO Mapping Matrix (24 Points)</h2>
              <p className="hint" style={{ marginBottom: "12px" }}>
                Hover over colored cells to read the Bloom-compliant justification.
              </p>
              <div className="table-wrap">
                <table className="map-tbl">
                  <thead>
                    <tr>
                      <th>CO</th>
                      <th>Bloom</th>
                      {poList.map((po) => (
                        <th key={po}>{po}</th>
                      ))}
                      {psoList.map((pso) => (
                        <th key={pso}>{pso}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.output.course_outcomes.map((co) => {
                      const row = result.output.co_po_pso_map[co.id] || {};
                      return (
                        <tr key={co.id}>
                          <td style={{ fontWeight: 600 }}>{co.id}</td>
                          <td>L{co.bloom_level}</td>
                          {poList.map((po) => {
                            const cell = row[po];
                            const lvl = cell?.level;
                            return (
                              <td
                                key={po}
                                className={lvl ? `cell-${lvl}` : ""}
                                title={cell?.justification || ""}
                              >
                                {lvl || ""}
                              </td>
                            );
                          })}
                          {psoList.map((pso) => {
                            const cell = row[pso];
                            const lvl = cell?.level;
                            return (
                              <td
                                key={pso}
                                className={lvl ? `cell-${lvl}` : ""}
                                title={cell?.justification || ""}
                              >
                                {lvl || ""}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Validation & Defects Card */}
            <section className="card">
              <h2>4. Inspector & Defects Report (20 Points)</h2>
              {result.output.defects.length === 0 ? (
                <p className="good">✓ No defects detected in the specification.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {result.output.defects.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 14px",
                        borderLeft: "4px solid #ef4444",
                        background: "rgba(239, 68, 68, 0.05)",
                        borderRadius: "4px",
                        fontSize: ".9rem",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#b91c1c" }}>
                        [{d.code}] {d.description}
                      </div>
                      <div style={{ color: "#15803d", marginTop: "3px" }}>
                        ↳ Fix Applied: {d.fix}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {openSettings && <Settings onClose={() => setOpenSettings(false)} />}
    </>
  );
}
