"use strict";

// El dibujo convierte coordenadas del escenario a píxeles; no modifica los datos.
EvoRuta.dibujo = (function () {
  const canvas = document.getElementById("plano");
  const contexto = canvas.getContext("2d");
  let vista = { escala: 1, izquierda: 0, arriba: 0, ancho: 0, alto: 0 };
  let rutasVisibles = [];
  let recorrido = null;
  function establecerRecorrido(valor) { recorrido = valor; }

  function establecerRutas(rutas) { rutasVisibles = rutas; }

  function dibujarRutas() {
    const escenario = EvoRuta.datos.escenario;
    const porId = new Map(escenario.destinos.map(function (punto) { return [punto.id, punto]; }));
    rutasVisibles.forEach(function (resultado) {
      const puntos = [escenario.almacen].concat(resultado.ruta.map(function (id) { return porId.get(id); }), escenario.almacen);
      contexto.strokeStyle = resultado.color;
      contexto.lineWidth = 2;
      contexto.setLineDash(resultado.guiones);
      contexto.beginPath();
      puntos.forEach(function (punto, indice) {
        const posicion = aPantalla(punto);
        if (indice === 0) contexto.moveTo(posicion.x, posicion.y);
        else contexto.lineTo(posicion.x, posicion.y);
      });
      contexto.stroke();
    });
    contexto.setLineDash([]);
  }

  function aPantalla(punto) {
    return { x: vista.izquierda + punto.x * vista.escala, y: vista.arriba + (100 - punto.y) * vista.escala };
  }
  function aEscenario(x, y) {
    return { x: (x - vista.izquierda) / vista.escala, y: 100 - (y - vista.arriba) / vista.escala };
  }
  function actualizarVista() {
    const rectangulo = canvas.getBoundingClientRect();
    const lado = Math.max(1, Math.min(rectangulo.width - 76, rectangulo.height - 62));
    vista = { escala: lado / EvoRuta.datos.limites.lado, izquierda: (rectangulo.width - lado) / 2, arriba: (rectangulo.height - lado) / 2 - 5, ancho: rectangulo.width, alto: rectangulo.height };
    return rectangulo;
  }
  // clientX/clientY y el rectángulo usan píxeles CSS, también con toque o HiDPI.
  function posicionEvento(evento) {
    const rectangulo = actualizarVista();
    return { x: evento.clientX - rectangulo.left, y: evento.clientY - rectangulo.top };
  }
  function dibujar() {
    const rectangulo = actualizarVista();
    const densidad = window.devicePixelRatio || 1;
    const ancho = Math.round(rectangulo.width * densidad);
    const alto = Math.round(rectangulo.height * densidad);
    if (canvas.width !== ancho) canvas.width = ancho;
    if (canvas.height !== alto) canvas.height = alto;
    contexto.setTransform(densidad, 0, 0, densidad, 0, 0);
    // Una única escala mantiene las distancias y proporciones en ambos ejes.
    const lado = vista.escala * EvoRuta.datos.limites.lado;
    contexto.clearRect(0, 0, vista.ancho, vista.alto);
    contexto.lineWidth = 1;
    contexto.font = "10px system-ui, sans-serif";
    for (let valor = 0; valor <= 100; valor += 10) {
      const esquina = aPantalla({ x: valor, y: valor });
      contexto.strokeStyle = valor % 20 === 0 ? "#dce5d9" : "#e8eee4";
      contexto.beginPath();
      contexto.moveTo(esquina.x, vista.arriba);
      contexto.lineTo(esquina.x, vista.arriba + lado);
      contexto.moveTo(vista.izquierda, esquina.y);
      contexto.lineTo(vista.izquierda + lado, esquina.y);
      contexto.stroke();
      if (valor % 20 === 0) {
        contexto.fillStyle = "#76877b";
        contexto.textAlign = "center";
        contexto.fillText(valor, esquina.x, vista.arriba + lado + 18);
        contexto.textAlign = "right";
        contexto.fillText(valor, vista.izquierda - 10, esquina.y + 3);
      }
    }
    contexto.fillStyle = "#62736c";
    contexto.textAlign = "left";
    contexto.fillText("X", vista.izquierda + lado + 19, vista.arriba + lado + 18);
    contexto.fillText("Y", vista.izquierda - 20, vista.arriba - 12);
    dibujarRutas();
    EvoRuta.datos.puntos().forEach(function (punto) {
      const posicion = aPantalla(punto);
      const esAlmacen = punto.id === "A";
      contexto.fillStyle = esAlmacen ? "#dc854c" : "#176b50";
      contexto.strokeStyle = "#ffffff";
      contexto.lineWidth = 2.5;
      contexto.beginPath();
      if (esAlmacen) contexto.rect(posicion.x - 7, posicion.y - 7, 14, 14);
      else contexto.arc(posicion.x, posicion.y, 6, 0, Math.PI * 2);
      contexto.fill();
      contexto.stroke();
      const etiqueta = esAlmacen ? "A · Almacén" : punto.id;
      contexto.font = "600 11px system-ui, sans-serif";
      contexto.textAlign = "left";
      const anchoEtiqueta = contexto.measureText(etiqueta).width;
      const xEtiqueta = Math.min(posicion.x + 11, vista.ancho - anchoEtiqueta - 5);
      const yEtiqueta = posicion.y - 11;
      contexto.lineWidth = 4;
      contexto.strokeStyle = "#f6f8f3";
      contexto.strokeText(etiqueta, xEtiqueta, yEtiqueta);
      contexto.fillStyle = "#193c36";
      contexto.fillText(etiqueta, xEtiqueta, yEtiqueta);
    });
    if (recorrido) {
      contexto.setLineDash([3, 3]); contexto.strokeStyle = "#193c36"; contexto.lineWidth = 3;
      contexto.beginPath();
      recorrido.puntos.forEach(function (p, i) { const q = aPantalla(p); if (i) contexto.lineTo(q.x, q.y); else contexto.moveTo(q.x, q.y); });
      contexto.stroke(); contexto.setLineDash([]);
      const q = aPantalla(recorrido.posicion);
      contexto.beginPath(); contexto.arc(q.x, q.y, 9, 0, Math.PI * 2);
      contexto.fillStyle = "#ffd34e"; contexto.fill(); contexto.strokeStyle = "#193c36"; contexto.stroke();
    }
    canvas.setAttribute("aria-label", "Plano con un almacén y " + EvoRuta.datos.escenario.destinos.length + " destinos. Posiciones disponibles en el editor de coordenadas.");
  }
  function buscarPunto(x, y) {
    // Se usa un área táctil mayor que el círculo para facilitar el uso en celular.
    let masCercano = null;
    let distanciaMinima = 22;
    EvoRuta.datos.puntos().forEach(function (punto) {
      const posicion = aPantalla(punto);
      const distancia = Math.hypot(posicion.x - x, posicion.y - y);
      if (distancia <= distanciaMinima) { distanciaMinima = distancia; masCercano = punto; }
    });
    return masCercano;
  }
  return { canvas: canvas, dibujar: dibujar, aEscenario: aEscenario, posicionEvento: posicionEvento, buscarPunto: buscarPunto, establecerRutas: establecerRutas, establecerRecorrido: establecerRecorrido };
})();
