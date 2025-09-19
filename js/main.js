// main.js — orquestração mínima: Data -> State -> UI (apenas logs)
import { Data } from "./data.js";
import { State } from "./state.js";
import { UI } from "./ui.js";

async function bootstrap(){
  console.info("[main] start");

  UI.init(); // prepara UI (ainda sem tocar no DOM)

  // Carrega planilha via módulo Data
  const { rows, meta } = await Data.loadExcelFromRepo();
  State.setData(rows);

  // Expor para inspeção, útil no debug
  window.__state = State;
  window.__rows  = rows;
  window.__meta  = meta;

  console.info("[main] dados carregados:", { linhas: rows.length, meta });

  // Chama a UI para ‘reagir’ (por enquanto, só loga)
  UI.refresh();
}

bootstrap();
