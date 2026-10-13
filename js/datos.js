"use strict";
globalThis.EvoRuta = globalThis.EvoRuta || {};
EvoRuta.datos = (function () {
  const limites = Object.freeze({ minimo: 8, maximo: 30 });
  // Coordenadas públicas sobre calles de Tehuacán, contrastadas con OSRM.
  // Son puntos de ejemplo, no domicilios de personas ni entregas reales.
  const ejemplo = [[18.461999,-97.391448],[18.458866,-97.396003],
    [18.458777,-97.393207],[18.458650,-97.389016],[18.460417,-97.393462],
    [18.462130,-97.395976],[18.463030,-97.394607],[18.464888,-97.391794],[18.464839,-97.388989]];
  const escenario = { almacen: null, destinos: [], perfil: "driving" };
  let siguienteId;
  function restablecer() {
    escenario.almacen = { id: "A", lat: ejemplo[0][0], lng: ejemplo[0][1], nombre: "" };
    escenario.destinos = ejemplo.slice(1).map((c,i) => ({id: "D"+(i+1), lat:c[0], lng:c[1], nombre:""}));
    siguienteId = 9;
  }
  function puntos() { return [escenario.almacen].concat(escenario.destinos); }
  function coordenadaValida(lat,lng) { return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=85 && Math.abs(lng)<=180; }
  const redondear = valor => Number(valor.toFixed(6));
  function ocupado(lat,lng,id) { return puntos().some(p=>p.id!==id && p.lat===redondear(lat) && p.lng===redondear(lng)); }
  function mover(id,lat,lng,nombre="") {
    const p=puntos().find(p=>p.id===id);
    if (!p || !coordenadaValida(lat,lng) || ocupado(lat,lng,id)) return false;
    p.lat=redondear(lat); p.lng=redondear(lng); p.nombre=String(nombre).slice(0,500); return true;
  }
  function agregar(lat,lng,nombre="") {
    if (escenario.destinos.length>=30 || !coordenadaValida(lat,lng) || ocupado(lat,lng)) return null;
    const p={id:"D"+siguienteId++,lat:redondear(lat),lng:redondear(lng),nombre:String(nombre).slice(0,500)};
    escenario.destinos.push(p); return p;
  }
  function eliminar(id) {
    const i=escenario.destinos.findIndex(p=>p.id===id);
    if(i<0) return false; escenario.destinos.splice(i,1); return true;
  }
  function validar() {
    const cantidad=escenario.destinos.length, faltantes=Math.max(0,8-cantidad);
    return {cantidad,faltantes,valido:cantidad>=8 && cantidad<=30 && puntos().every(p=>coordenadaValida(p.lat,p.lng))};
  }
  function firma() { return JSON.stringify([escenario.perfil,puntos().map(p=>[p.id,p.lat,p.lng])]); }
  restablecer();
  return {limites,escenario,puntos,restablecer,mover,agregar,eliminar,validar,firma};
})();
