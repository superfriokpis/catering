// features.js — cálculo de KPIs (somente logs por enquanto)
import { State } from "./state.js";

// --- helpers locais (não dependem da UI) ---
function parseDateAny(s) {
  if (!s) return null;
  const str = String(s).trim();
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/); // yyyy-mm-dd
  if (m) return new Date(+m[1], +m[2]-1, +m[3], 0,0,0,0);
  m = str.match(/^(\d{2})[\/.](\d{2})[\/.](\d{4})$/); // dd/mm/yyyy
  if (m) return new Date(+m[3], +m[2]-1, +m[1], 0,0,0,0);
  const d = new Date(str);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
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

function toNum(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function sum(rows, key) {
  let s = 0; let c = 0;
  for (const r of rows || []) {
    const n = toNum(r[key]);
    if (!isNaN(n)) { s += n; c++; }
  }
  return { value: s, count: c };
}

function avg(rows, key) {
  let s = 0; let c = 0;
  for (const r of rows || []) {
    const n = toNum(r[key]);
    if (!isNaN(n)) { s += n; c++; }
  }
  return { value: c ? (s / c) : NaN, count: c };
}

// --- API pública ---
export const KPIs = {
  /**
   * Calcula KPIs sobre o State atual.
   * @param {{ds?: Date, de?: Date, units?: string[]}} opts
   *  - ds/de: limites de data (de inclusivo; "de" será convertido para 23:59:59.999)
   *  - units: se fornecido, filtra pelas unidades indicadas
   */
  compute(opts = {}) {
    const all = State.getData() || [];
    const ds = opts.ds || null;
    const deInc = opts.de
      ? new Date(opts.de.getFullYear(), opts.de.getMonth(), opts.de.getDate(), 23,59,59,999)
      : null;

    // filtro por data
    let rows = filterByDate(all, ds, deInc);

    // filtro por unidades (opcional)
    if (Array.isArray(opts.units) && opts.units.length) {
      rows = rows.filter(r => opts.units.includes(r.Unidade));
    }

    // ---- CÁLCULOS (versão simples e transparente) ----
    // HE total e Custo MOT: soma simples dos valores válidos
    const he = sum(rows, "HE armazém e transporte");                     // horas
    const mot = sum(rows, "Custo MOT (armazém e transporte)");           // R$

    // Turnover % e Absenteísmo %: média aritmética simples dos percentuais válidos
    // (Opcional: depois podemos trocar para média ponderada por headcount, se houver coluna)
    const turnover = avg(rows, "Turnover");                              // %
    const abs = avg(rows, "Absenteísmo");                                // %

    // Também retornamos amostra e totais para conferência
    const units = [...new Set(rows.map(r => r.Unidade).filter(Boolean))];

    return {
      rowsCount: rows.length,
      unitsCount: units.length,
      sample: rows.slice(0, 2),

      he_total: he.value,               he_count: he.count,
      custo_mot_total: mot.value,       custo_mot_count: mot.count,

      turnover_avg_pct: turnover.value, turnover_count: turnover.count,
      abs_avg_pct: abs.value,           abs_count: abs.count,
    };
  }
};
