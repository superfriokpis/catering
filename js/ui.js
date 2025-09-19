// ui.js — State + contador RH + badge + filtros de data + mini-cards + sparklines + delta D-1
import { State } from "./state.js";
import { KPIs } from "./features.js"; // manter no topo

export const UI = (() => {
  // -------------------- utils --------------------
  function debounce(fn, ms = 150) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // Parse "YYYY-MM-DD" ou "DD/MM/YYYY" -> Date (meia-noite local)
  function parseDateAny(s) {
    if (!s) return null;
    const str = String(s).trim();
    let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3], 0,0,0,0);
    m = str.match(/^(\d{2})[\/.](\d{2})[\/.](\d{4})$/);
    if (m) return new Date(+m[3], +m[2]-1, +m[1], 0,0,0,0);
    const d = new Date(str);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
  }

  function getDateRangeFromDOM() {
    const startEl = document.getElementById("dateStart");
    const endEl   = document.getElementById("dateEnd");
    const ds = startEl ? parseDateAny(startEl.value) : null;
    const de = endEl   ? parseDateAny(endEl.value)   : null;
    const deInc = de ? new Date(de.getFullYear(), de.getMonth(), de.getDate(), 23,59,59,999) : null; // fim inclusivo
    return { ds, de: deInc };
  }

  function filterByDate(rows, ds, deInc) {
    if (!ds && !deInc) return rows || [];
    return (rows || []).filter(r => {
      const d = parseDateAny(r?.Data);
      if (!d) return false;
      if (ds && d < ds) return false;
      if (deInc && d > deInc) return false;
      return true;
    });
  }

  // -------------------- formatters --------------------
  const fmtMoneyBR = v =>
    (v==null || isNaN(v)) ? "—" : Number(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL", maximumFractionDigits:0 });

  const fmtPct = v =>
    (v==null || isNaN(v)) ? "—" : `${Number(v).toFixed(1).replace(".", ",")}%`;

  const fmtNum = v =>
    (v==null || isNaN(v)) ? "—" : Number(v).toLocaleString("pt-BR");

  const fmtDelta = v => {
    if (v==null || isNaN(v)) return "—";
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(1).replace(".", ",")}%`;
  };

  // -------------------- badge --------------------
  function ensureBadge() {
    let el = document.getElementById("modBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "modBadge";
      el.style.position = "fixed";
      el.style.right = "16px";
      el.style.zIndex = "99999";
      el.style.fontFamily = "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      el.style.fontSize = "12px";
      el.style.padding = "6px 10px";
      el.style.borderRadius = "999px";
      el.style.background = "rgba(37, 99, 235, 0.08)";
      el.style.border = "1px solid #cbd5e1";
      el.style.color = "#0f172a";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,.08)";
      el.style.userSelect = "none";
      el.style.pointerEvents = "none";
      el.title = "Status dos módulos (pode remover quando quiser)";
      document.body.appendChild(el);
    }
    return el;
  }

  function repositionBadge() {
    const el = document.getElementById("modBadge");
    if (!el) return;
    let bottom = 16;
    const anchors = [
      document.getElementById("btnFarol"),
      document.getElementById("btnInsights"),
    ].filter(Boolean);
    for (const a of anchors) {
      const r = a.getBoundingClientRect();
      const distFromBottom = Math.max(0, window.innerHeight - r.top);
      bottom = Math.max(bottom, distFromBottom + 24);
    }
    if (window.innerWidth <= 640) bottom = Math.max(bottom, 72);
    el.style.bottom = `${Math.round(bottom)}px`;
  }

  // -------------------- RH (módulos) --------------------
  const RH_FIELDS = [
    "HE armazém e transporte",
    "Turnover",
    "Absenteísmo",
    "Custo MOT (armazém e transporte)"
  ];

  function countRHRows(data) {
    return (data || []).filter(r => {
      if (!r?.Unidade || !r?.Data) return false;
      return RH_FIELDS.some(k => r[k] !== "" && r[k] !== null && r[k] !== undefined);
    }).length;
  }

  function ensureRHModCounter() {
    let el = document.getElementById("rowsRH_mod");
    if (!el) {
      el = document.createElement("span");
      el.id = "rowsRH_mod";
      el.style.marginLeft = "8px";
      el.style.fontSize = "11px";
      el.style.color = "#64748b";
      el.style.whiteSpace = "nowrap";
      el.setAttribute("aria-live", "polite");

      const rowsRH = document.getElementById("rowsRH");
      const header = document.querySelector("#secRH .data-section-header");
      if (rowsRH) rowsRH.insertAdjacentElement("afterend", el);
      else if (header) header.appendChild(el);
      else document.body.appendChild(el);
    }
    return el;
  }

  // -------------------- séries & sparklines --------------------
  function yyyymmdd(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function groupByDate(rows) {
    const map = new Map();
    for (const r of rows || []) {
      const d = parseDateAny(r?.Data);
      if (!d) continue;
      const k = yyyymmdd(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    return map;
  }

  // mode: "sum" | "avg"
  function dailyAgg(rows, key, mode = "sum") {
    const map = groupByDate(rows);
    const out = [];
    for (const [k, arr] of map.entries()) {
      let s = 0, c = 0;
      for (const r of arr) {
        const v = r[key];
        const n = (v==='' || v==null) ? NaN : Number(v);
        if (!isNaN(n)) { s += n; c++; }
      }
      const val = c ? (mode === "avg" ? s / c : s) : NaN;
      out.push({ date: k, value: val });
    }
    out.sort((a,b) => a.date.localeCompare(b.date));
    return out;
  }

  function dayOverDay(series) {
    // série ordenada asc por data: [{date, value}]
    if (!series || !series.length) return null;
    // último válido
    let j = series.length - 1;
    while (j >= 0 && (series[j].value==null || isNaN(series[j].value))) j--;
    if (j < 0) return null;
    const last = series[j];

    // anterior válido
    let i = j - 1;
    while (i >= 0 && (series[i].value==null || isNaN(series[i].value))) i--;
    if (i < 0) return null;

    const prev = series[i];
    if (!isFinite(prev.value) || prev.value === 0) return null;

    const deltaPct = ((last.value - prev.value) / Math.abs(prev.value)) * 100;
    return { deltaPct, lastDate: last.date, prevDate: prev.date };
  }

  function sparklineSVG(values, opts = {}) {
    const w = opts.width || 120;
    const h = opts.height || 28;
    const strokeW = opts.strokeWidth || 1.5;
    const padX = 2, padY = 2;

    const nums = values.map(v => v.value).filter(v => !isNaN(v));
    if (nums.length < 2) {
      return `<svg width="${w}" height="${h}" role="img" aria-label="sem dados"></svg>`;
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const dx = (w - padX * 2) / (nums.length - 1);
    const scaleY = (val) => {
      if (max === min) return (h - padY * 2) / 2 + padY;
      return padY + (h - padY * 2) * (1 - (val - min) / (max - min));
    };

    const pts = nums.map((v, i) => `${padX + i*dx},${scaleY(v)}`).join(" ");
    const title = opts.title || "";

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}">
        <polyline fill="none" stroke="currentColor" stroke-width="${strokeW}" points="${pts}" />
        <title>${title}</title>
      </svg>
    `;
  }

  // -------------------- mini-cards --------------------
  function ensureDiagPanel() {
    let el = document.getElementById("diagKPIs");
    if (!el) {
      el = document.createElement("section");
      el.id = "diagKPIs";
      el.className = "max-w-[1500px] mx-auto px-4 mt-3";
      const cards = document.getElementById("cards");
      if (cards && cards.parentElement) {
        cards.parentElement.insertAdjacentElement("afterend", el);
      } else {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  // regra de avaliação (queda = bom) para estes 4 indicadores
  function deltaColorAndIcon(deltaPct, betterWhenLower = true) {
    if (deltaPct == null || isNaN(deltaPct)) {
      return { cls: "text-slate-500", icon: "•", title: "" };
    }
    const up = deltaPct > 0;
    const good = betterWhenLower ? !up : up;
    return {
      cls: good ? "text-emerald-600" : "text-rose-600",
      icon: up ? "↗" : "↘",
      title: good ? "Melhor que ontem" : "Pior que ontem"
    };
  }

  function renderDiagnostics(kpi, rowsFiltered) {
    // séries por dia (filtradas pelo intervalo atual)
    const seriesHE   = dailyAgg(rowsFiltered, "HE armazém e transporte", "sum");
    const seriesMOT  = dailyAgg(rowsFiltered, "Custo MOT (armazém e transporte)", "sum");
    const seriesTurn = dailyAgg(rowsFiltered, "Turnover", "avg");
    const seriesAbs  = dailyAgg(rowsFiltered, "Absenteísmo", "avg");

    // deltas D-1
    const dHE   = dayOverDay(seriesHE);
    const dMOT  = dayOverDay(seriesMOT);
    const dTurn = dayOverDay(seriesTurn);
    const dAbs  = dayOverDay(seriesAbs);

    const heSpark   = sparklineSVG(seriesHE,  { title: "HE por dia" });
    const motSpark  = sparklineSVG(seriesMOT, { title: "Custo MOT por dia" });
    const turnSpark = sparklineSVG(seriesTurn,{ title: "Turnover por dia" });
    const absSpark  = sparklineSVG(seriesAbs, { title: "Absenteísmo por dia" });

    // queda é bom para todos estes
    const heBadge   = dHE  ? deltaColorAndIcon(dHE.deltaPct,  true) : null;
    const motBadge  = dMOT ? deltaColorAndIcon(dMOT.deltaPct, true) : null;
    const turBadge  = dTurn? deltaColorAndIcon(dTurn.deltaPct,true) : null;
    const absBadge  = dAbs ? deltaColorAndIcon(dAbs.deltaPct, true) : null;

    const host = ensureDiagPanel();
    const items = [
      {
        label: "HE total",
        value: fmtNum(kpi.he_total),
        spark: heSpark,
        delta: dHE ? fmtDelta(dHE.deltaPct) : "—",
        badge: heBadge
      },
      {
        label: "Custo MOT total",
        value: fmtMoneyBR(kpi.custo_mot_total),
        spark: motSpark,
        delta: dMOT ? fmtDelta(dMOT.deltaPct) : "—",
        badge: motBadge
      },
      {
        label: "Turnover médio",
        value: fmtPct(kpi.turnover_avg_pct),
        spark: turnSpark,
        delta: dTurn ? fmtDelta(dTurn.deltaPct) : "—",
        badge: turBadge
      },
      {
        label: "Absenteísmo médio",
        value: fmtPct(kpi.abs_avg_pct),
        spark: absSpark,
        delta: dAbs ? fmtDelta(dAbs.deltaPct) : "—",
        badge: absBadge
      },
    ];

    host.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${items.map(it => `
          <div class="relative bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <!-- delta no topo-direito -->
            <div class="absolute top-2 right-2 text-[12px] font-medium ${it.badge ? it.badge.cls : "text-slate-500"}"
                 title="${it.badge ? it.badge.title : ""}">
              ${it.badge ? it.badge.icon : ""} ${it.delta}
            </div>

            <div class="text-[12px] font-semibold text-slate-500">${it.label}</div>
            <div class="mt-1 text-[20px] font-bold text-slate-900 flex items-end justify-between gap-2">
              <span>${it.value}</span>
              <span class="text-slate-600" style="width:120px;height:28px;display:inline-flex;align-items:center">
                ${it.spark}
              </span>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="mt-1 text-[11px] text-slate-500">
        Base filtrada: ${kpi.rowsCount} linha(s) · ${kpi.unitsCount} unidade(s)
      </div>
    `;
  }

  // -------------------- ciclo de vida --------------------
  function init() {
    console.info("[UI.init] ok");
    ensureBadge();
    repositionBadge();
    window.addEventListener("resize", debounce(repositionBadge, 120));

    const startEl = document.getElementById("dateStart");
    const endEl   = document.getElementById("dateEnd");
    const onDateChange = debounce(() => refresh(), 120);
    if (startEl) startEl.addEventListener("change", onDateChange);
    if (endEl)   endEl.addEventListener("change", onDateChange);
  }

  function refresh() {
    const all = State.getData() || [];
    const { ds, de } = getDateRangeFromDOM();
    const filtered = filterByDate(all, ds, de);

    const total = filtered.length;
    const units = [...new Set(filtered.map(r => r.Unidade).filter(Boolean))];
    const unitCount = units.length;

    console.info("[UI.refresh] dados (filtrados por data):", { total, ds, de, sample: filtered.slice(0,2) });

    const badge = ensureBadge();
    badge.textContent = `Módulos OK · ${total} linha(s) · ${unitCount} unidade(s)`;
    repositionBadge();

    const rhCount = countRHRows(filtered);
    const rhSpan = ensureRHModCounter();
    rhSpan.textContent = `· módulos: ${rhCount} linha(s) RH`;

    // KPIs resumidos (mesma base do filtro)
    const kpi = KPIs.compute({ ds, de });
    console.info("[kpi.debug] resumo:", {
      linhas: kpi.rowsCount, unidades: kpi.unitsCount, amostra: kpi.sample
    });

    renderDiagnostics(kpi, filtered);
  }

  return { init, refresh };
})();
