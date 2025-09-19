// ui.js — versão sem badge (removido) e com init() corrigido
import { State } from "./state.js";
import { KPIs } from "./features.js";

/* -------------------- utils -------------------- */
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
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
  // dd/mm/yyyy
  m = str.match(/^(\d{2})[\/.](\d{2})[\/.](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], 0, 0, 0, 0);
  const d = new Date(str);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function getDateRangeFromDOM() {
  const startEl = document.getElementById("dateStart");
  const endEl   = document.getElementById("dateEnd");
  const ds = startEl ? parseDateAny(startEl.value) : null;
  const de = endEl   ? parseDateAny(endEl.value)   : null;
  // fim inclusivo (23:59:59.999)
  const deInc = de ? new Date(de.getFullYear(), de.getMonth(), de.getDate(), 23, 59, 59, 999) : null;
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

/* -------------------- RH: contador de linhas -------------------- */
const RH_FIELDS = [
  "HE armazém e transporte",
  "Turnover",
  "Absenteísmo",
  "Custo MOT (armazém e transporte)",
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

/* -------------------- ciclo de vida -------------------- */
function init() {
  console.info("[UI.init] ok (badge desativado)");
  // Se sobrou badge antigo no DOM (por cache), remove:
  const ghost = document.getElementById("modBadge");
  if (ghost) ghost.remove();

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

  // Garante que qualquer badge antigo não reapareça:
  const ghost = document.getElementById("modBadge");
  if (ghost) ghost.remove();

  // contador RH (módulos) — filtrado por data (apenas texto na barra do RH)
  const rhCount = countRHRows(filtered);
  const rhSpan = ensureRHModCounter();
  rhSpan.textContent = `· módulos: ${rhCount} linha(s) RH`;

  // KPIs apenas para LOG (não renderiza cards/painel)
  const kpi = KPIs.compute({ ds, de /*, units */ });
  console.info("[kpi.debug] resumo:", {
    linhas: kpi.rowsCount, unidades: kpi.unitsCount, amostra: kpi.sample
  });
  console.info("[kpi.debug] HE total (h):", kpi.he_total, "— linhas válidas:", kpi.he_count);
  console.info("[kpi.debug] Custo MOT total (R$):", kpi.custo_mot_total, "— linhas válidas:", kpi.custo_mot_count);
  console.info("[kpi.debug] Turnover médio (%):", isNaN(kpi.turnover_avg_pct) ? "—" : kpi.turnover_avg_pct.toFixed(2));
  console.info("[kpi.debug] Absenteísmo médio (%):", isNaN(kpi.abs_avg_pct) ? "—" : kpi.abs_avg_pct.toFixed(2));
}

export const UI = { init, refresh };
