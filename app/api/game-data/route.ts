import { NextResponse } from "next/server";
import { getPublicGameData } from "@/lib/gameData";

export async function GET() {
  const data = await getPublicGameData();
  if (!data) {
    return NextResponse.json({ message: "Chưa có bộ câu hỏi nào" }, { status: 404 });
  }
  return NextResponse.json(data);
}
