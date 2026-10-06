"use strict";

// Solo memoria: recargar la página inicia un historial vacío.
EvoRuta.experimentos = (function () {
  let registros = [];
  function resumen() {
    if (!registros.length) return { cantidad: 0, mejor: null, promedio: null };
    const distancias = registros.map(function (registro) { return registro.distancia; });
    return { cantidad: registros.length, mejor: Math.min.apply(null, distancias),
      promedio: distancias.reduce(function (suma, distancia) { return suma + distancia; }, 0) / registros.length };
  }
  function mostrar() {
    const cuerpo = document.getElementById("ejecuciones-registradas");
    cuerpo.replaceChildren();
    registros.forEach(function (registro) {
      const fila = document.createElement("tr");
      const parametros = registro.parametros;
      const valores = [registro.numero, parametros.poblacion, parametros.generaciones,
        (parametros.probabilidadMutacion * 100).toFixed(1) + "%", registro.distancia.toFixed(2),
        formatoMejora(registro.mejoraAleatoria), formatoMejora(registro.mejoraVecino)];
      valores.forEach(function (valor, indice) {
        const celda = document.createElement(indice === 0 ? "th" : "td");
        if (indice === 0) celda.setAttribute("scope", "row");
        celda.textContent = String(valor);
        fila.appendChild(celda);
      });
      cuerpo.appendChild(fila);
    });
    const estadisticas = resumen();
    document.getElementById("cantidad-ejecuciones").textContent = String(estadisticas.cantidad);
    document.getElementById("mejor-experimentos").textContent = estadisticas.mejor === null ? "—" : estadisticas.mejor.toFixed(2);
    document.getElementById("promedio-experimentos").textContent = estadisticas.promedio === null ? "—" : estadisticas.promedio.toFixed(2);
    document.getElementById("historial-vacio").hidden = registros.length > 0;
  }
  function formatoMejora(valor) {
    if (valor === null) return "No calculable (referencia cero)";
    if (valor !== 0 && Math.abs(valor) < 0.005) return "Diferencia inferior a 0.01 % · " + (valor < 0 ? "más larga" : "más corta");
    return valor.toFixed(2) + "%" + (valor < 0 ? " · más larga" : "");
  }
  function registrar(parametros, distancia, referencias) {
    if (!Number.isFinite(distancia) || distancia < 0) throw new Error("La distancia final debe ser finita y no negativa.");
    function mejora(referencia) { return referencia === 0 ? null : (referencia - distancia) / referencia * 100; }
    // Guardar valores numéricos completos; redondear únicamente al mostrarlos.
    registros.push({ numero: registros.length + 1, parametros: { ...parametros }, distancia: distancia,
      mejoraAleatoria: mejora(referencias.aleatoria.distancia), mejoraVecino: mejora(referencias.vecino.distancia) });
    mostrar();
    document.getElementById("aviso-experimentos").textContent = "Ejecución " + registros.length + " registrada. Puedes repetir con una población nueva o reiniciar para cambiar parámetros.";
  }
  function limpiarPorCambio() {
    const habiaRegistros = registros.length > 0;
    registros = [];
    mostrar();
    if (habiaRegistros) document.getElementById("aviso-experimentos").textContent = "El escenario cambió: se eliminó el historial de ejecuciones y sus estadísticas. Las nuevas ejecuciones usarán referencias recalculadas.";
  }
  function obtener() { return registros.map(function (registro) { return { ...registro, parametros: { ...registro.parametros } }; }); }
  mostrar();
  return { registrar: registrar, limpiarPorCambio: limpiarPorCambio, resumen: resumen, obtener: obtener };
})();
