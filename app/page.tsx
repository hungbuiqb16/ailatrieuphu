import { getPublicGameData } from "@/lib/gameData";
import GameClient from "./GameClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getPublicGameData();

  if (!data) {
    return (
      <div className="stage dots min-h-screen text-cream flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="font-display text-3xl text-gold mb-3">Chưa có bộ câu hỏi</p>
          <p className="font-body font-semibold text-cream/80">
            Vào trang quản trị để tạo hoặc nhập bộ câu hỏi trước khi bắt đầu chơi.
          </p>
        </div>
      </div>
    );
  }

  return <GameClient data={data} />;
}
