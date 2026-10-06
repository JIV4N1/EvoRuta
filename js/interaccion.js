"use strict";

// Los controles conectan el estado con el dibujo. Aún no se calculan rutas.
(function () {
  const datos = EvoRuta.datos;
  const dibujo = EvoRuta.dibujo;
  const selector = document.getElementById("punto");
  const campoX = document.getElementById("coordenada-x");
  const campoY = document.getElementById("coordenada-y");
  const estado = document.getElementById("estado");
  let modo = "mover";
  let arrastre = null;
  const instrucciones = {
    mover: "Arrastra un destino o el almacén para cambiar su posición.",
    agregar: "Toca el interior del plano para agregar un destino. Máximo: 30 destinos.",
    eliminar: "Toca un destino para eliminarlo. Necesitas 8 para ejecutar; el almacén se conserva."
  };
  function mostrarCoordenadas() {
    const punto = datos.puntos().find(function (actual) { return actual.id === selector.value; });
    if (!punto) return;
    campoX.value = punto.x;
    campoY.value = punto.y;
    document.getElementById("eliminar-seleccion").disabled = punto.id === "A";
  }
  function actualizar(id) {
    const seleccion = id || selector.value;
    selector.replaceChildren();
    datos.puntos().forEach(function (punto) {
      const opcion = document.createElement("option");
      opcion.value = punto.id;
      opcion.textContent = punto.id === "A" ? "A · Almacén" : punto.id + " · Destino";
      selector.appendChild(opcion);
    });
    if (datos.puntos().some(function (punto) { return punto.id === seleccion; })) selector.value = seleccion;
    document.getElementById("conteo").textContent = datos.escenario.destinos.length + " destinos";
    document.getElementById("agregar-centro").disabled = datos.escenario.destinos.length >= datos.limites.maximo;
    const validacion = datos.validar();
    document.getElementById("validacion-escenario").textContent = validacion.faltantes
      ? "Faltan " + validacion.faltantes + " destino" + (validacion.faltantes === 1 ? "" : "s") + " para ejecutar. Se requieren entre 8 y 30, sin contar el almacén."
      : "Escenario válido: " + validacion.cantidad + " destinos. Los algoritmos siguen pendientes.";
    // El escenario válido es un requisito; la ejecución espera la siguiente etapa.
    const ejecutar = document.getElementById("ejecutar");
    ejecutar.disabled = true;
    ejecutar.title = validacion.valido ? "Algoritmos pendientes de implementar." : "Completa los 8 destinos para ejecutar.";
    mostrarCoordenadas();
    dibujo.dibujar();
  }
  function agregar(x, y) {
    const punto = datos.agregar(x, y);
    estado.textContent = punto ? "Destino " + punto.id + " agregado." : datos.escenario.destinos.length >= datos.limites.maximo
      ? "Se alcanzó el máximo de 30 destinos." : "Ya hay un punto en esas coordenadas. Elige otra posición.";
    actualizar(punto ? punto.id : null);
  }
  function eliminar(id) {
    estado.textContent = datos.eliminar(id) ? "Destino " + id + " eliminado." : "No se puede eliminar el almacén.";
    actualizar();
  }
  document.querySelectorAll("[data-modo]").forEach(function (boton) {
    boton.addEventListener("click", function () {
      modo = boton.dataset.modo;
      document.querySelectorAll("[data-modo]").forEach(function (actual) { actual.setAttribute("aria-pressed", String(actual === boton)); });
      document.getElementById("instruccion").textContent = instrucciones[modo];
      dibujo.canvas.style.cursor = modo === "mover" ? "grab" : "crosshair";
    });
  });
  dibujo.canvas.addEventListener("pointerdown", function (evento) {
    if (!evento.isPrimary || evento.button !== 0 || arrastre) return;
    const posicion = dibujo.posicionEvento(evento);
    const punto = dibujo.buscarPunto(posicion.x, posicion.y);
    const coordenadas = dibujo.aEscenario(posicion.x, posicion.y);
    if (modo === "agregar") {
      if (coordenadas.x >= 0 && coordenadas.x <= 100 && coordenadas.y >= 0 && coordenadas.y <= 100) agregar(coordenadas.x, coordenadas.y);
      else estado.textContent = "Agrega el destino dentro de la cuadrícula de 0 a 100.";
    } else if (punto && modo === "eliminar") eliminar(punto.id);
    else if (punto) {
      arrastre = { id: punto.id, puntero: evento.pointerId, desplazamientoX: punto.x - coordenadas.x, desplazamientoY: punto.y - coordenadas.y };
      dibujo.canvas.setPointerCapture(evento.pointerId);
      actualizar(punto.id);
    }
  });
  dibujo.canvas.addEventListener("pointermove", function (evento) {
    if (!arrastre || evento.pointerId !== arrastre.puntero) return;
    const posicion = dibujo.posicionEvento(evento);
    const coordenadas = dibujo.aEscenario(posicion.x, posicion.y);
    arrastre.bloqueado = !datos.mover(arrastre.id, coordenadas.x + arrastre.desplazamientoX, coordenadas.y + arrastre.desplazamientoY);
    if (arrastre.bloqueado) estado.textContent = "No se pueden superponer puntos. Se conserva la última posición válida.";
    mostrarCoordenadas();
    dibujo.dibujar();
  });
  function terminarArrastre(evento) {
    if (!arrastre || evento.pointerId !== arrastre.puntero) return;
    estado.textContent = arrastre.bloqueado ? "No se pueden superponer puntos. Se conserva la última posición válida."
      : "Posición de " + arrastre.id + " actualizada.";
    arrastre = null;
    if (dibujo.canvas.hasPointerCapture(evento.pointerId)) dibujo.canvas.releasePointerCapture(evento.pointerId);
  }
  dibujo.canvas.addEventListener("pointerup", terminarArrastre);
  dibujo.canvas.addEventListener("pointercancel", terminarArrastre);
  dibujo.canvas.addEventListener("lostpointercapture", terminarArrastre);
  selector.addEventListener("change", mostrarCoordenadas);
  document.getElementById("aplicar").addEventListener("click", function () {
    if (!campoX.value.trim() || !campoY.value.trim() || !campoX.checkValidity() || !campoY.checkValidity()) {
      estado.textContent = "Introduce X e Y entre 0 y 100, con hasta un decimal.";
      return;
    }
    const movido = datos.mover(selector.value, Number(campoX.value), Number(campoY.value));
    estado.textContent = movido ? "Coordenadas de " + selector.value + " actualizadas."
      : "Ya hay un punto en esas coordenadas. Se conserva la posición anterior.";
    actualizar();
  });
  document.getElementById("agregar-centro").addEventListener("click", function () { agregar(50, 50); });
  document.getElementById("eliminar-seleccion").addEventListener("click", function () { eliminar(selector.value); });
  document.getElementById("restablecer").addEventListener("click", function () {
    if (arrastre) terminarArrastre({ pointerId: arrastre.puntero });
    datos.restablecer();
    estado.textContent = "Escenario inicial restablecido: un almacén y ocho destinos.";
    actualizar("A");
  });
  // ResizeObserver también detecta cambios de tamaño del panel sin recargar.
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(dibujo.dibujar).observe(dibujo.canvas.parentElement);
  window.addEventListener("resize", dibujo.dibujar);
  actualizar("A");
})();
