"use strict";

// Motor sin DOM. Cargar rutas.js primero. El almacén no forma parte del cromosoma:
// distanciaTotal lo incorpora al principio y al final de cada evaluación.
EvoRuta.genetico = (function () {
  const rutas = EvoRuta.rutas;
  const predeterminados = Object.freeze({ poblacion: 60, generaciones: 150, probabilidadMutacion: 0.15 });

  function sortear(azar) {
    const valor = azar();
    if (!Number.isFinite(valor) || valor < 0 || valor >= 1) throw new Error("El azar debe devolver un número en [0, 1).");
    return valor;
  }
  function comprobarPermutacion(ruta) {
    if (!Array.isArray(ruta) || ruta.length < 2 || new Set(ruta).size !== ruta.length ||
        !Array.from(ruta).every(function (id) { return typeof id === "string" && id.length > 0; })) {
      throw new Error("Se requiere una permutación de al menos dos IDs distintos.");
    }
  }
  function posicionesDistintas(longitud, azar) {
    const primera = Math.floor(sortear(azar) * longitud);
    let segunda = Math.floor(sortear(azar) * (longitud - 1));
    if (segunda >= primera) segunda++;
    return [primera, segunda];
  }
  function copiar(individuo) { return { ruta: individuo.ruta.slice(), distancia: individuo.distancia }; }

  // Tres participantes elegidos con reemplazo; gana la distancia menor.
  function torneo(poblacion, azar = Math.random) {
    if (!poblacion.length) throw new Error("El torneo requiere una población evaluada.");
    let ganador = null;
    for (let i = 0; i < 3; i++) {
      const candidato = poblacion[Math.floor(sortear(azar) * poblacion.length)];
      if (!ganador || candidato.distancia < ganador.distancia) ganador = candidato;
    }
    return copiar(ganador);
  }

  // OX: segmento inclusivo del primer padre; completar circularmente con el
  // orden del segundo desde el punto siguiente al corte, omitiendo IDs usados.
  function cruceOX(padre, madre, azar = Math.random) {
    comprobarPermutacion(padre);
    comprobarPermutacion(madre);
    const ids = new Set(padre);
    if (padre.length !== madre.length || !madre.every(function (id) { return ids.has(id); })) {
      throw new Error("Los padres deben contener los mismos destinos.");
    }
    const cortes = posicionesDistintas(padre.length, azar).sort(function (a, b) { return a - b; });
    function hijo(segmento, orden) {
      const resultado = new Array(segmento.length);
      const usados = new Set();
      for (let i = cortes[0]; i <= cortes[1]; i++) {
        resultado[i] = segmento[i];
        usados.add(segmento[i]);
      }
      let posicion = (cortes[1] + 1) % segmento.length;
      for (let i = 1; i <= orden.length; i++) {
        const id = orden[(cortes[1] + i) % orden.length];
        if (!usados.has(id)) {
          resultado[posicion] = id;
          posicion = (posicion + 1) % orden.length;
          usados.add(id);
        }
      }
      return resultado;
    }
    return [hijo(padre, madre), hijo(madre, padre)];
  }

  function mutarIntercambio(ruta, azar = Math.random) {
    comprobarPermutacion(ruta);
    const resultado = ruta.slice();
    const posiciones = posicionesDistintas(resultado.length, azar);
    const temporal = resultado[posiciones[0]];
    resultado[posiciones[0]] = resultado[posiciones[1]];
    resultado[posiciones[1]] = temporal;
    return resultado;
  }

  function ejecutar(opciones) {
    const { almacen, destinos, referencia, poblacion: tamano = predeterminados.poblacion,
      generaciones = predeterminados.generaciones, probabilidadMutacion = predeterminados.probabilidadMutacion,
      azar = Math.random, alGeneracion } = opciones;
    if (!Number.isInteger(tamano) || tamano < 3 || !Number.isInteger(generaciones) || generaciones < 0 ||
        !Number.isFinite(probabilidadMutacion) || probabilidadMutacion < 0 || probabilidadMutacion > 1) {
      throw new Error("Parámetros inválidos: población entera ≥ 3, generaciones enteras ≥ 0 y mutación entre 0 y 1.");
    }
    if (typeof azar !== "function" || (alGeneracion !== undefined && typeof alGeneracion !== "function")) {
      throw new Error("Azar y alGeneracion deben ser funciones.");
    }
    if (!almacen || !Number.isFinite(almacen.x) || !Number.isFinite(almacen.y) ||
        !Array.isArray(destinos) || destinos.length < 8 || destinos.length > 30 ||
        !Array.from(destinos).every(function (p) {
          return p && typeof p.id === "string" && p.id.length > 0 && p.id !== (almacen.id || "A") &&
            Number.isFinite(p.x) && Number.isFinite(p.y);
        }) || !rutas.validarRuta(referencia, destinos)) {
      throw new Error("Se requieren un almacén, 8–30 destinos válidos y su ruta aleatoria de referencia completa.");
    }
    // Copias: ni operadores ni observadores pueden alterar el escenario de entrada.
    const origen = { ...almacen };
    const puntos = destinos.map(function (p) { return { ...p }; });
    function evaluar(ruta) {
      const distancia = rutas.distanciaTotal(ruta, origen, puntos);
      if (!Number.isFinite(distancia)) throw new Error("La distancia debe ser finita.");
      return { ruta: ruta.slice(), distancia: distancia };
    }
    let poblacion = [evaluar(referencia)];
    while (poblacion.length < tamano) poblacion.push(evaluar(rutas.aleatoria(puntos, function () { return sortear(azar); })));
    let mejor = copiar(poblacion[0]);
    const historial = [];
    function registrar(generacion) {
      poblacion.forEach(function (individuo) {
        if (individuo.distancia < mejor.distancia) mejor = copiar(individuo);
      });
      historial.push({ generacion: generacion, distancia: mejor.distancia });
      if (alGeneracion) alGeneracion({ generacion: generacion, mejor: copiar(mejor), poblacion: poblacion.map(copiar) });
    }
    registrar(0);
    for (let generacion = 1; generacion <= generaciones; generacion++) {
      // Un élite global, sin cruzar ni mutar. El resto son descendientes nuevos.
      const siguiente = [copiar(mejor)];
      while (siguiente.length < tamano) {
        const padre = torneo(poblacion, azar);
        const madre = torneo(poblacion, azar);
        const hijos = cruceOX(padre.ruta, madre.ruta, azar);
        for (let hijo of hijos) {
          if (siguiente.length === tamano) break;
          // Una decisión por descendiente, no una probabilidad por gen.
          if (sortear(azar) < probabilidadMutacion) hijo = mutarIntercambio(hijo, azar);
          siguiente.push(evaluar(hijo));
        }
      }
      poblacion = siguiente;
      registrar(generacion);
    }
    return { mejor: copiar(mejor), historial: historial, poblacion: poblacion.map(copiar) };
  }
  return { predeterminados: predeterminados, ejecutar: ejecutar, torneo: torneo, cruceOX: cruceOX, mutarIntercambio: mutarIntercambio };
})();
