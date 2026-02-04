"use client";

import { Play } from "lucide-react";
import Sidebar from "@/components/Sidebar/Sidebar";
import Header from "@/components/Header/Header";

export default function HomePage() {
  return (
    <>
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.12)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.12)_0%,transparent_55%)]" />

      <div className="h-screen p-6 grid grid-rows-[auto_1fr_auto] gap-5">
        <Header />

        <div className="grid grid-cols-[260px_1fr] gap-5">
          <Sidebar />

          <main className="bg-[#13131a] border border-white/8 rounded-2xl overflow-hidden">
            <section className="p-14 bg-gradient-to-br from-indigo-500/15 to-purple-600/10">
              <span className="inline-block mb-5 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                Новинка недели
              </span>

              <h1 className="text-5xl font-bold leading-tight mb-5">
                Откройте новую
                <br />
                музыку
              </h1>

              <p className="text-gray-400 max-w-xl mb-8">
                Персональные рекомендации на основе ваших вкусов.
              </p>

              <button className="inline-flex items-center gap-3 px-9 py-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold shadow-lg hover:-translate-y-1 transition-all">
                <Play className="w-5 h-5 fill-white" />
                Начать слушать
              </button>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
