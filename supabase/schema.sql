-- Chạy file này trong Supabase SQL Editor để khởi tạo schema cho game
-- "Ai Là Triệu Phú". Dùng text id (không phải uuid) để tương thích với id
-- sinh phía client (Math.random + timestamp) trong trang admin.

create table if not exists question_sets (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id bigint generated always as identity primary key,
  set_id text not null references question_sets (id) on delete cascade,
  position int not null,
  question text not null,
  answer_a text not null,
  answer_b text not null,
  answer_c text not null,
  answer_d text not null,
  correct_index int not null check (correct_index between 0 and 3),
  prize bigint not null,
  is_safe boolean not null default false
);

create unique index if not exists questions_set_position_idx on questions (set_id, position);

create table if not exists app_settings (
  id int primary key default 1,
  active_set_id text references question_sets (id),
  time_per_question int not null default 30,
  lifeline_5050 boolean not null default true,
  lifeline_phone boolean not null default true,
  lifeline_audience boolean not null default true,
  constraint app_settings_singleton check (id = 1)
);

insert into app_settings (id)
values (1)
on conflict (id) do nothing;

-- Bật RLS và không thêm policy nào cho client ẩn danh — toàn bộ truy cập
-- đọc/ghi đi qua API route phía server dùng SUPABASE_SERVICE_ROLE_KEY,
-- key này bỏ qua RLS nên anon/public key sẽ không đọc/ghi được các bảng này.
alter table question_sets enable row level security;
alter table questions enable row level security;
alter table app_settings enable row level security;
