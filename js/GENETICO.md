# Motor genético de EvoRuta

Cargar `rutas.js` y después `genetico.js`. Ninguno necesita el DOM. La interfaz
usa `crearEjecucion(opciones)`, `obtenerEstado()` y `avanzar()` para procesar una
generación por turno y permitir pausa, continuación y avance manual.

```js
const resultado = EvoRuta.genetico.ejecutar({
  almacen: escenario.almacen,
  destinos: escenario.destinos,
  referencia: rutaAleatoriaDeReferencia,
  poblacion: 60,
  generaciones: 150,
  probabilidadMutacion: 0.15
});
// resultado.mejor: { ruta: [IDs de destinos], distancia }
// resultado.historial: [{ generacion: 0, distancia }, ..., { generacion: 150, distancia }]
// resultado.poblacion: población final evaluada
```

Cada ruta excluye el almacén: la evaluación añade los tramos de salida y regreso.
La referencia aleatoria se copia como primer individuo y los restantes se generan
con Fisher–Yates. No se consulta ni se inyecta la ruta del vecino más cercano.

Cada reproducción selecciona dos padres mediante torneos de tres participantes
con reemplazo, aplica OX con dos cortes distintos e inclusivos y decide la mutación
por descendiente. La mutación intercambia exactamente dos posiciones distintas.
Se conserva un élite global sin modificar y se limita la inserción de hijos para
mantener el tamaño incluso en poblaciones impares. Pueden repetirse individuos.

Se evalúa la población completa antes de registrar la generación 0. El historial
contiene la mejor distancia global, no el promedio, y tiene `generaciones + 1`
entradas. Incluir la referencia y conservar el élite garantiza un resultado no
peor que esa referencia; no garantiza superar al vecino más cercano ni encontrar
el óptimo. No hay rutas óptimas precalculadas.

Opciones de prueba: `azar` puede ser un generador con semilla que devuelva valores
en `[0, 1)`; `alGeneracion` recibe copias de `{ generacion, mejor, poblacion }`.
`ejecutar(opciones)` conserva la ejecución síncrona completa. `crearEjecucion`
evalúa la generación 0; cada llamada a `avanzar()` produce una generación y se
detiene en el límite configurado. `obtenerEstado()` devuelve copias del estado,
incluidos `generacion` y `terminado`. La interfaz cede el control entre pasos.

Desde la raíz del proyecto, ejecutar las pruebas sin dependencias:

```sh
node tests/genetico.test.cjs
node tests/rutas.test.cjs
node tests/escenario.test.cjs
```
