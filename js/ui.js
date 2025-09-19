// ui.js — ponte mínima com o State (sem tocar no DOM por enquanto)
import { State } from "./state.js";

export const UI = (() => {
  function init() {
    // se futuramente precisarmos capturar elementos do DOM, faremos aqui
    console.info("[UI.init] ok");
  }

  function refresh() {
    const data = State.getData() || [];
    const total = data.length;

    // pequena amostra só pra confirmação visual no console
    const sample = data.slice(0, 2);

    console.info("[UI.refresh] dados disponíveis:", { total, sample });

    // ⚠️ importante: ainda NÃO mexemos em HTML/tabelas/cards
    // quando migrarmos renderizações, faremos aqui
  }

  return { init, refresh };
})();
