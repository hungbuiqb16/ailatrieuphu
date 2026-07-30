"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import type { GameData, QuestionSet } from "@/lib/gameData";
import { buildSetsFromCsv } from "@/lib/csv";

export type Row = {
  key: number;
  prize: number;
  safe: boolean;
  q: string;
  a0: string;
  a1: string;
  a2: string;
  a3: string;
  c: number;
};

export function setToRows(set: QuestionSet): Row[] {
  return set.questions.map((question, i) => ({
    key: i,
    prize: set.prizes[i],
    safe: set.safe.includes(i),
    q: question.q,
    a0: question.a[0],
    a1: question.a[1],
    a2: question.a[2],
    a3: question.a[3],
    c: question.c,
  }));
}

export function rowsToSet(set: QuestionSet, rows: Row[]): QuestionSet {
  return {
    ...set,
    prizes: rows.map((r) => r.prize),
    safe: rows.filter((r) => r.safe).map((r) => r.key),
    questions: rows.map((r) => ({ q: r.q, a: [r.a0, r.a1, r.a2, r.a3], c: r.c })),
  };
}

const DEFAULT_PRIZES = [
  200000, 400000, 600000, 1000000, 2000000, 3000000, 6000000, 10000000, 14000000, 22000000, 30000000, 40000000,
  60000000, 85000000, 150000000,
];

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type GameDataContextValue = {
  loading: boolean;
  saving: boolean;
  data: GameData;
  setSettings: (updater: (s: GameData["settings"]) => GameData["settings"]) => void;
  updateSet: (id: string, updater: (s: QuestionSet) => QuestionSet) => void;
  createSet: (name: string) => Promise<string>;
  importSetsFromCsv: (csvText: string) => Promise<{ ok: boolean; ids: string[]; errors: string[] }>;
  duplicateSet: (id: string) => Promise<string>;
  deleteSet: (id: string) => Promise<void>;
  renameSet: (id: string, name: string) => Promise<void>;
  activateSet: (id: string) => Promise<void>;
  save: () => Promise<void>;
};

const GameDataContext = createContext<GameDataContextValue | null>(null);

export function useGameData() {
  const ctx = useContext(GameDataContext);
  if (!ctx) throw new Error("useGameData must be used within GameDataProvider");
  return ctx;
}

const EMPTY_DATA: GameData = {
  activeSetId: "",
  sets: [],
  settings: { timePerQuestion: 30, lifelines: { f5050: true, phone: true, audience: true } },
};

export function GameDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<GameData>(EMPTY_DATA);

  useEffect(() => {
    fetch("/api/admin/game-data")
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((d: GameData) => setData(d))
      .catch(() => {
        router.push("/admin/login");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ghi thẳng `next` xuống server, tránh đọc `data` từ closure cũ (state có thể chưa kịp cập nhật).
  async function persist(next: GameData) {
    setData(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/game-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const resData = await res.json();
      if (!res.ok) {
        message.error(resData.message || "Lưu thất bại");
        return;
      }
      message.success("Đã lưu thay đổi");
    } finally {
      setSaving(false);
    }
  }

  function setSettings(updater: (s: GameData["settings"]) => GameData["settings"]) {
    setData((d) => ({ ...d, settings: updater(d.settings) }));
  }

  function updateSet(id: string, updater: (s: QuestionSet) => QuestionSet) {
    setData((d) => ({ ...d, sets: d.sets.map((s) => (s.id === id ? updater(s) : s)) }));
  }

  async function createSet(name: string) {
    const id = makeId();
    const newSet: QuestionSet = { id, name, prizes: [...DEFAULT_PRIZES], safe: [4, 9], questions: [] };
    const activeSetId = data.activeSetId || id;
    await persist({ ...data, activeSetId, sets: [...data.sets, newSet] });
    return id;
  }

  async function importSetsFromCsv(csvText: string) {
    const { sets: parsedSets, errors } = buildSetsFromCsv(csvText);
    if (parsedSets.length === 0) {
      return { ok: false, ids: [], errors: errors.length ? errors : ["Không đọc được câu hỏi nào hợp lệ từ file."] };
    }
    const newSets: QuestionSet[] = parsedSets.map((s) => ({ id: makeId(), ...s }));
    const activeSetId = data.activeSetId || newSets[0].id;
    await persist({ ...data, activeSetId, sets: [...data.sets, ...newSets] });
    return { ok: true, ids: newSets.map((s) => s.id), errors };
  }

  async function duplicateSet(id: string) {
    const newId = makeId();
    const source = data.sets.find((s) => s.id === id);
    if (!source) return newId;
    const copy: QuestionSet = {
      ...source,
      id: newId,
      name: `${source.name} (bản sao)`,
      prizes: [...source.prizes],
      safe: [...source.safe],
      questions: source.questions.map((q) => ({ ...q, a: [...q.a] })),
    };
    await persist({ ...data, sets: [...data.sets, copy] });
    return newId;
  }

  async function deleteSet(id: string) {
    if (data.sets.length <= 1) return;
    const sets = data.sets.filter((s) => s.id !== id);
    const activeSetId = data.activeSetId === id ? sets[0].id : data.activeSetId;
    await persist({ ...data, sets, activeSetId });
  }

  async function renameSet(id: string, name: string) {
    await persist({ ...data, sets: data.sets.map((s) => (s.id === id ? { ...s, name } : s)) });
  }

  async function activateSet(id: string) {
    await persist({ ...data, activeSetId: id });
  }

  async function save() {
    await persist(data);
  }

  return (
    <GameDataContext.Provider
      value={{
        loading,
        saving,
        data,
        setSettings,
        updateSet,
        createSet,
        importSetsFromCsv,
        duplicateSet,
        deleteSet,
        renameSet,
        activateSet,
        save,
      }}
    >
      {children}
    </GameDataContext.Provider>
  );
}
