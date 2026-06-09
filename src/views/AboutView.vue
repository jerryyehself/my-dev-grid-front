<template>
  <div
    class="max-w-5xl mx-auto py-12 px-4 bg-stone-50 text-slate-900 min-h-screen font-mono relative overflow-hidden"
  >
    <div
      class="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40 pointer-events-none"
    ></div>

    <div class="relative z-10 space-y-12">
      <header class="text-center md:text-left border-b border-slate-900 pb-4 max-w-xl">
        <span class="text-[10px] bg-slate-950 text-white px-1.5 py-0.5">MAPPED_ENTITY_GRAPH</span>
        <h1 class="text-xl font-black mt-2 tracking-tight">Jerry's Knowledge & Resource Graph</h1>
        <p class="text-xs text-slate-500 mt-1">
          以我（Subject）為核心交織出的網際網路語義鏈結節點。
        </p>
      </header>

      <div
        class="grid grid-cols-1 md:grid-cols-5 gap-y-12 md:gap-y-6 items-center max-w-4xl mx-auto relative pt-8"
      >
        <div class="md:col-span-2 md:text-right relative group">
          <div
            class="border-2 border-slate-900 bg-white p-4 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-translate-y-1"
          >
            <div class="text-[9px] font-bold text-indigo-650 tracking-wider">
              PREDICATE // owl:sameAs
            </div>
            <h3 class="text-sm font-black mt-1">🐙 Object: github.com/jerryyehself</h3>
            <p class="text-[11px] text-slate-500 mt-1">
              託管我所有真實代碼演進與學習 commit 歷史的主據點。
            </p>
            <a
              href="https://github.com/jerryyehself"
              target="_blank"
              class="inline-block text-[11px] font-bold underline text-indigo-600 mt-2 hover:text-slate-950"
              >LAUNCH EXT_RESOURCE ↗</a
            >
          </div>
          <div
            class="hidden md:block absolute top-1/2 -right-12 w-12 h-0.5 bg-slate-900 origin-left rotate-[15deg] border-t border-dashed border-slate-400"
          ></div>
        </div>

        <div class="hidden md:block md:col-span-1"></div>

        <div class="md:col-span-2 relative group">
          <div
            class="border-2 border-slate-900 bg-white p-4 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-translate-y-1"
          >
            <div class="text-[9px] font-bold text-indigo-650 tracking-wider">
              PREDICATE // schema:email
            </div>
            <h3 class="text-sm font-black mt-1">✉️ Object: jerry.yeh@example.com</h3>
            <p class="text-[11px] text-slate-500 mt-1">
              通往實體世界的安全通訊管道，提供低阻力的連線跳轉。
            </p>
            <a
              href="mailto:jerry.yeh@example.com"
              class="inline-block text-[11px] font-bold underline text-indigo-600 mt-2 hover:text-slate-950"
              >CONNECT NODE ↗</a
            >
          </div>
          <div
            class="hidden md:block absolute top-1/2 -left-12 w-12 h-0.5 bg-slate-900 origin-right -rotate-[15deg] border-t border-dashed border-slate-400"
          ></div>
        </div>

        <div class="md:col-span-5 flex justify-center py-4 md:py-8 my-[-24px] z-20">
          <div
            class="border-4 border-slate-900 bg-slate-900 text-white p-6 rounded-none text-center min-w-[220px] shadow-[8px_8px_0px_0px_rgba(99,102,241,0.2)]"
          >
            <div class="text-[10px] text-indigo-400 font-bold tracking-widest">
              // CENTRAL_SUBJECT
            </div>
            <h2 class="text-2xl font-black tracking-tight mt-1">Jerry Yeh</h2>
            <div
              class="text-[10px] bg-slate-800 text-slate-300 py-1 px-2 mt-2 inline-block border border-slate-700"
            >
              Identity: Information Organizer
            </div>
          </div>
        </div>

        <div class="md:col-span-2 md:text-right relative group">
          <div
            class="hidden md:block absolute top-1/2 -right-12 w-12 h-0.5 bg-slate-900 origin-left -rotate-[15deg]"
          ></div>
          <div
            class="border-2 border-slate-900 bg-white p-4 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:translate-y-1"
          >
            <div class="text-[9px] font-bold text-emerald-600 tracking-wider">
              PREDICATE // schema:knowsAbout
            </div>
            <h3 class="text-sm font-black mt-1">📚 Controlled Thesaurus</h3>
            <p class="text-[11px] text-slate-500 mt-1">
              核心學術與工程技術概念：資訊組織、Laravel 核心、Vue 3 數據驅動與 GAS 工作流。
            </p>
            <div class="mt-2.5 flex flex-wrap md:justify-end gap-1">
              <span
                class="text-[9px] bg-stone-200 px-1 py-0.5 border border-stone-300 text-stone-700"
                >#Laravel9</span
              >
              <span
                class="text-[9px] bg-stone-200 px-1 py-0.5 border border-stone-300 text-stone-700"
                >#Vue3</span
              >
              <span class="text-[9px] bg-slate-950 text-white px-1 py-0.5">#Info_Org</span>
            </div>
          </div>
        </div>

        <div class="hidden md:block md:col-span-1"></div>

        <div class="md:col-span-2 relative group">
          <div
            class="hidden md:block absolute top-1/2 -left-12 w-12 h-0.5 bg-slate-900 origin-right rotate-[15deg]"
          ></div>
          <div
            class="border-2 border-slate-900 bg-white p-4 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:translate-y-1"
          >
            <div class="text-[9px] font-bold text-amber-600 tracking-wider">
              PREDICATE // schema:interest
            </div>
            <h3 class="text-sm font-black mt-1">📈 Gold Passbook Observation</h3>
            <p class="text-[11px] text-slate-500 mt-1">
              代碼外的非受控擴充：透過資訊組織邏輯，系統化追蹤銀行黃金存摺牌價，將市場價格波動轉化為生活沙盒中的數據實驗。
            </p>
          </div>
        </div>
      </div>
    </div>

    <footer
      class="mt-20 pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-400 text-center"
    >
      Graph Visualization // Connected to Real-World Nodes via Hyperlinks // 2026
    </footer>
  </div>
</template>
