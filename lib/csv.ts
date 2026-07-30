import type { Question } from "@/lib/gameData";

const DEFAULT_PRIZES = [
  200000, 400000, 600000, 1000000, 2000000, 3000000, 6000000, 10000000, 14000000, 22000000, 30000000, 40000000,
  60000000, 85000000, 150000000,
];

const REQUIRED_COLUMNS = ["cau_hoi", "dap_an_a", "dap_an_b", "dap_an_c", "dap_an_d", "dap_an_dung"];

export const CSV_TEMPLATE = `cau_hoi,dap_an_a,dap_an_b,dap_an_c,dap_an_d,dap_an_dung,gia_tri,moc_an_toan
"Thủ đô của Việt Nam là thành phố nào?","TP. Hồ Chí Minh","Hà Nội","Đà Nẵng","Huế",B,200000,
"1 + 1 bằng mấy?","1","2","3","4",B,400000,x
`;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/^﻿/, "");

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      // bỏ qua, xử lý xuống dòng ở \n
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type CsvImportResult = {
  questions: Question[];
  prizes: number[];
  safe: number[];
  errors: string[];
};

const SAFE_TRUE_VALUES = new Set(["1", "true", "x", "có", "co", "đúng", "dung"]);

export function buildSetFromCsv(text: string): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { questions: [], prizes: [], safe: [], errors: ["File CSV trống hoặc thiếu dữ liệu."] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  const iQ = col("cau_hoi");
  const iA = col("dap_an_a");
  const iB = col("dap_an_b");
  const iC = col("dap_an_c");
  const iD = col("dap_an_d");
  const iCorrect = col("dap_an_dung");
  const iPrize = col("gia_tri");
  const iSafe = col("moc_an_toan");

  if ([iQ, iA, iB, iC, iD, iCorrect].some((i) => i === -1)) {
    return {
      questions: [],
      prizes: [],
      safe: [],
      errors: [`File CSV thiếu cột bắt buộc. Cần đủ các cột: ${REQUIRED_COLUMNS.join(", ")}`],
    };
  }

  const questions: Question[] = [];
  const prizes: number[] = [];
  const safe: number[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const q = (cols[iQ] || "").trim();
    const a = [cols[iA], cols[iB], cols[iC], cols[iD]].map((v) => (v || "").trim());
    const correctLetter = (cols[iCorrect] || "").trim().toUpperCase();
    const correctIndex = "ABCD".indexOf(correctLetter);

    if (!q || a.some((v) => !v) || correctIndex === -1) {
      errors.push(`Dòng ${r + 1}: thiếu câu hỏi/đáp án, hoặc "đáp án đúng" không phải A/B/C/D — đã bỏ qua.`);
      continue;
    }

    const rowIndex = questions.length;
    questions.push({ q, a, c: correctIndex });

    const prizeRaw = iPrize !== -1 ? Number((cols[iPrize] || "").replace(/[.,\s]/g, "")) : NaN;
    const fallbackPrize = DEFAULT_PRIZES[rowIndex] ?? Math.round(((prizes[rowIndex - 1] || 200000) * 1.5) / 1000) * 1000;
    prizes.push(Number.isFinite(prizeRaw) && prizeRaw > 0 ? prizeRaw : fallbackPrize);

    const safeRaw = iSafe !== -1 ? (cols[iSafe] || "").trim().toLowerCase() : "";
    if (SAFE_TRUE_VALUES.has(safeRaw)) safe.push(rowIndex);
  }

  return { questions, prizes, safe, errors };
}
