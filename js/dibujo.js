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

  function dibujarEdificio(posicion, esAlmacen, indice) {
    contexto.save();
    contexto.translate(posicion.x, posicion.y);
    // Los iconos se centran en la coordenada real, sin modificar el escenario.
    const tamano = EvoRuta.datos.escenario.destinos.length > 18 ? 0.75 : 1;
    contexto.scale(tamano, tamano);
    contexto.fillStyle = "#dbe8d7";
    contexto.beginPath(); contexto.ellipse(0, 10, 15, 5, 0, 0, Math.PI * 2); contexto.fill();
    contexto.lineWidth = 2;
    contexto.strokeStyle = "#ffffff";
    contexto.fillStyle = esAlmacen ? "#ffe0a6" : "#fffaf0";
    contexto.fillRect(-10, -6, 20, 17);
    contexto.strokeRect(-10, -6, 20, 17);
    contexto.fillStyle = esAlmacen ? "#c97b35" : ["#428e82", "#6488bd", "#ad799b"][indice % 3];
    contexto.beginPath(); contexto.moveTo(-14, -5); contexto.lineTo(0, -16);
    contexto.lineTo(14, -5); contexto.closePath(); contexto.fill(); contexto.stroke();
    contexto.fillStyle = esAlmacen ? "#a77549" : "#5a7184";
    contexto.fillRect(esAlmacen ? -6 : -2, 2, esAlmacen ? 12 : 5, 9);
    contexto.fillStyle = "#a5dbe2";
    contexto.fillRect(-7, -3, 4, 4);
    contexto.fillRect(4, -3, 4, 4);
    if (esAlmacen) {
      contexto.strokeStyle = "#edbf80"; contexto.lineWidth = 1;
      for (let y = 4; y < 11; y += 3) { contexto.beginPath(); contexto.moveTo(-5, y); contexto.lineTo(5, y); contexto.stroke(); }
    }
    contexto.restore();
  }

  function dibujarCarrito() {
    const posicion = aPantalla(recorrido.posicion);
    contexto.save();
    contexto.translate(posicion.x, posicion.y);
    contexto.rotate(recorrido.angulo || 0);
    // Vista superior: la cabina y los faros señalan el sentido de avance.
    contexto.shadowColor = "#18264244"; contexto.shadowBlur = 5;
    contexto.fillStyle = "#23344a";
    contexto.fillRect(-9, -10, 7, 4); contexto.fillRect(6, -10, 6, 4);
    contexto.fillRect(-9, 6, 7, 4); contexto.fillRect(6, 6, 6, 4);
    contexto.fillStyle = "#ffca61"; contexto.strokeStyle = "#fff"; contexto.lineWidth = 2;
    contexto.beginPath();
    contexto.moveTo(-14, -8); contexto.lineTo(9, -8); contexto.lineTo(15, -4);
    contexto.lineTo(15, 4); contexto.lineTo(9, 8); contexto.lineTo(-14, 8);
    contexto.closePath(); contexto.fill(); contexto.stroke();
    contexto.shadowBlur = 0;
    contexto.fillStyle = "#31546b"; contexto.fillRect(4, -5, 5, 10);
    contexto.fillStyle = "#fff5d4"; contexto.fillRect(12, -6, 3, 3); contexto.fillRect(12, 3, 3, 3);
    contexto.fillStyle = "#c88436"; contexto.fillRect(-10, -4, 8, 8);
    contexto.strokeStyle = "#ffdf95"; contexto.lineWidth = 1;
    contexto.strokeRect(-10, -4, 8, 8);
    contexto.restore();
  }

  function dibujarCaminoAnimado() {
    if (!recorrido) return;
    contexto.save();
    contexto.lineJoin = "round"; contexto.lineCap = "round";
    contexto.beginPath();
    recorrido.puntos.forEach(function (p, i) {
      const q = aPantalla(p);
      if (i) contexto.lineTo(q.x, q.y); else contexto.moveTo(q.x, q.y);
    });
    // Camino ilustrado sobre los mismos segmentos euclidianos, sin desvíos.
    contexto.strokeStyle = "#ccd8d8"; contexto.lineWidth = 12; contexto.stroke();
    contexto.strokeStyle = "#f9fcf8"; contexto.lineWidth = 2;
    contexto.setLineDash([5, 7]); contexto.stroke();
    contexto.restore();
  }

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
    dibujarCaminoAnimado();
    EvoRuta.datos.puntos().forEach(function (punto, indice) {
      const posicion = aPantalla(punto);
      const esAlmacen = punto.id === "A";
      dibujarEdificio(posicion, esAlmacen, indice);
      const etiqueta = esAlmacen ? "A · Almacén" : punto.id;
      contexto.font = "600 11px system-ui, sans-serif";
      contexto.textAlign = "left";
      const anchoEtiqueta = contexto.measureText(etiqueta).width;
      const xEtiqueta = Math.min(posicion.x + 15, vista.ancho - anchoEtiqueta - 5);
      const yEtiqueta = Math.max(12, posicion.y - 17);
      contexto.lineWidth = 4;
      contexto.strokeStyle = "#f6f8f3";
      contexto.strokeText(etiqueta, xEtiqueta, yEtiqueta);
      contexto.fillStyle = "#193c36";
      contexto.fillText(etiqueta, xEtiqueta, yEtiqueta);
    });
    if (recorrido) {
      dibujarCarrito();
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
