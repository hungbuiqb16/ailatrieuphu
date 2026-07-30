import "server-only";
import { createClient } from "@supabase/supabase-js";

type QuestionSetRow = { id: string; name: string; created_at: string };
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
type AppSettingsRow = {
  id: number;
  active_set_id: string | null;
  time_per_question: number;
  lifeline_5050: boolean;
  lifeline_phone: boolean;
  lifeline_audience: boolean;
};

export type Database = {
  public: {
    Tables: {
      question_sets: {
        Row: QuestionSetRow;
        Insert: Partial<QuestionSetRow> & Pick<QuestionSetRow, "id" | "name">;
        Update: Partial<QuestionSetRow>;
        Relationships: [];
      };
      questions: {
        Row: QuestionRow;
        Insert: Partial<QuestionRow> &
          Pick<
            QuestionRow,
            | "set_id"
            | "position"
            | "question"
            | "answer_a"
            | "answer_b"
            | "answer_c"
            | "answer_d"
            | "correct_index"
            | "prize"
            | "is_safe"
          >;
        Update: Partial<QuestionRow>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: Partial<AppSettingsRow>;
        Update: Partial<AppSettingsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseServerClient() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Thiếu biến môi trường SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Xem .env.local.example."
    );
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}
