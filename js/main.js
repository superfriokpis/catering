import { Data } from "./data.js";

console.info("[main] módulos carregados.");
console.info("[main] Data API:", Object.keys(Data));

try {
  const sample = 'Unidade,Data,"HE armazém e transporte"\nCWB3,01/01/2025,12';
  const rows = Data.parseCSV(sample);
  console.info("[main] parseCSV (smoke):", rows);
} catch (e) {
  console.warn("[main] teste parseCSV falhou (ok se bloqueado):", e);
}
