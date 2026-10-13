"use strict";
// Leaflet se limita a dibujar puntos y geometrías viales ya calculadas.
EvoRuta.dibujo = (function () {
  const mapa=L.map("mapa",{scrollWheelZoom:false}).setView([18.462,-97.392],15);
  const marcadores=L.layerGroup().addTo(mapa), recorridos=L.layerGroup().addTo(mapa);
  let firma="", vehiculo=null;
  const estilos={aleatoria:{color:"#8650a0",dashArray:"8 7"},vecino:{color:"#216ca0"},genetico:{color:"#c15b19",dashArray:"12 5 2 5"}};
  function bloqueado() { return EvoRuta.servicios.ocupado() || (EvoRuta.simulacion && EvoRuta.simulacion.bloqueada()); }
  function dibujar() {
    const nueva=JSON.stringify(EvoRuta.datos.puntos());
    if(nueva!==firma) {
      firma=nueva; marcadores.clearLayers();
      EvoRuta.datos.puntos().forEach(p=>{
        const icono=L.divIcon({className:"punto-mapa "+(p.id==="A"?"almacen-mapa":""),html:p.id,iconSize:[36,36],iconAnchor:[18,18]});
        const m=L.marker([p.lat,p.lng],{icon:icono,draggable:true,title:p.id==="A"?"A · Almacén":p.id});
        const etiqueta=document.createElement("span");
        etiqueta.textContent=p.id+" · "+(p.nombre || p.lat.toFixed(6)+", "+p.lng.toFixed(6));
        m.bindTooltip(etiqueta);
        m.on("click",()=>EvoRuta.interaccion && EvoRuta.interaccion.seleccionar(p.id));
        m.on("dragend",()=>{
          if(!bloqueado()) {
            const c=m.getLatLng();
            EvoRuta.interaccion.mover(p.id,c.lat,c.lng);
            m.setLatLng([p.lat,p.lng]);
          } else m.setLatLng([p.lat,p.lng]);
        });
        m.addTo(marcadores);
      });
    }
    marcadores.eachLayer(m=>bloqueado()?m.dragging.disable():m.dragging.enable());
  }
  function establecerRutas(lista) {
    recorridos.clearLayers();
    lista.forEach(d=>L.polyline(d.coordenadas.map(c=>[c[1],c[0]]),{...estilos[d.metodo],weight:5,opacity:.85}).addTo(recorridos));
  }
  function colocarVehiculo(c) {
    if(!c) { if(vehiculo) mapa.removeLayer(vehiculo); vehiculo=null; return; }
    if(!vehiculo) vehiculo=L.marker([c[1],c[0]],{interactive:false,zIndexOffset:1000,
      icon:L.divIcon({className:"vehiculo-mapa",html:"🚙",iconSize:[36,36],iconAnchor:[18,18]})}).addTo(mapa);
    vehiculo.setLatLng([c[1],c[0]]);
  }
  async function cargarMapa() {
    try {
      const r=await fetch("/api/config"); if(!r.ok) throw new Error("Configuración no disponible.");
      const c=await r.json();
      L.tileLayer(c.tiles,{maxZoom:19,attribution:c.atribucion}).on("tileerror",()=>{
        document.getElementById("estado-mapa").textContent="No se pudieron cargar algunas imágenes del mapa. Revisa internet; no se han sustituido por un plano ficticio.";
      }).addTo(mapa);
      document.getElementById("proveedores").textContent=c.descripcion;
    } catch(error) {
      document.getElementById("estado-mapa").textContent="Para cargar el mapa abre http://127.0.0.1:8080 después de ejecutar node servidor.cjs. "+error.message;
    }
  }
  mapa.on("click",e=>{if(EvoRuta.interaccion) EvoRuta.interaccion.clic(e.latlng.lat,e.latlng.lng);});
  if(location.protocol!=="file:") cargarMapa();
  else document.getElementById("estado-mapa").textContent="Esta versión se inicia con node servidor.cjs. Abre http://127.0.0.1:8080.";
  new ResizeObserver(()=>mapa.invalidateSize()).observe(document.getElementById("mapa"));
  return {mapa,dibujar,establecerRutas,colocarVehiculo};
})();
