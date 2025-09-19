// ui.js — ponte com o State + contador RH (módulos)
import { State } from "./state.js";

export const UI = (() => {

  // ---- helpers visuais (não interferem no seu layout) ----
  function ensureBadge() {
    let el = document.getElementById("modBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "modBadge";
      el.style.position = "fixed";
      el.style.right = "10px";
      el.style.bottom = "10px";
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
      el.title = "Status dos módulos (pode remover quando quiser)";
      document.body.appendChild(el);
    }
    return el;
  }

  // ---- contador RH (módulos) ----
  const RH_FIELDS = [
    "HE armazém e transporte",
    "Turnover",
    "Absenteísmo",
    "Custo MOT (armazém e transporte)"
  ];

  // conta linhas que têm ALGUM dado de RH (não mexe nos seus filtros atuais)
  function countRHRows(data) {
    return (data || []).filter(r => {
      if (!r?.Unidade || !r?.Data) return false;
      return RH_FIELDS.some(k => r[k] !== "" && r[k] !== null && r[k] !== undefined);
    }).length;
  }

  // cria/atualiza um pequeno span ao lado do header de RH (sem substituir o seu rowsRH)
  function ensureRHModCounter() {
    let el = document.getElementById("rowsRH_mod");
    if (!el) {
      el = document.createElement("span");
      el.id = "rowsRH_mod";
      el.style.marginLeft = "8px";
      el.style.fontSize = "11px";
      el.style.color = "#64748b"; // slate-500
      el.style.whiteSpace = "nowrap";
      el.setAttribute("aria-live", "polite");

      // tenta colocar ao lado do seu contador existente; se não achar, usa o header da seção RH
      const rowsRH = document.getElementById("rowsRH");
      const header = document.querySelector("#secRH .data-section-header");
      (rowsRH?.parentElement || header || document.body).appendChild(el);
    }
    return el;
  }

  // ---- ciclo de vida ----
  function init() {
    console.info("[UI.init] ok");
  }

  function refresh() {
    const data = State.getData() || [];
    const total = data.length;
    const units = [...new Set(data.map(r => r.Unidade).filter(Boolean))];
    const unitCount = units.length;

    // logs de conferência
    console.info("[UI.refresh] dados disponíveis:", { total, sample: data.slice(0, 2) });

    // badge de módulos (canto inferior)
    const badge = ensureBadge();
    badge.textContent = `Módulos OK · ${total} linhas · ${unitCount} unidade(s)`;

    // contador RH (módulos) — add-on discreto
    const rhCount = countRHRows(data);
    const rhSpan = ensureRHModCounter();
    rhSpan.textContent = `· módulos: ${rhCount} linha(s) RH`;
  }

  return { init, refresh };
})();
