import type { Question } from "@/lib/gameData";

const DEFAULT_PRIZES = [
  200000, 400000, 600000, 1000000, 2000000, 3000000, 6000000, 10000000, 14000000, 22000000, 30000000, 40000000,
  60000000, 85000000, 150000000,
];

const REQUIRED_COLUMNS = [
  "set_id",
  "position",
  "question",
  "answer_a",
  "answer_b",
  "answer_c",
  "answer_d",
  "correct_index",
];

export const CSV_TEMPLATE = `set_id,position,question,answer_a,answer_b,answer_c,answer_d,correct_index,prize,is_safe
Bo mac dinh,0,"Thủ đô của Việt Nam là thành phố nào?","TP. Hồ Chí Minh","Hà Nội","Đà Nẵng","Huế",1,200000,false
Bo mac dinh,1,"1 + 1 bằng mấy?","1","2","3","4",1,400000,true
Bo nang cao,0,"Tốc độ ánh sáng xấp xỉ bao nhiêu km/giây?","3.000","30.000","300.000","3.000.000",2,200000,false
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

export type ParsedSet = {
  name: string;
  prizes: number[];
  safe: number[];
  questions: Question[];
};

export type CsvImportResult = {
  sets: ParsedSet[];
  errors: string[];
};

const TRUE_VALUES = new Set(["1", "true", "x", "có", "co", "đúng", "dung"]);

export function buildSetsFromCsv(text: string): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { sets: [], errors: ["File CSV trống hoặc thiếu dữ liệu."] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  const iSetId = col("set_id");
  const iPosition = col("position");
  const iQ = col("question");
  const iA = col("answer_a");
  const iB = col("answer_b");
  const iC = col("answer_c");
  const iD = col("answer_d");
  const iCorrect = col("correct_index");
  const iPrize = col("prize");
  const iSafe = col("is_safe");

  if ([iSetId, iPosition, iQ, iA, iB, iC, iD, iCorrect].some((i) => i === -1)) {
    return {
      sets: [],
      errors: [`File CSV thiếu cột bắt buộc. Cần đủ các cột: ${REQUIRED_COLUMNS.join(", ")}`],
    };
  }

  type RawRow = { position: number; q: string; a: string[]; c: number; prize: number; isSafe: boolean };
  const groups = new Map<string, RawRow[]>();
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const setId = (cols[iSetId] || "").trim();
    const q = (cols[iQ] || "").trim();
    const a = [cols[iA], cols[iB], cols[iC], cols[iD]].map((v) => (v || "").trim());
    const correctIndex = Number((cols[iCorrect] || "").trim());

    if (!setId || !q || a.some((v) => !v) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      errors.push(`Dòng ${r + 1}: thiếu set_id/câu hỏi/đáp án, hoặc correct_index không phải số 0-3 — đã bỏ qua.`);
      continue;
    }

    const position = Number((cols[iPosition] || "").trim());
    const prizeRaw = iPrize !== -1 ? Number((cols[iPrize] || "").replace(/[.,\s]/g, "")) : NaN;
    const safeRaw = iSafe !== -1 ? (cols[iSafe] || "").trim().toLowerCase() : "";

    const list = groups.get(setId) ?? [];
    list.push({
      position: Number.isFinite(position) ? position : list.length,
      q,
      a,
      c: correctIndex,
      prize: Number.isFinite(prizeRaw) && prizeRaw > 0 ? prizeRaw : NaN,
      isSafe: TRUE_VALUES.has(safeRaw),
    });
    groups.set(setId, list);
  }

  const sets: ParsedSet[] = [];
  for (const [setId, rawRows] of groups) {
    const sorted = [...rawRows].sort((x, y) => x.position - y.position);
    const prizes: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const fallback = DEFAULT_PRIZES[i] ?? Math.round(((prizes[i - 1] || 200000) * 1.5) / 1000) * 1000;
      prizes.push(Number.isFinite(r.prize) ? r.prize : fallback);
    }
    sets.push({
      name: setId,
      prizes,
      safe: sorted.flatMap((r, i) => (r.isSafe ? [i] : [])),
      questions: sorted.map((r) => ({ q: r.q, a: r.a, c: r.c })),
    });
  }

  return { sets, errors };
}
