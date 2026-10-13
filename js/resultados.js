"use strict";
EvoRuta.resultados = (function () {
  const datos=EvoRuta.datos, el=id=>document.getElementById(id);
  let firmaAnterior=datos.firma(), referencias=null, mejorGenetico=null, matrizVial=null, respuestaMatriz=null;
  let revision=0;
  const geometrias=new Map();
  function obtener() { return referencias ? JSON.parse(JSON.stringify(referencias)) : null; }
  function obtenerRuta(metodo) {
    const r=metodo==="genetico"?mejorGenetico:referencias && referencias[metodo];
    return r ? {ruta:r.ruta.slice(),distancia:r.distancia} : null;
  }
  function clave(metodo) { const r=obtenerRuta(metodo); return r ? JSON.stringify([metodo,datos.firma(),r.ruta]) : ""; }
  function geometria(metodo) { return geometrias.get(clave(metodo)) || null; }
  function mostrarGeometrias() {
    const seleccion=el("vista-ruta").value;
    const metodos=seleccion==="todas"?["aleatoria","vecino","genetico"]:seleccion==="ambas"?["aleatoria","vecino"]:[seleccion];
    EvoRuta.dibujo.establecerRutas(metodos.flatMap(m=>geometria(m)?[{metodo:m,coordenadas:geometria(m).coordenadas}]:[]));
    if(EvoRuta.animacion) EvoRuta.animacion.actualizar();
  }
  function controles() {
    el("ejecutar").disabled=!datos.validar().valido || EvoRuta.servicios.ocupado() || Boolean(EvoRuta.simulacion && EvoRuta.simulacion.bloqueada());
    el("ejecutar").textContent=referencias?"Referencias listas · conservar":"Obtener matriz y referencias";
    el("vista-ruta").disabled=!referencias;
    const seleccionado=el("ruta-animacion").value;
    el("trazar-ruta").disabled=!obtenerRuta(seleccionado) || EvoRuta.servicios.ocupado() || (seleccionado==="genetico" && !el("pausar").disabled);
  }
  function mostrar() {
    ["aleatoria","vecino"].forEach(m=>{
      el("distancia-"+m).textContent=referencias?(referencias[m].distancia/1000).toFixed(3):"—";
      el("orden-"+m).textContent=referencias?["A"].concat(referencias[m].ruta,"A").join(" → "):"Recorrido pendiente de calcular.";
    });
    el("etiqueta-resultados").textContent=referencias?"Misma matriz vial · automóvil":"Sin matriz vigente";
    controles(); mostrarGeometrias();
  }
  function actualizar() {
    const nueva=datos.firma();
    if(nueva!==firmaAnterior) {
      revision++; firmaAnterior=nueva; EvoRuta.servicios.cancelar();
      referencias=null; matrizVial=null; respuestaMatriz=null; mejorGenetico=null; geometrias.clear();
      if(EvoRuta.animacion) EvoRuta.animacion.detener(false);
      if(EvoRuta.experimentos) EvoRuta.experimentos.limpiarPorCambio();
      if(EvoRuta.simulacion) EvoRuta.simulacion.reiniciar();
      el("estado-resultados").textContent="Ubicaciones o perfil modificados: matriz, rutas e historial invalidados. Obtén una nueva matriz.";
      el("estado-geometria").textContent="No hay recorridos viales cargados.";
    }
    mostrar();
    if(EvoRuta.simulacion) EvoRuta.simulacion.actualizarControles();
  }
  async function calcular() {
    actualizar();
    if(referencias || !datos.validar().valido || EvoRuta.servicios.ocupado() || EvoRuta.simulacion.bloqueada()) return;
    const turno=revision, firma=datos.firma(), puntos=datos.puntos().map(p=>({...p}));
    el("estado-resultados").textContent="Consultando la matriz vial completa. El algoritmo todavía no está en ejecución…";
    try {
      const respuesta=await EvoRuta.servicios.consultar("matriz",{puntos,perfil:datos.escenario.perfil});
      if(turno!==revision || firma!==datos.firma()) return;
      const matriz=EvoRuta.matrices.crear(puntos,respuesta.distancias,datos.escenario.perfil);
      const aleatoria=EvoRuta.rutas.aleatoria(datos.escenario.destinos);
      const vecino=EvoRuta.rutas.vecinoMasCercano(datos.escenario.almacen,datos.escenario.destinos,matriz);
      const evaluar=ruta=>({ruta,distancia:EvoRuta.rutas.distanciaTotal(ruta,datos.escenario.almacen,datos.escenario.destinos,matriz)});
      referencias={aleatoria:evaluar(aleatoria),vecino:evaluar(vecino)};
      matrizVial=matriz; respuestaMatriz=respuesta;
      el("estado-resultados").textContent="Matriz "+puntos.length+" × "+puntos.length+" lista en metros, perfil automóvil. Ajuste máximo a la red: "+respuesta.ajusteMaximo.toFixed(1)+" m. Las distancias corresponden a los caminos preferidos por OSRM, sin tráfico en tiempo real.";
    } catch(error) {
      if(turno===revision) el("estado-resultados").textContent=error.name==="AbortError"?"Consulta cancelada o tiempo agotado. Puedes reintentar.":error.message;
    } finally { actualizar(); }
  }
  async function trazar() {
    const metodo=el("ruta-animacion").value, ruta=obtenerRuta(metodo);
    if(!ruta || !respuestaMatriz || EvoRuta.servicios.ocupado() || (metodo==="genetico" && !el("pausar").disabled)) return;
    const llave=clave(metodo), turno=revision;
    if(geometrias.has(llave)) {el("vista-ruta").value=metodo; mostrarGeometrias(); return;}
    const ids=["A"].concat(ruta.ruta,"A"), puntos=datos.puntos(), indices=ids.map(id=>puntos.findIndex(p=>p.id===id));
    el("estado-geometria").textContent="Consultando geometría por calles en el orden elegido…";
    try {
      const r=await EvoRuta.servicios.consultar("ruta",{puntos:indices.map(i=>puntos[i]),perfil:datos.escenario.perfil});
      if(turno!==revision || llave!==clave(metodo)) return;
      // Impedir que un cambio de red o restricciones de paso se presente como la misma ruta.
      const esperado=indices.slice(1).map((indice,i)=>matrizVial.distancias[indices[i]][indice]);
      if(r.tramos.length!==esperado.length || r.tramos.some((d,i)=>Math.abs(d-esperado[i])>Math.max(2,esperado[i]*.001))) throw new Error("El trazado del proveedor difiere de la matriz. No se mostrará como equivalente. Cambia un punto y recalcula la matriz para consultar la red actual.");
      geometrias.set(llave,r); el("vista-ruta").value=metodo;
      el("estado-geometria").textContent="Recorrido por calles cargado: "+metodo+". Respeta el orden calculado y regresa al almacén. La animación es ilustrativa.";
      mostrarGeometrias();
    } catch(error) {if(turno===revision) el("estado-geometria").textContent=error.name==="AbortError"?"Consulta cancelada o tiempo agotado.":error.message;}
    finally {controles();}
  }
  function establecerGenetico(valor) {
    const anterior=clave("genetico"); mejorGenetico=valor;
    if(anterior!==clave("genetico")) {
      if(geometrias.has(anterior)) el("estado-geometria").textContent="La mejor ruta genética cambió. Pulsa Mostrar por calles para cargar su nuevo trazado.";
      geometrias.delete(anterior);
      if(EvoRuta.animacion) EvoRuta.animacion.detener(false);
    }
    mostrar();
  }
  el("ejecutar").addEventListener("click",calcular);
  el("trazar-ruta").addEventListener("click",trazar);
  el("vista-ruta").addEventListener("change",mostrarGeometrias);
  el("ruta-animacion").addEventListener("change",()=>{EvoRuta.animacion.detener(false); controles();});
  return {actualizar,obtener,obtenerRuta,establecerGenetico,geometria,controles,matriz:()=>matrizVial};
})();
