import { NextRequest, NextResponse } from "next/server";
import { readGameData, writeGameData, type GameData, type QuestionSet } from "@/lib/gameData";
import { isAdminRequest } from "@/lib/adminAuth";

function isValidSet(set: QuestionSet) {
  return (
    typeof set.id === "string" &&
    typeof set.name === "string" &&
    Array.isArray(set.prizes) &&
    Array.isArray(set.safe) &&
    Array.isArray(set.questions) &&
    set.prizes.length === set.questions.length &&
    set.questions.every(
      (q) => typeof q.q === "string" && Array.isArray(q.a) && q.a.length === 4 && typeof q.c === "number"
    )
  );
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }
  try {
    return NextResponse.json(await readGameData());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Không kết nối được Supabase" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = (await req.json()) as GameData;

  if (
    typeof body.activeSetId !== "string" ||
    !Array.isArray(body.sets) ||
    body.sets.length === 0 ||
    !body.sets.some((s) => s.id === body.activeSetId) ||
    !body.sets.every(isValidSet)
  ) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  try {
    await writeGameData(body);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Lưu thất bại, vui lòng thử lại" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
