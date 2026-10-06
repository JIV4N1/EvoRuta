"use strict";

EvoRuta.animacion = (function () {
  const selector = document.getElementById("ruta-animacion");
  const reproducir = document.getElementById("reproducir-ruta");
  const parar = document.getElementById("detener-ruta");
  const mensaje = document.getElementById("estado-animacion");
  let frame = null, inicio = null, puntos = null;
  const duracionTramo = 650;
  function actualizar() {
    reproducir.disabled = puntos !== null || !EvoRuta.resultados.obtenerRuta(selector.value);
    parar.disabled = puntos === null;
  }
  function detener(redibujar = true) {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null; inicio = null; puntos = null;
    EvoRuta.dibujo.establecerRecorrido(null);
    mensaje.textContent = "Recorrido detenido. Los resultados se conservan.";
    actualizar(); if (redibujar) EvoRuta.dibujo.dibujar();
  }
  function avanzar(tiempo) {
    frame = null;
    if (!puntos) return;
    if (inicio === null) inicio = tiempo;
    const progreso = Math.min((tiempo - inicio) / duracionTramo, puntos.length - 1);
    const tramo = Math.min(Math.floor(progreso), puntos.length - 2);
    const fraccion = progreso - tramo;
    const a = puntos[tramo], b = puntos[tramo + 1];
    EvoRuta.dibujo.establecerRecorrido({ puntos: puntos, posicion: {
      x: a.x + (b.x - a.x) * fraccion, y: a.y + (b.y - a.y) * fraccion } });
    EvoRuta.dibujo.dibujar();
    if (progreso === puntos.length - 1) {
      puntos = null; inicio = null;
      mensaje.textContent = "Recorrido completo: todos los destinos visitados y regreso al almacén.";
      actualizar();
    } else {
      const texto = "Recorriendo " + a.id + " → " + b.id + ".";
      if (mensaje.textContent !== texto) mensaje.textContent = texto;
      frame = requestAnimationFrame(avanzar);
    }
  }
  reproducir.addEventListener("click", function () {
    if (puntos) return;
    const ruta = EvoRuta.resultados.obtenerRuta(selector.value);
    const escenario = EvoRuta.datos.escenario;
    if (!ruta || !EvoRuta.rutas.validarRuta(ruta.ruta, escenario.destinos)) return;
    // Fotografía del recorrido: una mejora posterior no cambia la ruta en marcha.
    const porId = new Map(escenario.destinos.map(function (p) { return [p.id, p]; }));
    puntos = [escenario.almacen].concat(ruta.ruta.map(function (id) { return porId.get(id); }), escenario.almacen)
      .map(function (p) { return { ...p }; });
    inicio = null;
    mensaje.textContent = "Reproduciendo una copia de la ruta seleccionada al pulsar reproducir.";
    actualizar(); frame = requestAnimationFrame(avanzar);
  });
  parar.addEventListener("click", function () { detener(); });
  selector.addEventListener("change", function () { detener(); });
  actualizar();
  return { actualizar: actualizar, detener: detener };
})();
