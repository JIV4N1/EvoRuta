"use strict";
EvoRuta.interaccion=(function () {
  const datos=EvoRuta.datos, el=id=>document.getElementById(id);
  let modo="mover", versionBusqueda=0;
  function bloqueado() {return EvoRuta.servicios.ocupado() || EvoRuta.simulacion.bloqueada();}
  function controles() {
    const bloqueada=bloqueado();
    document.querySelectorAll("[data-edicion], .herramientas button, .campos-editor input, .campos-editor select, .campos-editor button, #resultados-busqueda button, #lista-puntos button").forEach(c=>c.disabled=bloqueada);
    el("parametros-geneticos").disabled=bloqueada;
    el("eliminar-seleccion").disabled=bloqueada || el("punto").value==="A";
    el("agregar-centro").disabled=bloqueada || datos.escenario.destinos.length>=30;
    el("cancelar-consulta").disabled=!EvoRuta.servicios.ocupado();
    EvoRuta.resultados.controles();
    EvoRuta.animacion.actualizar();
    EvoRuta.dibujo.dibujar();
  }
  function coordenadas() {
    const p=datos.puntos().find(p=>p.id===el("punto").value);
    if(!p) return;
    el("coordenada-x").value=p.lat; el("coordenada-y").value=p.lng;
    controles();
  }
  function actualizar(id) {
    versionBusqueda++;
    el("resultados-busqueda").replaceChildren();
    el("estado-busqueda").textContent="Busca explícitamente un lugar o añade puntos en el mapa.";
    const seleccion=id || el("punto").value;
    el("punto").replaceChildren(); el("lista-puntos").replaceChildren();
    datos.puntos().forEach(p=>{
      const texto=p.id+(p.id==="A"?" · Almacén":" · Destino");
      const o=document.createElement("option"); o.value=p.id; o.textContent=texto; el("punto").appendChild(o);
      const li=document.createElement("li"), b=document.createElement("button");
      b.type="button"; b.textContent=texto+" · "+(p.nombre || "Sin dirección textual")+" · "+p.lat.toFixed(6)+", "+p.lng.toFixed(6);
      b.addEventListener("click",()=>{if(!bloqueado()){el("punto").value=p.id; coordenadas(); EvoRuta.dibujo.mapa.setView([p.lat,p.lng],16);}});
      li.appendChild(b); el("lista-puntos").appendChild(li);
    });
    if(datos.puntos().some(p=>p.id===seleccion)) el("punto").value=seleccion;
    const v=datos.validar();
    el("conteo").textContent=v.cantidad+" destinos";
    el("validacion-escenario").textContent=v.valido?"Escenario válido. Obtén la matriz antes de iniciar.":"Faltan "+v.faltantes+" destinos. Se requieren de 8 a 30.";
    EvoRuta.resultados.actualizar(); coordenadas(); controles();
  }
  function mover(id,lat,lng,nombre="") {
    if(bloqueado()) return;
    const cambio=datos.mover(id,lat,lng,nombre);
    el("estado").textContent=cambio?"Ubicación de "+id+" actualizada. La dirección anterior se descarta al mover el punto.":"Coordenadas inválidas o coincidentes.";
    actualizar(id);
  }
  function agregar(lat,lng,nombre="") {
    if(bloqueado()) return;
    const p=datos.agregar(lat,lng,nombre);
    el("estado").textContent=p?"Destino "+p.id+" agregado.":"No se agregó: máximo 30 destinos, coordenadas inválidas o punto coincidente.";
    actualizar(p && p.id);
  }
  function eliminar(id) {
    if(bloqueado()) return;
    el("estado").textContent=datos.eliminar(id)?"Destino eliminado.":"El almacén se conserva.";
    actualizar();
  }
  function seleccionar(id) {if(bloqueado()) return; if(modo==="eliminar") eliminar(id); else {el("punto").value=id; coordenadas();}}
  function clic(lat,lng) {if(bloqueado()) return; if(modo==="agregar") agregar(lat,lng); else if(modo==="almacen") mover("A",lat,lng);}
  document.querySelectorAll("[data-modo]").forEach(b=>b.addEventListener("click",()=>{
    if(bloqueado()) return; modo=b.dataset.modo;
    document.querySelectorAll("[data-modo]").forEach(c=>c.setAttribute("aria-pressed",String(c===b)));
    el("instruccion").textContent={mover:"Arrastra los puntos o selecciónalos para editar sus coordenadas.",agregar:"Pulsa el mapa para agregar un destino.",eliminar:"Pulsa un destino para eliminarlo.",almacen:"Pulsa el mapa para cambiar la ubicación del almacén."}[modo];
  }));
  el("punto").addEventListener("change",coordenadas);
  el("aplicar").addEventListener("click",()=>{
    if(el("coordenada-x").reportValidity() && el("coordenada-y").reportValidity()) mover(el("punto").value,Number(el("coordenada-x").value),Number(el("coordenada-y").value));
  });
  el("eliminar-seleccion").addEventListener("click",()=>eliminar(el("punto").value));
  el("agregar-centro").addEventListener("click",()=>{const c=EvoRuta.dibujo.mapa.getCenter(); agregar(c.lat,c.lng);});
  el("restablecer").addEventListener("click",()=>{if(bloqueado()) return; datos.restablecer(); actualizar("A"); EvoRuta.dibujo.mapa.setView([18.462,-97.392],15); el("estado").textContent="Ejemplo de coordenadas en Tehuacán restaurado; no representa entregas reales.";});
  el("cancelar-consulta").addEventListener("click",()=>{versionBusqueda++; EvoRuta.servicios.cancelar(); el("estado-busqueda").textContent="Consulta cancelada.";});
  el("busqueda").addEventListener("submit",async e=>{
    e.preventDefault(); if(bloqueado()) return;
    const consulta=el("consulta").value.trim(); if(consulta.length<3) return;
    const version=++versionBusqueda, firma=datos.firma(), objetivo=el("destino-busqueda").value;
    el("resultados-busqueda").replaceChildren(); el("estado-busqueda").textContent="Buscando lugares…";
    try {
      const r=await EvoRuta.servicios.consultar("buscar",{consulta});
      if(version!==versionBusqueda || firma!==datos.firma()) return;
      el("estado-busqueda").textContent=r.length?"Selecciona el lugar correcto. Revisa las coordenadas antes de calcular.":"No se encontraron lugares. Prueba incluyendo Tehuacán y Puebla o coloca el punto en el mapa.";
      r.forEach(p=>{
        const b=document.createElement("button"); b.type="button";
        b.textContent=(p.nombre || "Sin dirección textual")+" · "+p.lat.toFixed(6)+", "+p.lng.toFixed(6);
        b.addEventListener("click",()=>{if(bloqueado() || firma!==datos.firma()) return; if(objetivo==="almacen") mover("A",p.lat,p.lng,p.nombre); else agregar(p.lat,p.lng,p.nombre); EvoRuta.dibujo.mapa.setView([p.lat,p.lng],16);});
        const li=document.createElement("li"); li.appendChild(b); el("resultados-busqueda").appendChild(li);
      });
    } catch(error) {if(version===versionBusqueda) el("estado-busqueda").textContent=error.name==="AbortError"?"Búsqueda cancelada o tiempo agotado.":error.message;}
    finally {controles();}
  });
  return {actualizar,controles,clic,mover,seleccionar};
})();
EvoRuta.interaccion.actualizar();
