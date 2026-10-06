"use strict";

// Funciones independientes del DOM. Una ruta contiene solo IDs de destinos;
// el almacén se añade implícitamente al inicio y al final al medirla.
window.EvoRuta = window.EvoRuta || {};
EvoRuta.rutas = (function () {
  function distanciaEuclidiana(origen, destino) {
    return Math.hypot(destino.x - origen.x, destino.y - origen.y);
  }

  function validarRuta(ruta, destinos) {
    if (!Array.isArray(ruta) || ruta.length !== destinos.length) return false;
    const esperados = new Set(destinos.map(function (destino) { return destino.id; }));
    return esperados.size === destinos.length && new Set(ruta).size === ruta.length &&
      ruta.every(function (id) { return esperados.has(id); });
  }

  function distanciaTotal(ruta, almacen, destinos) {
    if (!validarRuta(ruta, destinos)) throw new Error("La ruta debe visitar cada destino exactamente una vez.");
    const porId = new Map(destinos.map(function (destino) { return [destino.id, destino]; }));
    let anterior = almacen;
    let total = 0;
    ruta.forEach(function (id) {
      const siguiente = porId.get(id);
      total += distanciaEuclidiana(anterior, siguiente);
      anterior = siguiente;
    });
    return total + distanciaEuclidiana(anterior, almacen);
  }

  function aleatoria(destinos, azar = Math.random) {
    const ruta = destinos.map(function (destino) { return destino.id; });
    // Fisher–Yates mezcla una copia; nunca altera el orden de los datos originales.
    for (let indice = ruta.length - 1; indice > 0; indice--) {
      const elegido = Math.floor(azar() * (indice + 1));
      const temporal = ruta[indice];
      ruta[indice] = ruta[elegido];
      ruta[elegido] = temporal;
    }
    return ruta;
  }

  function vecinoMasCercano(almacen, destinos) {
    const pendientes = destinos.slice();
    const ruta = [];
    let actual = almacen;
    while (pendientes.length) {
      let elegido = 0;
      let menorDistancia = distanciaEuclidiana(actual, pendientes[0]);
      for (let indice = 1; indice < pendientes.length; indice++) {
        const distancia = distanciaEuclidiana(actual, pendientes[indice]);
        // En distancias iguales gana el ID menor en orden de texto (D10 antes de D2).
        // El criterio no depende del orden del arreglo ni de la configuración regional.
        if (distancia < menorDistancia || (distancia === menorDistancia && pendientes[indice].id < pendientes[elegido].id)) {
          elegido = indice;
          menorDistancia = distancia;
        }
      }
      actual = pendientes.splice(elegido, 1)[0];
      ruta.push(actual.id);
    }
    return ruta;
  }
  return { distanciaEuclidiana: distanciaEuclidiana, validarRuta: validarRuta,
    distanciaTotal: distanciaTotal, aleatoria: aleatoria, vecinoMasCercano: vecinoMasCercano };
})();
