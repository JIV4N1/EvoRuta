"use strict";

// Conserva las referencias solo durante la sesión y mientras el escenario sea el mismo.
EvoRuta.resultados = (function () {
  const datos = EvoRuta.datos;
  let firmaAnterior = JSON.stringify(datos.escenario);
  let referencias = null;
  let mejorGenetico = null;
  const mensaje = document.getElementById("estado-resultados");
  const vista = document.getElementById("vista-ruta");

  function mostrar() {
    ["aleatoria", "vecino"].forEach(function (metodo) {
      const resultado = referencias && referencias[metodo];
      document.getElementById("distancia-" + metodo).textContent = resultado ? resultado.distancia.toFixed(2) : "—";
      document.getElementById("orden-" + metodo).textContent = resultado
        ? ["A"].concat(resultado.ruta, "A").join(" → ") : "Recorrido pendiente de calcular.";
    });
    document.getElementById("etiqueta-resultados").textContent = referencias ? "Referencias calculadas" : "Sin resultados vigentes";
    vista.disabled = !referencias;
    const rutasVisibles = [];
    if (referencias) {
      ["aleatoria", "vecino"].forEach(function (metodo) {
        if (vista.value === "ambas" || vista.value === "todas" || vista.value === metodo) {
          rutasVisibles.push({ ruta: referencias[metodo].ruta, color: metodo === "aleatoria" ? "#8650a0" : "#216ca0", guiones: metodo === "aleatoria" ? [7, 5] : [] });
        }
      });
    }
    if (mejorGenetico && (vista.value === "todas" || vista.value === "genetico")) {
      rutasVisibles.push({ ruta: mejorGenetico.ruta, color: "#c15b19", guiones: [10, 4, 2, 4] });
    }
    EvoRuta.dibujo.establecerRutas(rutasVisibles);
    if (EvoRuta.animacion) EvoRuta.animacion.actualizar();
  }

  function actualizar() {
    const firma = JSON.stringify(datos.escenario);
    if (firma !== firmaAnterior) {
      if (EvoRuta.animacion) EvoRuta.animacion.detener(false);
      referencias = null;
      mejorGenetico = null;
      if (EvoRuta.simulacion) EvoRuta.simulacion.reiniciar();
      firmaAnterior = firma;
      mensaje.textContent = "El escenario cambió. Recalcula las rutas de referencia; los resultados anteriores ya no son válidos.";
    }
    const validacion = datos.validar();
    const ejecutar = document.getElementById("ejecutar");
    ejecutar.disabled = !validacion.valido;
    ejecutar.title = validacion.valido ? "Calcula o consulta las referencias del escenario actual." : "Completa al menos 8 destinos para calcular.";
    ejecutar.textContent = referencias ? "Consultar rutas de referencia" : "Calcular rutas de referencia";
    mostrar();
    if (EvoRuta.simulacion) EvoRuta.simulacion.actualizarControles();
  }

  document.getElementById("ejecutar").addEventListener("click", function () {
    actualizar();
    if (!datos.validar().valido) return;
    if (!referencias) {
      const escenario = datos.escenario;
      const aleatoria = EvoRuta.rutas.aleatoria(escenario.destinos);
      const vecino = EvoRuta.rutas.vecinoMasCercano(escenario.almacen, escenario.destinos);
      referencias = {
        aleatoria: { ruta: aleatoria, distancia: EvoRuta.rutas.distanciaTotal(aleatoria, escenario.almacen, escenario.destinos) },
        vecino: { ruta: vecino, distancia: EvoRuta.rutas.distanciaTotal(vecino, escenario.almacen, escenario.destinos) }
      };
    }
    mensaje.textContent = "Ambas rutas salen de A, visitan todos los destinos una vez y regresan a A. La referencia aleatoria se conserva hasta editar el escenario. Distancias en unidades ficticias, redondeadas a dos decimales.";
    actualizar();
    EvoRuta.dibujo.dibujar();
  });
  vista.addEventListener("change", function () { actualizar(); EvoRuta.dibujo.dibujar(); });
  function obtener() {
    return referencias ? JSON.parse(JSON.stringify(referencias)) : null;
  }
  function establecerGenetico(mejor) { mejorGenetico = mejor; mostrar(); }
  function obtenerRuta(metodo) {
    const resultado = metodo === "genetico" ? mejorGenetico : referencias && referencias[metodo];
    return resultado ? JSON.parse(JSON.stringify(resultado)) : null;
  }
  return { obtenerRuta: obtenerRuta, actualizar: actualizar, obtener: obtener, establecerGenetico: establecerGenetico };
})();
