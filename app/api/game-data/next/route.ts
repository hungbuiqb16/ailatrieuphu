import { NextRequest, NextResponse } from "next/server";
import { getNextPublicGameData } from "@/lib/gameData";

export async function GET(req: NextRequest) {
  const playedParam = req.nextUrl.searchParams.get("played") || "";
  const playedSetIds = playedParam.split(",").filter(Boolean);

  const data = await getNextPublicGameData(playedSetIds);
  if (!data) {
    return NextResponse.json({ message: "Chưa có bộ câu hỏi nào" }, { status: 404 });
  }
  return NextResponse.json(data);
}
