"use strict";
function error(mensaje,status=400) {return Object.assign(new Error(mensaje),{status});}
function validarPuntos(datos,ruta=false) {
  if(!datos || datos.perfil!=="driving") throw error("El único perfil habilitado es automóvil (driving).");
  const p=datos.puntos;
  if(!Array.isArray(p) || p.length<(ruta?10:9) || p.length>(ruta?32:31)) throw error("Se requieren 8–30 destinos y un almacén (31 ubicaciones como máximo).");
  if(p.some(c=>!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng) || Math.abs(c.lat)>85 || Math.abs(c.lng)>180 || typeof c.id!=="string" || !/^(A|D[1-9]\d*)$/.test(c.id))) throw error("Ubicación inválida.");
  const unicos=ruta?p.slice(0,-1):p;
  if(p[0].id!=="A" || new Set(unicos.map(c=>c.id)).size!==unicos.length) throw error("Identificadores repetidos o almacén ausente.");
  if(ruta && (p.at(-1).id!=="A" || p.at(-1).lat!==p[0].lat || p.at(-1).lng!==p[0].lng)) throw error("El recorrido debe volver al mismo almacén.");
  return p;
}
function crearProveedor(config,transporte=fetch) {
  const cache=new Map(), pendientes=new Map();
  let cola=Promise.resolve(), ultima=0, espera=0;
  async function consultar(url) {
    const llave=url.toString(), previa=cache.get(llave);
    if(previa && Date.now()-previa.fecha<3600000) return previa.valor;
    if(pendientes.has(llave)) return pendientes.get(llave);
    if(espera>=4) throw error("Hay varias consultas en espera. Intenta de nuevo más tarde.",429);
    espera++;
    const trabajo=cola.catch(()=>{}).then(async()=>{
      const restante=Math.max(1100,Number(config.intervaloMs)||1100)-(Date.now()-ultima);
      if(restante>0) await new Promise(r=>setTimeout(r,restante));
      ultima=Date.now();
      let respuesta;
      try {respuesta=await transporte(url,{headers:{"User-Agent":config.userAgent,"Accept":"application/json"},signal:AbortSignal.timeout(25000)});}
      catch {throw error("No se pudo contactar al proveedor o agotó el tiempo. Revisa internet e inténtalo de nuevo.",502);}
      if(!respuesta.ok) throw error("El proveedor respondió HTTP "+respuesta.status+(respuesta.status===429?". Límite de consultas alcanzado; espera antes de reintentar.":". No se calcularon distancias alternativas."),502);
      let valor; try {valor=await respuesta.json();} catch {throw error("El proveedor devolvió una respuesta no válida.",502);}
      if(valor.code && valor.code!=="Ok") throw error("OSRM: "+valor.code+". Ajusta los puntos o revisa la configuración del servicio.",502);
      if(cache.size>=100) cache.delete(cache.keys().next().value);
      cache.set(llave,{fecha:Date.now(),valor}); return valor;
    });
    pendientes.set(llave,trabajo);
    cola=trabajo.catch(()=>{});
    try {return await trabajo;}
    finally {espera--; pendientes.delete(llave);}
  }
  function urlVial(servicio,puntos) {
    const url=new URL(config.osrm.replace(/\/$/,"")+"/"+servicio+"/v1/driving/"+puntos.map(p=>p.lng+","+p.lat).join(";"));
    url.searchParams.set("radiuses",puntos.map(()=>config.radioMetros).join(";"));
    // Sin fallback_speed: una celda desconectada debe seguir siendo un error.
    return url;
  }
  async function buscar({consulta}={}) {
    if(typeof consulta!=="string" || consulta.trim().length<3 || consulta.length>200) throw error("Escribe entre 3 y 200 caracteres.");
    const url=new URL(config.photon.replace(/\/$/,"")+"/api/");
    url.searchParams.set("q",consulta.trim()); url.searchParams.set("limit","6");
    url.searchParams.set("lat","18.462"); url.searchParams.set("lon","-97.392");
    const r=await consultar(url);
    if(!Array.isArray(r.features)) throw error("Respuesta de búsqueda inválida.",502);
    return r.features.filter(f=>f.geometry?.type==="Point" && f.geometry.coordinates?.length===2).map(f=>{
      const p=f.properties || {}, c=f.geometry.coordinates;
      return {lat:c[1],lng:c[0],nombre:[p.name,[p.street,p.housenumber].filter(Boolean).join(" "),p.city,p.state,p.country].filter(Boolean).join(", ")};
    }).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  }
  async function matriz(datos) {
    const p=validarPuntos(datos), url=urlVial("table",p);
    url.searchParams.set("annotations","distance");
    const r=await consultar(url), n=p.length;
    if(!Array.isArray(r.distances) || r.distances.length!==n || r.distances.some(f=>!Array.isArray(f) || f.length!==n || f.some(d=>!Number.isFinite(d)||d<0)) || r.fallback_speed_cells?.length) throw error("La matriz tiene tramos sin conexión vial o el servidor no ofrece distancias. No se sustituirán por líneas rectas.",502);
    if(!Array.isArray(r.sources) || r.sources.length!==n || r.sources.some(s=>!Number.isFinite(s.distance)||s.distance>config.radioMetros)) throw error("No se pudo ajustar cada ubicación a una calle dentro del radio permitido.",502);
    return {distancias:r.distances,ajusteMaximo:Math.max(...r.sources.map(s=>s.distance)),perfil:"driving"};
  }
  async function ruta(datos) {
    const p=validarPuntos(datos,true), url=urlVial("route",p);
    url.searchParams.set("overview","full"); url.searchParams.set("geometries","geojson");
    url.searchParams.set("alternatives","false"); url.searchParams.set("steps","false");
    url.searchParams.set("continue_straight","false"); // Paradas independientes, como las celdas de la matriz.
    const r=await consultar(url), recorrido=r.routes?.[0];
    if(!recorrido || recorrido.geometry?.type!=="LineString" || recorrido.geometry.coordinates.length<2 ||
      recorrido.geometry.coordinates.some(c=>!Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)) ||
      !Array.isArray(recorrido.legs) || recorrido.legs.length!==p.length-1 || recorrido.legs.some(l=>!Number.isFinite(l.distance)||l.distance<0)) throw error("El proveedor no devolvió un recorrido vial válido.",502);
    return {coordenadas:recorrido.geometry.coordinates,tramos:recorrido.legs.map(l=>l.distance),distancia:recorrido.distance};
  }
  return {buscar,matriz,ruta};
}
module.exports={crearProveedor,validarPuntos};
