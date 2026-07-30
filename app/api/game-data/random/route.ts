import { NextRequest, NextResponse } from "next/server";
import { getRandomPublicGameData } from "@/lib/gameData";

export async function GET(req: NextRequest) {
  const exclude = req.nextUrl.searchParams.get("exclude") || undefined;
  const data = await getRandomPublicGameData(exclude);
  if (!data) {
    return NextResponse.json({ message: "Chưa có bộ câu hỏi nào" }, { status: 404 });
  }
  return NextResponse.json(data);
}
