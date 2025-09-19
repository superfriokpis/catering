// ui.js — ponte com o State (agora com um badge discreto no canto)
import { State } from "./state.js";

export const UI = (() => {
  function ensureBadge() {
    let el = document.getElementById("modBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "modBadge";
      // estilo discreto; não colide com seu layout
      el.style.position = "fixed";
      el.style.right = "10px";
      el.style.bottom = "10px";
      el.style.zIndex = "99999";
      el.style.fontFamily = "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      el.style.fontSize = "12px";
      el.style.padding = "6px 10px";
      el.style.borderRadius = "999px";
      el.style.background = "rgba(37, 99, 235, 0.08)"; // azul claro
      el.style.border = "1px solid #cbd5e1";          // slate-300
      el.style.color = "#0f172a";                      // slate-900
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,.08)";
      el.style.userSelect = "none";
      el.title = "Status dos módulos (pode remover quando quiser)";
      document.body.appendChild(el);
    }
    return el;
  }

  function init() {
    console.info("[UI.init] ok");
  }

  function refresh() {
    const data = State.getData() || [];
    const total = data.length;
    const units = [...new Set(data.map(r => r.Unidade).filter(Boolean))];
    const unitCount = units.length;

    // amostra só para conferência no console
    const sample = data.slice(0, 2);
    console.info("[UI.refresh] dados disponíveis:", { total, sample });

    // atualiza/mostra o badge
    const el = ensureBadge();
    el.textContent = `Módulos OK · ${total} linhas · ${unitCount} unidade(s)`;
  }

  return { init, refresh };
})();
