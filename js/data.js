// data.js — leitura e normalização (somente funções, sem efeitos colaterais)
export const Data = (() => {
  // Caminho do seu Excel (mesmo do HTML atual)
  const XLSX_URL   = "data/BI Operacional_Catering.xlsx";
  const XLSX_SHEET = null;

  // ==== Conjuntos de colunas (iguais ao seu código) ====
  const PCT = new Set([
    "ILA %","IRA %","Perdas (avarias e diferença de estoque)","Turnover",
    "Absenteísmo","Ocupação","ON TIME D-1","IN FULL D-1","FILL RATE D-1",
    "% On-time (calc)","Indisponibilidade de Frota (%)"
  ]);
  const MONEY   = new Set(["Ocorrências em R$ D-1","Custo MOT (armazém e transporte)"]);
  const INTLIKE = new Set([
    "Paletes Pendentes","Largada (Total de veículos)","Largada (Veículos que saíram no horario)",
    "Reentrega","Ocorrências quantidade D-1","Horas Extras Armazém","Horas Extras Transporte"
  ]);
  const TONS = new Set(["Volume In (tons)","Volume Out (tons)","Volume (tons)"]);
  const KEY_NUMERIC = new Set([
    "Volume In (tons)","Volume Out (tons)","Corte (KG)","Paletes Pendentes",
    "Largada (Total de veículos)","Largada (Veículos que saíram no horario)",
    "Reentrega","Ocorrências quantidade D-1","Ocorrências em R$ D-1",
    "Contagem cíclica","ILA %","IRA %","Perdas (avarias e diferença de estoque)",
    "Turnover","Absenteísmo","Ocupação","ON TIME D-1","IN FULL D-1",
    "FILL RATE D-1","Indisponibilidade de Frota (%)","Volume (tons)"
  ]);

  // ==== Utils (iguais aos seus) ====
  const isDash = v => typeof v === 'string' && v.trim().match(/^[-–—]+$/);
  const toISODateLocal = (y,m,d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  function asNumber(v){
    if(v===null||v===undefined) return '';
    const s=String(v).trim();
    if(s===''||isDash(s)) return '';
    const n=Number(
      s.replace(/R\$\s?/i,'').replace(/\./g,'').replace(',','.').replace(/%/g,'')
    );
    return Number.isFinite(n)?n:'';
  }

  function normPct(v){
    if(v===''||v==null) return '';
    let n=Number(String(v).replace('%','').replace(/\s/g,'').replace(',','.'));
    if(!Number.isFinite(n)) return '';
    if(n>0 && n<=1) return n*100;
    if(n<=100) return n;
    while(n>100) n/=10;
    return n;
  }

  function asDateISO(v){
    if(v==null||v===''||isDash(v)) return '';
    if(typeof v==='number'){
      // usa XLSX.SSF só quando a função for chamada (não na importação)
      const d = (typeof XLSX!=='undefined' && XLSX.SSF && XLSX.SSF.parse_date_code)
        ? XLSX.SSF.parse_date_code(v) : null;
      if(!d) return '';
      return toISODateLocal(d.y,d.m,d.d);
    }
    const s=String(v).trim();
    const m=s.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    if(m) return toISODateLocal(+m[3],+m[2],+m[1]);
    const dt=new Date(s);
    return isNaN(dt)?'':toISODateLocal(dt.getFullYear(),dt.getMonth()+1,dt.getDate());
  }

  function normalizeRow(row){
    const o={};
    for(const k in row){
      const key=String(k).trim();
      const val=isDash(row[k])?'':row[k];
      o[key]=val;
    }
    if(o["Indisponibilidade de Frota"]!==undefined && o["Indisponibilidade de Frota (%)"]===undefined){
      o["Indisponibilidade de Frota (%)"]=o["Indisponibilidade de Frota"];
    }
    o["Data"]=asDateISO(o["Data"]);

    Object.keys(o).forEach(k=>{
      if(PCT.has(k)) { o[k]=normPct(o[k]); return; }
      if(MONEY.has(k) || INTLIKE.has(k) || TONS.has(k)){
        const n=asNumber(o[k]); o[k]=(n===''||!Number.isFinite(n))?'':n;
      }
      if(k==="Contagem cíclica"){
        const n=asNumber(o[k]); o[k]=(n===''||!Number.isFinite(n))?'':n;
      }
    });

    if(o["Volume (tons)"]===''||o["Volume (tons)"]==null){
      const vin=asNumber(o["Volume In (tons)"])||0, vout=asNumber(o["Volume Out (tons)"])||0;
      o["Volume (tons)"]=(vin>0||vout>0)?(vin+vout):'';
    }
    return o;
  }

  function isRowAllBlank(o){
    if(!o["Unidade"]||!o["Data"]) return true;
    for(const k of KEY_NUMERIC){
      const v=o[k]; if(v!=='' && Number(v)!==0) return false;
    }
    return true;
  }

  function parseCSV(text){
    const delimiter=text.indexOf(';')>-1?';':',';
    const lines=text.trim().split(/\r?\n/);
    const headers=lines[0].split(delimiter).map(h=>h.trim());
    return lines.slice(1).map(line=>{
      const cols=[]; let cur='',inQ=false;
      for(let i=0;i<line.length;i++){
        const ch=line[i];
        if(ch==='"'){inQ=!inQ;continue;}
        if(!inQ&&ch===delimiter){cols.push(cur);cur='';continue;}
        cur+=ch;
      }
      cols.push(cur);
      const obj={}; headers.forEach((h,i)=>obj[h]=cols[i]!==undefined?cols[i].trim():'');
      Object.keys(obj).forEach(k=>{ if(isDash(obj[k])) obj[k]=''; });

      if(obj["Data"] && /^\d{2}[./]\d{2}[./]\d{4}$/.test(obj["Data"])){
        const [d,m,y]=obj["Data"].replace(/\./g,'/').split('/').map(Number);
        obj["Data"]=toISODateLocal(y,m,d);
      }

      Object.keys(obj).forEach(k=>{
        if(PCT.has(k)) { obj[k]=normPct(obj[k]); return; }
        if(MONEY.has(k) || INTLIKE.has(k) || TONS.has(k)){
          const n=asNumber(obj[k]); obj[k]=(n===''||!Number.isFinite(n))?'':n;
        }
        if(k==="Contagem cíclica"){
          const n=asNumber(obj[k]); obj[k]=(n===''||!Number.isFinite(n))?'':n;
        }
      });

      if(obj["Volume (tons)"]===undefined||obj["Volume (tons)"]===''){
        const vin=asNumber(obj["Volume In (tons)"])||0, vout=asNumber(obj["Volume Out (tons)"])||0;
        obj["Volume (tons)"]=(vin+vout)||'';
      }
      return obj;
    });
  }

  function getSeedData(){
    const el=document.getElementById('seed-data');
    if(!el) return [];
    let raw=[]; try{ raw = JSON.parse(el.textContent||'[]'); }catch(e){ return []; }
    if(!Array.isArray(raw) || !raw.length) return [];
    return raw.map(normalizeRow).filter(o=>!isRowAllBlank(o));
  }

  async function loadExcelFromRepo(){
    try{
      const res = await fetch(XLSX_URL, {cache:"no-store"});
      if(!res.ok) throw new Error(`Não encontrei ${XLSX_URL} (HTTP ${res.status})`);
      const ab = await res.arrayBuffer();
      const wb = XLSX.read(ab,{type:'array'});
      const ws = wb.Sheets[XLSX_SHEET] || wb.Sheets[wb.SheetNames[0]];
      if(!ws) throw new Error(`Aba não encontrada: ${XLSX_SHEET||'(primeira aba)'}`);
      const ref = XLSX.utils.decode_range(ws['!ref']);
      ref.s.r = Math.max(ref.s.r, 2);
      ref.s.c = Math.max(ref.s.c, 1);
      const newRef = XLSX.utils.encode_range(ref);
      let rows = XLSX.utils.sheet_to_json(ws,{defval:"",range:newRef});
      rows = rows.map(normalizeRow).filter(o=>!isRowAllBlank(o));
      return { rows, meta: { sheet: (XLSX_SHEET||wb.SheetNames[0]) } };
    }catch(err){
      console.warn("[Data.loadExcelFromRepo] Falha:", err);
      return { rows: [], meta: { error: String(err) } };
    }
  }

  // expõe a API
  return {
    XLSX_URL, XLSX_SHEET,
    PCT, MONEY, INTLIKE, TONS, KEY_NUMERIC,
    isDash, toISODateLocal, asNumber, normPct, asDateISO,
    normalizeRow, isRowAllBlank, parseCSV, getSeedData, loadExcelFromRepo,
  };
})();
