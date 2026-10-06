"use strict";

EvoRuta.simulacion = (function () {
  let ejecucion = null, estado = null, fase = "lista", temporizador = null;
  let controlesGuardados = [];
  const obtener = function (id) { return document.getElementById(id); };
  const mensaje = obtener("estado-simulacion");

  function bloqueada() { return ejecucion !== null; }
  function bloquearEdicion(bloquear) {
    if (bloquear) {
      controlesGuardados = Array.from(document.querySelectorAll(".herramientas button, .campos-editor input, .campos-editor select, .campos-editor button"))
        .map(function (control) { const anterior = control.disabled; control.disabled = true; return { control: control, disabled: anterior }; });
    } else {
      controlesGuardados.forEach(function (dato) { dato.control.disabled = dato.disabled; });
      controlesGuardados = [];
    }
    obtener("parametros-geneticos").disabled = bloquear;
  }
  function actualizarControles() {
    obtener("iniciar").disabled = bloqueada() || !EvoRuta.datos.validar().valido;
    obtener("pausar").disabled = fase !== "ejecutando";
    obtener("continuar").disabled = fase !== "pausada";
    obtener("paso").disabled = fase !== "pausada";
    obtener("reiniciar").disabled = !bloqueada();
  }
  function porcentaje(referencia, distancia) {
    return referencia === 0 ? null : (referencia - distancia) / referencia * 100;
  }
  function describirMejora(referencia, distancia) {
    const mejora = porcentaje(referencia, distancia);
    if (mejora === null) return "No calculable: referencia de distancia cero.";
    return mejora.toFixed(2) + "% · " + (mejora < 0 ? "la ruta genética es más larga" : mejora > 0 ? "la ruta genética es más corta" : "misma distancia");
  }
  function mostrar() {
    obtener("generacion-actual").textContent = estado ? String(estado.generacion) : "—";
    obtener("distancia-genetico").textContent = estado ? estado.mejor.distancia.toFixed(2) : "—";
    obtener("orden-genetico").textContent = estado ? ["A"].concat(estado.mejor.ruta, "A").join(" → ") : "Sin ejecución.";
    const referencias = EvoRuta.resultados.obtener();
    ["aleatoria", "vecino"].forEach(function (metodo) {
      obtener("mejora-" + metodo).textContent = "Frente a " + metodo + ": " + (estado && referencias ? describirMejora(referencias[metodo].distancia, estado.mejor.distancia) : "—");
    });
    EvoRuta.resultados.establecerGenetico(estado ? estado.mejor : null);
    EvoRuta.grafica.actualizar(estado ? estado.historial : []);
    if (EvoRuta.didactica) EvoRuta.didactica.mostrar(estado ? estado.ejemplo : null);
    EvoRuta.dibujo.dibujar();
    actualizarControles();
  }
  function cancelarTemporizador() {
    if (temporizador !== null) clearTimeout(temporizador);
    temporizador = null;
  }
  function avanzar() {
    estado = ejecucion.avanzar();
    if (estado.terminado) { fase = "terminada"; cancelarTemporizador(); mensaje.textContent = "Ejecución terminada. Reinicia para configurar otra búsqueda o editar el escenario."; }
    mostrar();
  }
  function programar() {
    if (fase !== "ejecutando" || temporizador !== null) return;
    // Una generación por turno deja al navegador atender eventos y dibujar.
    temporizador = setTimeout(function () {
      temporizador = null;
      if (fase !== "ejecutando") return;
      try { avanzar(); programar(); }
      catch (error) { fase = "error"; mensaje.textContent = "No se pudo continuar: " + error.message + " Reinicia la ejecución."; actualizarControles(); }
    }, 30);
  }
  function iniciar() {
    if (bloqueada() || !EvoRuta.datos.validar().valido) return;
    const campos = [obtener("poblacion"), obtener("generaciones"), obtener("mutacion")];
    if (!campos.every(function (campo) { return campo.reportValidity(); })) return;
    try {
      // Consultar referencias nunca vuelve a sortearlas si el escenario no cambió.
      obtener("ejecutar").click();
      const escenario = EvoRuta.datos.escenario;
      ejecucion = EvoRuta.genetico.crearEjecucion({ almacen: escenario.almacen, destinos: escenario.destinos,
        referencia: EvoRuta.resultados.obtener().aleatoria.ruta, poblacion: Number(campos[0].value),
        generaciones: Number(campos[1].value), probabilidadMutacion: Number(campos[2].value) / 100 });
      estado = ejecucion.obtenerEstado();
      fase = estado.terminado ? "terminada" : "ejecutando";
      bloquearEdicion(true);
      mensaje.textContent = estado.terminado ? "Ejecución terminada en generación 0. Reinicia para configurar otra búsqueda." : "Evolución en curso. Puedes pausar para inspeccionar o avanzar paso a paso.";
      mostrar(); programar();
    } catch (error) { mensaje.textContent = error.message; }
  }
  function reiniciar() {
    if (EvoRuta.animacion) EvoRuta.animacion.detener(false);
    cancelarTemporizador();
    ejecucion = null; estado = null; fase = "lista";
    bloquearEdicion(false);
    mensaje.textContent = "Lista para una nueva ejecución. Se conservan el escenario y sus referencias vigentes.";
    mostrar();
  }
  obtener("iniciar").addEventListener("click", iniciar);
  obtener("pausar").addEventListener("click", function () {
    if (fase !== "ejecutando") return;
    cancelarTemporizador(); fase = "pausada"; mensaje.textContent = "En pausa. La edición permanece bloqueada; continúa, avanza una generación o reinicia."; actualizarControles();
  });
  obtener("continuar").addEventListener("click", function () {
    if (fase !== "pausada") return;
    fase = "ejecutando"; mensaje.textContent = "Evolución en curso."; actualizarControles(); programar();
  });
  obtener("paso").addEventListener("click", function () {
    if (fase !== "pausada") return;
    try { avanzar(); } catch (error) { fase = "error"; mensaje.textContent = error.message + " Reinicia la ejecución."; actualizarControles(); }
  });
  obtener("reiniciar").addEventListener("click", reiniciar);
  return { bloqueada: bloqueada, reiniciar: reiniciar, actualizarControles: actualizarControles,
    porcentaje: porcentaje, describirMejora: describirMejora };
})();
