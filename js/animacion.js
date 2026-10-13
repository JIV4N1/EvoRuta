"use strict";
EvoRuta.animacion = (function () {
  const el=id=>document.getElementById(id);
  let frame=null, inicio=null, geometriaActual=null;
  function actualizar() {
    el("reproducir-ruta").disabled=!EvoRuta.resultados.geometria(el("ruta-animacion").value) || EvoRuta.servicios.ocupado() || frame!==null;
    el("detener-ruta").disabled=frame===null;
  }
  function detener(mensaje=true) {
    if(frame!==null) cancelAnimationFrame(frame);
    frame=null; inicio=null; geometriaActual=null; EvoRuta.dibujo.colocarVehiculo(null);
    if(mensaje) el("estado-animacion").textContent="Animación detenida. Los resultados se conservan.";
    actualizar();
  }
  function reproducir() {
    const g=EvoRuta.resultados.geometria(el("ruta-animacion").value);
    if(!g || EvoRuta.servicios.ocupado()) return;
    detener(false); geometriaActual=g;
    const coordenadas=g.coordenadas, acumulada=[0];
    for(let i=1;i<coordenadas.length;i++) {
      // Distancia geodésica solo para velocidad visual; la evaluación usa la matriz.
      const a=coordenadas[i-1], b=coordenadas[i];
      acumulada.push(acumulada[i-1]+EvoRuta.dibujo.mapa.distance([a[1],a[0]],[b[1],b[0]]));
    }
    const total=acumulada.at(-1), duracion=16000; // No representa tiempo de entrega.
    let segmento=1;
    function avanzar(t) {
      if(geometriaActual!==g) return;
      if(inicio===null) inicio=t;
      const fraccion=Math.min(1,(t-inicio)/duracion), distancia=fraccion*total;
      while(segmento<coordenadas.length-1 && acumulada[segmento]<distancia) segmento++;
      const a=coordenadas[segmento-1],b=coordenadas[segmento];
      const largo=acumulada[segmento]-acumulada[segmento-1];
      const proporcion=largo?(distancia-acumulada[segmento-1])/largo:1;
      EvoRuta.dibujo.colocarVehiculo([a[0]+(b[0]-a[0])*proporcion,a[1]+(b[1]-a[1])*proporcion]);
      if(fraccion===1) {detener(false); el("estado-animacion").textContent="Recorrido terminado: regreso al almacén. Animación ilustrativa, sin tiempos reales."; return;}
      frame=requestAnimationFrame(avanzar);
    }
    frame=requestAnimationFrame(avanzar); actualizar();
    el("estado-animacion").textContent="El vehículo sigue la geometría vial. Reproducción ilustrativa de 16 segundos.";
  }
  el("reproducir-ruta").addEventListener("click",reproducir);
  el("detener-ruta").addEventListener("click",()=>detener());
  return {actualizar,detener};
})();
