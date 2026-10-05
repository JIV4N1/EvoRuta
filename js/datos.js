"use strict";

// Estado del escenario. Las unidades son ficticias, sin relación con kilómetros.
window.EvoRuta = window.EvoRuta || {};
EvoRuta.datos = (function () {
  const limites = { minimo: 8, maximo: 30, lado: 100 };
  const posicionesIniciales = [[19, 76], [45, 88], [76, 79], [87, 52], [73, 23], [48, 12], [20, 25], [33, 54]];
  const escenario = { almacen: { id: "A", x: 50, y: 49 }, destinos: [] };
  let siguienteId = 9;

  function restablecer() {
    escenario.almacen = { id: "A", x: 50, y: 49 };
    escenario.destinos = posicionesIniciales.map(function (posicion, indice) {
      return { id: "D" + (indice + 1), x: posicion[0], y: posicion[1] };
    });
    siguienteId = 9;
  }
  function puntos() { return [escenario.almacen].concat(escenario.destinos); }
  function acotar(valor) { return Math.round(Math.max(0, Math.min(limites.lado, valor)) * 10) / 10; }
  function mover(id, x, y) {
    const punto = puntos().find(function (actual) { return actual.id === id; });
    if (!punto || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    punto.x = acotar(x);
    punto.y = acotar(y);
    return true;
  }
  function agregar(x, y) {
    if (escenario.destinos.length >= limites.maximo || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const punto = { id: "D" + siguienteId++, x: acotar(x), y: acotar(y) };
    escenario.destinos.push(punto);
    return punto;
  }
  function eliminar(id) {
    if (escenario.destinos.length <= limites.minimo) return false;
    const indice = escenario.destinos.findIndex(function (punto) { return punto.id === id; });
    if (indice < 0) return false;
    escenario.destinos.splice(indice, 1);
    return true;
  }
  restablecer();
  return { limites: limites, escenario: escenario, puntos: puntos, mover: mover, agregar: agregar, eliminar: eliminar, restablecer: restablecer };
})();
