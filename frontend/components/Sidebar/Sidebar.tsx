import Link from "next/link";
import { Home, Library, Upload, Heart } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="bg-[#13131a] border border-white/8 rounded-2xl py-6 px-4">
      <nav className="space-y-2">
        <Link href="/" className="nav active">
          <Home />
          Главная
        </Link>
        <Link href="/library" className="nav">
          <Library />
          Библиотека
        </Link>
        <div className="nav">
          <Heart />
          Избранное
        </div>
        <div className="nav">
          <Upload />
          Загрузить
        </div>
      </nav>
    </aside>
  );
}
