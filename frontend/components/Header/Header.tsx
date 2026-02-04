import { Search } from "lucide-react";

export default function Header() {
  return (
    <header className="flex justify-between items-center px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 relative">
          <div className="absolute inset-2 border-2 border-white/30 rounded" />
        </div>
        <span className="text-xl font-semibold">Soundy</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#13131a] border border-white/8 rounded-xl px-4 py-2 w-[260px]">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            placeholder="Поиск..."
            className="bg-transparent outline-none text-sm w-full text-white placeholder:text-gray-500"
          />
        </div>

        <div className="w-9 h-9 rounded-xl bg-[#1c1c26] border border-white/8 flex items-center justify-center text-sm font-semibold">
          JD
        </div>
      </div>
    </header>
  );
}
