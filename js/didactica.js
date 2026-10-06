"use strict";

EvoRuta.didactica = (function () {
  const contenido = document.getElementById("ejemplo-reproduccion");
  function mostrar(ejemplo) {
    contenido.replaceChildren();
    function texto(valor) {
      const p = document.createElement("p"); p.textContent = valor; contenido.appendChild(p);
    }
    if (!ejemplo) {
      texto("Aún no hubo reproducción. Avanza desde la generación 0 para ver un ejemplo real.");
      return;
    }
    const destinos = EvoRuta.datos.escenario.destinos;
    if (![ejemplo.padre, ejemplo.madre, ejemplo.antes, ejemplo.despues].every(function (ruta) {
      return EvoRuta.rutas.validarRuta(ruta, destinos);
    })) {
      texto("El ejemplo ya no corresponde al escenario actual."); return;
    }
    const izquierda = ejemplo.cortes[0], derecha = ejemplo.cortes[1];
    texto("Generación " + ejemplo.generacion + ": primer descendiente incorporado. Pausa la evolución para examinarlo.");
    texto("OX: cortes en las posiciones " + (izquierda + 1) + " y " + (derecha + 1) + ", incluidas. Copiamos ese tramo del padre 1.");
    texto("Desde después del segundo corte, completamos circularmente con el orden del padre 2, sin repetir destinos.");
    function fila(titulo, ruta, herencia, intercambio) {
      const h = document.createElement("h3"); h.textContent = titulo; contenido.appendChild(h);
      const lista = document.createElement("div"); lista.className = "cromosoma";
      ["A"].concat(ruta, "A").forEach(function (id, indice) {
        const posicion = indice - 1;
        const celda = document.createElement("span");
        const heredado = herencia && posicion >= izquierda && posicion <= derecha;
        const cambiado = intercambio && intercambio.includes(posicion);
        celda.className = "gen" + (heredado ? " heredado" : "") + (cambiado ? " intercambiado" : "");
        celda.textContent = id + (posicion >= 0 && posicion < ruta.length ? " · " + (posicion + 1) : "") +
          (cambiado ? " ↔" : "");
        celda.setAttribute("aria-label", id + (heredado ? ", tramo heredado" : "") + (cambiado ? ", posición intercambiada" : ""));
        lista.appendChild(celda);
      });
      contenido.appendChild(lista);
    }
    fila("Padre 1 · tramo heredado resaltado", ejemplo.padre, true, null);
    fila("Padre 2 · orden para completar", ejemplo.madre, false, null);
    fila("Hija antes de mutar · tramo heredado resaltado", ejemplo.antes, true, ejemplo.intercambio);
    if (ejemplo.intercambio) texto("Mutación: intercambiamos las posiciones " + (ejemplo.intercambio[0] + 1) + " y " + (ejemplo.intercambio[1] + 1) + ", marcadas con ↔.");
    else texto("No hubo mutación en esta hija: la ruta se conserva.");
    fila("Hija después de mutar", ejemplo.despues, false, ejemplo.intercambio);
    texto("Cada ruta visita todos los destinos una vez. A es el almacén fijo al inicio y al final; los números indican posiciones.");
  }
  mostrar(null);
  return { mostrar: mostrar };
})();
