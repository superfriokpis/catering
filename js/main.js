// main.js — smoke test do módulo Data, sem tocar na UI
import { Data } from "./data.js";

async function bootstrap(){
  console.info("[main] módulos carregados.");
  console.info("[main] Data API:", Object.keys(Data));

  // 1) Teste rápido do parser (fica só como sanity check)
  try {
    const sample = 'Unidade,Data,"HE armazém e transporte"\nCWB3,01/01/2025,12';
    const rowsSample = Data.parseCSV(sample);
    console.info("[main] parseCSV (smoke):", rowsSample);
  } catch (e) {
    console.warn("[main] teste parseCSV falhou (ok se bloqueado):", e);
  }

  // 2) Carrega a planilha real via módulo (apenas loga e expõe no window)
  try {
    const { rows, meta } = await Data.loadExcelFromRepo();
    window.__rows = rows;           // <-- só para você inspecionar no console
    window.__meta = meta;

    console.info("[main] loadExcelFromRepo OK:", { linhas: rows.length, meta });
    console.info("[main] Primeiras 2 linhas:", rows.slice(0, 2));
  } catch (e) {
    console.error("[main] loadExcelFromRepo ERRO:", e);
  }
}

bootstrap();
