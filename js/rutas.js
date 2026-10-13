"use strict";

// Funciones independientes del DOM. Una ruta contiene solo IDs de destinos;
// el almacén se añade implícitamente al inicio y al final al medirla.
globalThis.EvoRuta = globalThis.EvoRuta || {};
EvoRuta.rutas = (function () {

  function validarRuta(ruta, destinos) {
    if (!Array.isArray(ruta) || ruta.length !== destinos.length) return false;
    const esperados = new Set(destinos.map(function (destino) { return destino.id; }));
    return esperados.size === destinos.length && new Set(ruta).size === ruta.length &&
      Array.from(ruta).every(function (id) { return esperados.has(id); });
  }

  function distanciaTotal(ruta, almacen, destinos, matriz) {
    if (!validarRuta(ruta, destinos)) throw new Error("Ruta inválida: debe visitar todos los destinos una sola vez.");
    if (!matriz || !matriz.corresponde([almacen].concat(destinos))) throw new Error("Se requiere la matriz vial vigente.");
    const orden = [almacen.id].concat(ruta, almacen.id);
    return orden.slice(1).reduce((suma, id, i) => suma + matriz.distancia(orden[i], id), 0);
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

  function vecinoMasCercano(almacen, destinos, matriz) {
    if (!matriz || !matriz.corresponde([almacen].concat(destinos))) throw new Error("Se requiere la matriz vial vigente.");
    const pendientes = destinos.slice();
    const ruta = [];
    let actual = almacen;
    while (pendientes.length) {
      let elegido = 0;
      let menorDistancia = matriz.distancia(actual.id, pendientes[0].id);
      for (let indice = 1; indice < pendientes.length; indice++) {
        const distancia = matriz.distancia(actual.id, pendientes[indice].id);
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
  return { validarRuta: validarRuta,
    distanciaTotal: distanciaTotal, aleatoria: aleatoria, vecinoMasCercano: vecinoMasCercano };
})();
