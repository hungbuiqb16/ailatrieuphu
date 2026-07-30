import "server-only";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export type Question = { q: string; a: string[]; c: number };
export type QuestionSet = {
  id: string;
  name: string;
  prizes: number[];
  safe: number[];
  questions: Question[];
};
export type Lifelines = { f5050: boolean; phone: boolean; audience: boolean };
export type Settings = { timePerQuestion: number; lifelines: Lifelines };
export type GameData = {
  activeSetId: string;
  sets: QuestionSet[];
  settings: Settings;
};

export type PublicGameData = {
  setId: string;
  prizes: number[];
  safe: number[];
  questions: Question[];
  settings: Settings;
};

type QuestionRow = {
  id: number;
  set_id: string;
  position: number;
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_index: number;
  prize: number;
  is_safe: boolean;
};

type SettingsRow = {
  active_set_id: string | null;
  time_per_question: number;
  lifeline_5050: boolean;
  lifeline_phone: boolean;
  lifeline_audience: boolean;
};

function rowsToSet(id: string, name: string, rows: QuestionRow[]): QuestionSet {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  return {
    id,
    name,
    prizes: sorted.map((r) => r.prize),
    safe: sorted.flatMap((r, i) => (r.is_safe ? [i] : [])),
    questions: sorted.map((r) => ({
      q: r.question,
      a: [r.answer_a, r.answer_b, r.answer_c, r.answer_d],
      c: r.correct_index,
    })),
  };
}

function settingsRowToSettings(row: SettingsRow): Settings {
  return {
    timePerQuestion: row.time_per_question,
    lifelines: {
      f5050: row.lifeline_5050,
      phone: row.lifeline_phone,
      audience: row.lifeline_audience,
    },
  };
}

export async function readGameData(): Promise<GameData> {
  const supabase = getSupabaseServerClient();

  const [{ data: sets, error: setsError }, { data: questions, error: questionsError }, { data: settingsRow, error: settingsError }] =
    await Promise.all([
      supabase.from("question_sets").select("id, name").order("created_at", { ascending: true }),
      supabase.from("questions").select("*"),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
    ]);

  if (setsError) throw setsError;
  if (questionsError) throw questionsError;
  if (settingsError) throw settingsError;

  const questionsBySet = new Map<string, QuestionRow[]>();
  for (const row of (questions ?? []) as QuestionRow[]) {
    const list = questionsBySet.get(row.set_id) ?? [];
    list.push(row);
    questionsBySet.set(row.set_id, list);
  }

  const questionSets = (sets ?? []).map((s) => rowsToSet(s.id, s.name, questionsBySet.get(s.id) ?? []));
  const settings = settingsRowToSettings(settingsRow as SettingsRow);
  const activeSetId = (settingsRow as SettingsRow).active_set_id ?? questionSets[0]?.id ?? "";

  return { activeSetId, sets: questionSets, settings };
}

export async function writeGameData(data: GameData): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: existingSets, error: existingSetsError } = await supabase.from("question_sets").select("id");
  if (existingSetsError) throw existingSetsError;

  const nextIds = new Set(data.sets.map((s) => s.id));
  const idsToDelete = (existingSets ?? []).map((s) => s.id).filter((id) => !nextIds.has(id));
  if (idsToDelete.length > 0) {
    const { error } = await supabase.from("question_sets").delete().in("id", idsToDelete);
    if (error) throw error;
  }

  for (const set of data.sets) {
    const { error: upsertSetError } = await supabase
      .from("question_sets")
      .upsert({ id: set.id, name: set.name });
    if (upsertSetError) throw upsertSetError;

    const { error: deleteQuestionsError } = await supabase.from("questions").delete().eq("set_id", set.id);
    if (deleteQuestionsError) throw deleteQuestionsError;

    if (set.questions.length > 0) {
      const rows = set.questions.map((q, i) => ({
        set_id: set.id,
        position: i,
        question: q.q,
        answer_a: q.a[0],
        answer_b: q.a[1],
        answer_c: q.a[2],
        answer_d: q.a[3],
        correct_index: q.c,
        prize: set.prizes[i],
        is_safe: set.safe.includes(i),
      }));
      const { error: insertQuestionsError } = await supabase.from("questions").insert(rows);
      if (insertQuestionsError) throw insertQuestionsError;
    }
  }

  const { error: settingsUpdateError } = await supabase
    .from("app_settings")
    .update({
      active_set_id: data.activeSetId,
      time_per_question: data.settings.timePerQuestion,
      lifeline_5050: data.settings.lifelines.f5050,
      lifeline_phone: data.settings.lifelines.phone,
      lifeline_audience: data.settings.lifelines.audience,
    })
    .eq("id", 1);
  if (settingsUpdateError) throw settingsUpdateError;
}

export function getActiveSet(data: GameData): QuestionSet | undefined {
  return data.sets.find((s) => s.id === data.activeSetId) ?? data.sets[0];
}

function toPublicGameData(data: GameData, set: QuestionSet): PublicGameData {
  return { setId: set.id, prizes: set.prizes, safe: set.safe, questions: set.questions, settings: data.settings };
}

export async function getPublicGameData(): Promise<PublicGameData | null> {
  const data = await readGameData();
  const set = getActiveSet(data);
  return set ? toPublicGameData(data, set) : null;
}

/**
 * Chọn bộ câu hỏi kế tiếp theo kiểu xoay vòng: ưu tiên bộ chưa nằm trong
 * `playedSetIds` (chưa chơi trong phiên hiện tại). Khi đã chơi hết mọi bộ,
 * bắt đầu vòng mới nhưng vẫn tránh lặp lại đúng bộ vừa chơi nếu có thể.
 */
export async function getNextPublicGameData(playedSetIds: string[]): Promise<PublicGameData | null> {
  const data = await readGameData();
  if (data.sets.length === 0) return null;

  let candidates = data.sets.filter((s) => !playedSetIds.includes(s.id));
  if (candidates.length === 0) {
    const lastPlayed = playedSetIds[playedSetIds.length - 1];
    candidates = data.sets.length > 1 ? data.sets.filter((s) => s.id !== lastPlayed) : data.sets;
  }

  const set = candidates[Math.floor(Math.random() * candidates.length)];
  return toPublicGameData(data, set);
}
