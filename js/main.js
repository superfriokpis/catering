// main.js — smoke test Data + State (sem alterar a UI)
import { Data } from "./data.js";
import { State } from "./state.js";

async function bootstrap(){
  console.info("[main] módulos carregados.");
  console.info("[main] Data API:", Object.keys(Data));

  // Sanity: parser
  try {
    const sample = 'Unidade,Data,"HE armazém e transporte"\nCWB3,01/01/2025,12';
    const rowsSample = Data.parseCSV(sample);
    console.info("[main] parseCSV (smoke):", rowsSample);
  } catch (e) {
    console.warn("[main] teste parseCSV falhou:", e);
  }

  // Carregamento real da planilha via módulo
  try {
    const { rows, meta } = await Data.loadExcelFromRepo();
    // salva no State
    State.setData(rows);
    // expõe para inspeção no console (debug apenas)
    window.__rows  = rows;
    window.__state = State;
    window.__meta  = meta;

    console.info("[main] loadExcelFromRepo OK:", { linhas: rows.length, meta });
    console.info("[main] State.getData() ->", State.getData().slice(0,2));
  } catch (e) {
    console.error("[main] loadExcelFromRepo ERRO:", e);
  }
}

bootstrap();
