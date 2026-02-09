import Link from "next/link";
import { Home, Library, Upload, Heart } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="sidebar-shell">
      <nav className="sidebar-nav">
        <Link href="/" className="nav active">
          <Home />
          Главная
        </Link>
        <Link href="/library" className="nav">
          <Library />
          Библиотека
        </Link>
        <Link href="/favorites" className="nav">
          <Heart />
          Избранное
        </Link>
        <div className="nav">
          <Upload />
          Загрузить
        </div>
      </nav>
    </aside>
  );
}
