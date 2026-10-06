"use strict";

// Usa el historial real del motor; redimensionar solo cambia su representación.
EvoRuta.grafica = (function () {
  const canvas = document.getElementById("grafica");
  const contexto = canvas.getContext("2d");
  let historial = [];
  function dibujar() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ancho = rect.width, alto = rect.height;
    contexto.clearRect(0, 0, ancho, alto);
    if (!historial.length) return;
    const izquierda = 62, arriba = 22, fondo = alto - 42, derecha = ancho - 18;
    const distancias = historial.map(function (dato) { return dato.distancia; });
    const minimo = Math.min.apply(null, distancias), maximo = Math.max.apply(null, distancias);
    const margen = Math.max((maximo - minimo) * 0.1, maximo * 0.02, 1);
    const inferior = Math.max(0, minimo - margen), superior = maximo + margen;
    const ultima = historial[historial.length - 1].generacion;
    function x(g) { return izquierda + g / Math.max(1, ultima) * (derecha - izquierda); }
    function y(d) { return fondo - (d - inferior) / (superior - inferior) * (fondo - arriba); }
    contexto.font = "11px system-ui";
    contexto.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const valor = inferior + (superior - inferior) * i / 4;
      contexto.strokeStyle = "#dce4dc";
      contexto.beginPath(); contexto.moveTo(izquierda, y(valor)); contexto.lineTo(derecha, y(valor)); contexto.stroke();
      contexto.fillStyle = "#62736c"; contexto.textAlign = "right";
      contexto.fillText(valor.toFixed(1), izquierda - 8, y(valor) + 4);
    }
    contexto.textAlign = "center";
    const marcas = Math.min(4, ultima);
    for (let i = 0; i <= marcas; i++) {
      const generacion = marcas ? Math.round(ultima * i / marcas) : 0;
      contexto.fillText(String(generacion), x(generacion), fondo + 17);
    }
    contexto.fillText("Generación", ancho / 2, alto - 5);
    contexto.strokeStyle = "#c15b19"; contexto.lineWidth = 2;
    contexto.beginPath();
    historial.forEach(function (dato, indice) {
      if (indice === 0) contexto.moveTo(x(dato.generacion), y(dato.distancia));
      else contexto.lineTo(x(dato.generacion), y(dato.distancia));
    });
    contexto.stroke();
    // El punto permite ver también una ejecución configurada con cero generaciones.
    const final = historial[historial.length - 1];
    contexto.fillStyle = "#c15b19"; contexto.beginPath();
    contexto.arc(x(final.generacion), y(final.distancia), 3, 0, Math.PI * 2); contexto.fill();
  }
  function actualizar(datos) {
    historial = datos.map(function (dato) { return { ...dato }; });
    const resumen = historial.length ? historial.length + " registros, de generación 0 a " + historial[historial.length - 1].generacion +
      ". Distancia inicial: " + historial[0].distancia.toFixed(2) + "; mejor actual: " + historial[historial.length - 1].distancia.toFixed(2) + "."
      : "Inicia la evolución para ver su historial.";
    document.getElementById("resumen-grafica").textContent = resumen;
    canvas.setAttribute("aria-label", resumen);
    dibujar();
  }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(dibujar).observe(canvas.parentElement);
  window.addEventListener("resize", dibujar);
  return { actualizar: actualizar };
})();
