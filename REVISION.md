# Revisión de EvoRuta

Se corrigieron dos errores, sin incorporar funciones:

- Al finalizar una animación quedaba dibujada su ruta aunque se eligiera otro
  método en el filtro. Ahora se elimina la capa temporal al completar el regreso
  al almacén; los resultados permanecen intactos.
- Una diferencia muy pequeña podía mostrarse como «-0.00 % · más larga».
  Las comparaciones y la tabla ahora explican que es inferior a 0.01 % cuando
  redondearía a cero. Se mantienen los valores completos para las estadísticas.

## Pruebas ejecutadas

32 pruebas de Node, todas correctas:

```powershell
node tests/rutas.test.cjs
node tests/escenario.test.cjs
node tests/genetico.test.cjs
node tests/animacion-didactica.test.cjs
node tests/experimentos.test.cjs
```

Incluyen escenarios de 8 y 30 destinos; límites, edición y colisiones; distancias
con regreso al almacén; OX, intercambio, torneo, elitismo, generación 0 y tamaño
constante; registros didácticos reales; porcentajes positivos, negativos, cero
y diferencias pequeñas. Se verifica invariancia de coordenadas y distancias
ante cambios simulados de tamaño y densidad de píxeles.

La integración usa DOM, canvas y reloj simulados. Carga los scripts en el orden
de index.html y comprueba que los IDs solicitados existan en ese archivo. Cubre
inicio, pausa, continuación, paso, fin, reinicio con callbacks pendientes,
animación de los tres métodos, repetición y limpieza de resultados e historial
al editar. Comprueba que no se dupliquen callbacks al repetir pulsaciones.
El caso de 30 destinos utiliza población 300.

También pasaron la comprobación de sintaxis de todos los JS, referencias locales
existentes, IDs únicos, ausencia de cargas externas detectadas y git diff --check.

## Revisado por código, sin validación visual

- index.html usa scripts clásicos con defer y rutas relativas locales; no requiere
  compilación ni servidor. No hay fuentes remotas, peticiones de red ni CDN.
- CSS adapta columnas a pantallas pequeñas, permite envolver los cromosomas y
  mantiene la tabla dentro de una región con desplazamiento horizontal.
- Hay etiquetas de controles, foco visible, mensajes de estado y alternativa
  numérica al arrastre. Las rutas se distinguen por patrones además de color.

## Pendiente de comprobar manualmente

La política del navegador del entorno bloqueó el acceso a archivos locales.
No se ejecutaron las suites *.browser.cjs ni se certifica la apertura real por
file://, el diseño visual o la interacción táctil a partir de las pruebas simuladas.

1. Abrir index.html directamente, sin conexión, y verificar consola sin errores.
2. Revisar a 320, 390, 760 y 1366 píxeles: texto legible, botones completos,
   tabla desplazable, cromosomas sin recortes y página sin desbordamiento lateral.
3. Arrastrar destinos y almacén con mouse y toque; probar el editor con teclado.
4. Iniciar, pausar, avanzar, continuar y reiniciar. Repetir una ejecución y luego
   editar: comprobar la limpieza de métricas, gráfica, ejemplo e historial.
5. Animar cada método hasta volver al almacén, comprobar que desaparezca la capa
   temporal y cambiar el filtro. Detener y reiniciar durante una animación.
6. Revisar los resaltados del cruce y la mutación con 30 destinos y el foco al
   navegar con teclado. Comprobar zoom de navegador al 200 %.
