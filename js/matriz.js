"use strict";
globalThis.EvoRuta = globalThis.EvoRuta || {};
// Una matriz dirigida e inmutable. Nunca se estima un tramo ausente.
EvoRuta.matrices = (function () {
  function crear(puntos, distancias, perfil = "driving") {
    const ids = puntos.map(p => p.id);
    if (new Set(ids).size !== ids.length || !Array.isArray(distancias) || distancias.length !== ids.length) throw new Error("Dimensiones o identificadores de matriz inválidos.");
    const filas = Array.from(distancias, fila => {
      if (!Array.isArray(fila) || fila.length !== ids.length || !Array.from(fila).every(d => Number.isFinite(d) && d >= 0)) throw new Error("Hay ubicaciones sin conexión vial o distancias inválidas. Ajusta los puntos y vuelve a consultar.");
      return Object.freeze(Array.from(fila));
    });
    const indice = new Map(ids.map((id, i) => [id, i]));
    const coordenadas = JSON.stringify(puntos.map(p => [p.id, p.lat, p.lng]));
    return Object.freeze({ ids: Object.freeze(ids), distancias: Object.freeze(filas), perfil,
      corresponde: lista => JSON.stringify(lista.map(p => [p.id, p.lat, p.lng])) === coordenadas,
      distancia: function (desde, hasta) {
        if (!indice.has(desde) || !indice.has(hasta)) throw new Error("Punto ajeno a la matriz vial.");
        return filas[indice.get(desde)][indice.get(hasta)];
      }
    });
  }
  return { crear };
})();
