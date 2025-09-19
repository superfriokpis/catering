// ui.js — ponte com o State + contador RH + badge responsivo + filtros de data
import { State } from "./state.js";

export const UI = (() => {
  // ---- utils ----
  function debounce(fn, ms = 150) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // Parseia "YYYY-MM-DD" ou "DD/MM/YYYY" em Date (meia-noite local).
  function parseDateAny(s) {
    if (!s) return null;
    const str = String(s).trim();
    // yyyy-mm-dd
    let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3], 0,0,0,0);
    // dd/mm/yyyy
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
    // fim inclusivo (23:59:59.999)
    const deInc = de ? new Date(de.getFullYear(), de.getMonth(), de.getDate(), 23,59,59,999) : null;
    return { ds, de: deInc };
  }

  function filterByDate(rows, ds, deInc) {
    if (!ds && !deInc) return rows;
    return (rows || []).filter(r => {
      const d = parseDateAny(r?.Data);
      if (!d) return false;
      if (ds && d < ds) return false;
      if (deInc && d > deInc) return false;
      return true;
    });
  }

  // ---- badge ----
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
      el.style.pointerEvents = "none"; // não bloqueia cliques embaixo
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
      bottom = Math.max(bottom, distFromBottom + 24); // folga
    }
    if (window.innerWidth <= 640) bottom = Math.max(bottom, 72);
    el.style.bottom = `${Math.round(bottom)}px`;
  }

  // ---- RH (módulos) ----
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

  // ---- ciclo de vida ----
  function init() {
    console.info("[UI.init] ok");
    // badge responsivo
    ensureBadge();
    repositionBadge();
    window.addEventListener("resize", debounce(repositionBadge, 120));

    // reagir às mudanças de data
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

    // badge (agora mostrando totais filtrados)
    const badge = ensureBadge();
    badge.textContent = `Módulos OK · ${total} linha(s) · ${unitCount} unidade(s)`;
    repositionBadge();

    // contador RH (módulos) — também filtrado por data
    const rhCount = countRHRows(filtered);
    const rhSpan = ensureRHModCounter();
    rhSpan.textContent = `· módulos: ${rhCount} linha(s) RH`;
  }

  return { init, refresh };
})();
