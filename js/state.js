// state.js — estado global mínimo (sem efeitos colaterais)
export const State = (() => {
  let DATA = [];
  let activeBlock = 'arm'; // arm | rh | transp
  let UNIT_STATE = [];     // [{u:'CWB3', on:true}, ...]

  return {
    // dados
    setData(rows){ DATA = Array.isArray(rows) ? rows : []; },
    getData(){ return DATA; },

    // bloco ativo (futuro: usado pela UI)
    setActive(b){ activeBlock = b; },
    getActive(){ return activeBlock; },

    // unidades (vamos preencher depois quando migrarmos a UI)
    setUnitState(list){ UNIT_STATE = Array.isArray(list) ? list : []; },
    getUnitState(){ return UNIT_STATE; },
  };
})();
