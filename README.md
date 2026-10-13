# EvoRuta · versión con red vial

Planificador académico de reparto comunitario: un almacén, de **8 a 30 destinos** y regreso al almacén. Compara una ruta aleatoria, vecino más cercano y nuestro algoritmo genético sobre una misma matriz vial dirigida. El ejemplo inicial contiene coordenadas sobre calles de Tehuacán, Puebla; no representa domicilios de beneficiarios ni entregas reales.

## Iniciar en Windows

Necesitas **Node.js 22 o posterior**, un navegador moderno e internet. No hay paquetes npm que instalar.

1. Abre una terminal en esta copia:
   ~~~powershell
   cd C:\evoruta
   node servidor.cjs
   ~~~
2. Abre **http://127.0.0.1:8080**.
3. Mantén la terminal abierta. Detén el servidor con Ctrl+C.

También puedes ejecutar **iniciar.cmd**. Esta versión conectada ya no funciona abriendo index.html por file://: el servidor local integra los proveedores con caché, identificación y límite de consultas. Escucha únicamente en 127.0.0.1, no publica el proyecto en internet. Para un celular físico haría falta configurar un alojamiento adecuado; la interfaz móvil puede probarse en las herramientas de desarrollo del navegador.

## Flujo de uso

1. Busca una dirección o lugar y pulsa **Buscar lugar**; selecciona el resultado como destino o almacén. No se consulta mientras escribes. Photon prioriza Tehuacán, pero puede devolver resultados de otras ciudades: revisa el nombre y las coordenadas.
2. También puedes agregar puntos haciendo clic, arrastrarlos, eliminarlos o editar latitud/longitud. La lista permite seleccionarlos con teclado. Mover un punto descarta su nombre anterior; si no hay dirección textual se muestran coordenadas.
3. Pulsa **Obtener matriz y referencias**. Si un punto no conecta con la red vial, ajusta su ubicación y reintenta. No se permite iniciar sin una matriz completa.
4. Configura población (3–300), generaciones (0–2000) y mutación (0–100 %). Inicia, pausa, continúa o avanza una generación. La gráfica incluye la generación 0.
5. Consulta distancias en **kilómetros**, orden de visita y porcentajes. Selecciona un método y pulsa **Mostrar por calles**; la consulta respeta el orden calculado y regresa al almacén. No se consulta geometría por generación. La leyenda distingue los métodos por color y trazo; “Todos” solo dibuja geometrías ya cargadas.
6. Reproduce el carrito después de cargar su geometría. Sigue las calles; los 16 segundos de animación son ilustrativos, no tiempos reales.
7. Repite una ejecución terminada con una población nueva o reinicia para cambiar parámetros.

La edición permanece bloqueada durante una ejecución, incluida la pausa y el estado terminado, hasta reiniciar. Las consultas externas bloquean acciones incompatibles y pueden cancelarse. Cambiar coordenadas, agregar/eliminar puntos o cambiar el perfil en el estado invalida matriz, referencias, geometrías e historial. Solo se ofrece el perfil automóvil; otro perfil requiere un servicio configurado y adaptar su validación, no basta con cambiar su nombre.

Reiniciar conserva escenario, matriz, referencias e historial; limpia la ejecución genética actual. Los resultados del usuario viven únicamente en memoria. La caché del servidor es también temporal y desaparece al cerrarlo. El JSON de verificación de este repositorio corresponde exclusivamente a una prueba técnica con puntos públicos.

## Cómo se calculan las rutas

La matriz incluye el almacén y todos los destinos, hasta **31 × 31 celdas**, en metros. Cada fila representa un origen y cada columna un destino. No se refleja un triángulo para completar la matriz: A→B puede ser diferente de B→A. Se suman todos los tramos, incluida salida y regreso.

OSRM devuelve la **longitud de los caminos preferidos por su perfil de conducción** (normalmente los más rápidos según su modelo), no necesariamente el camino de menor distancia de cada par. EvoRuta minimiza la suma de esas longitudes al elegir el orden de visita. No solicita a OSRM optimizar ese orden ni utiliza el servicio trip.

La matriz se valida y congela. Aleatoria, vecino y genético utilizan el mismo objeto. Una celda nula, negativa o no finita impide calcular; no hay sustitución por distancias rectas. El servicio ajusta las coordenadas a calles dentro de un radio máximo de 150 m. La interfaz informa del mayor ajuste. Los puntos del usuario no cambian de posición automáticamente: el trazado pasa por sus accesos ajustados a la red, no necesariamente por la puerta de un edificio.

El genético conserva permutaciones, torneo de tres, cruce OX, mutación por intercambio y un élite global. Incluye la referencia aleatoria en la población inicial; vecino permanece independiente. La optimización y sus generaciones ocurren en el navegador, sin consultas externas. La vista didáctica muestra un descendiente realmente incorporado.

~~~text
mejora (%) = ((distancia de referencia − distancia genética) / distancia de referencia) × 100
~~~

Una mejora negativa significa una ruta genética más larga. No se oculta ni se recorta a cero. Todos los cálculos conservan precisión; solo se redondea al mostrar (km con tres decimales). El azar puede producir resultados diferentes. No se garantiza el óptimo ni superar al vecino. El promedio incluye todas las ejecuciones completas registradas, incluso con distintos parámetros.

Antes de mostrar una geometría se comparan sus tramos con los de la matriz (tolerancia: 2 m o 0.1 % por tramo, lo mayor). Si difieren, se informa y no se dibuja como equivalente. Las respuestas de un escenario anterior se descartan.

## Servicios, configuración y atribución

La configuración predeterminada está en **config.example.json**, sin secretos. Opcionalmente cópiala como **config.local.json** y cambia las direcciones del proveedor, puerto o identificación. Se carga al iniciar el servidor; reinícialo tras cambiarla. config.local.json se ignora en Git y no se sirve al navegador.

| Función | Proveedor predeterminado | Condiciones y alcance |
| --- | --- | --- |
| Mapa | OpenStreetMap Standard | Solo los mosaicos de la vista interactiva; caché HTTP del navegador, atribución visible, sin precarga ni descarga offline. |
| Búsqueda | Photon de komoot | Servidor público de demostración; uso razonable, sin garantía ni cuota contractual. Puede limitar o retirar acceso. Búsqueda explícita, caché y sin consultas automáticas. |
| Matriz y geometría | router.project-osrm.org, perfil driving | Demostración OSRM, datos OSM y cobertura de automóvil mundial anunciada por el operador. Máximo de una solicitud por segundo, sin uso intensivo ni garantía. Se comprobaron Tehuacán y 31 ubicaciones en esta sesión. |
| Interfaz cartográfica | Leaflet 1.9.4 local | Licencia BSD-2-Clause incluida en vendor/leaflet/LICENSE. No se carga JavaScript desde un CDN al usar la aplicación. |

El servidor serializa las consultas de ambos proveedores, separa sus inicios al menos **1100 ms**, agrupa solicitudes idénticas y conserva hasta 100 respuestas durante una hora en memoria. Limita la cola y comunica HTTP 429, fallos de red y tiempos agotados; no reintenta en bucle. Una instalación local no debe replicarse masivamente para eludir los límites agregados de los servicios públicos.

El proxy es necesario para controlar estas reglas en un solo lugar, identificar la aplicación con User-Agent y evitar depender de las políticas CORS de cada proveedor. El navegador consulta el mismo origen local. Se observó Access-Control-Allow-Origin: * en OSRM durante la validación, pero la integración no depende de ello; no se presupone CORS de Photon. Los mosaicos son imágenes directas y mantienen el Referer y la caché del navegador.

No hacen falta claves con esta configuración. No coloques claves privadas en HTML, JavaScript público ni URLs de mosaicos; un proveedor que exija autenticación necesita adaptar el módulo de servidor. Las URLs configurables deben hablar la API de OSRM o Photon, respectivamente; no son intercambiables con cualquier API comercial.

**Privacidad:** búsquedas y coordenadas salen hacia Photon/OSRM; las solicitudes del mapa llegan a OSM. Los proveedores pueden registrar solicitudes. Usa ubicaciones públicas de ejemplo, sin datos personales ni información confidencial. EvoRuta no guarda datos de usuario en disco, no incluye cuentas ni base de datos.

Documentación oficial consultada el 12 de octubre de 2026:

- [API OSRM: matriz y rutas](https://project-osrm.org/docs/v5.24.0/api/).
- [Política de OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy), que remite al [operador FOSSGIS](https://routing.openstreetmap.de/about.html). La política alemana enlazada por el operador presentó un desafío de acceso en esta revisión; se consultó su resumen oficial.
- [Photon: uso del servidor de demostración](https://github.com/komoot/photon#demo-server) y [API](https://github.com/komoot/photon/blob/master/docs/api-v1.md).
- [Uso de mosaicos OSM](https://operations.osmfoundation.org/policies/tiles/) y [datos, atribución y ODbL](https://www.openstreetmap.org/copyright).
- [Leaflet y descarga](https://leafletjs.com/download.html).

No hay una garantía contractual pública de capacidad de 31 puntos. Si el servidor empieza a rechazarla (por ejemplo TooBig), EvoRuta lo informa; no reduce destinos ni envía cientos de peticiones por pares. Para uso sostenido configura una instancia OSRM propia con datos de México y perfil car, preparada para table con annotations=distance y al menos 31 ubicaciones (y 32 waypoints en route para el retorno). La documentación OSRM muestra matrices de distancia con CH; verifica la capacidad de tu instalación. Photon también admite alojamiento propio. No se instalaron estos servidores ni se realizó ningún despliegue.

## Código

| Archivo | Responsabilidad |
| --- | --- |
| index.html / css/styles.css | Interfaz adaptable y estilos |
| js/datos.js | Coordenadas, identificadores, límites y firma del escenario |
| js/matriz.js / js/rutas.js | Matriz inmutable dirigida, suma y referencias |
| js/genetico.js | Motor evolutivo puro, sin DOM ni red |
| js/servicios.js | Consultas, exclusión, cancelación y tiempos de espera |
| js/dibujo.js / js/interaccion.js | Leaflet, puntos, búsqueda y edición |
| js/resultados.js | Matriz, referencias, caché de geometrías e invalidación |
| js/simulacion.js | Estados, temporizador único y controles genéticos |
| js/grafica.js / js/didactica.js | Historial por generaciones y operadores |
| js/animacion.js / js/experimentos.js | Vehículo vial y repeticiones en memoria |
| servidor.cjs / servidor/proveedor.cjs | Servidor local y adaptación de proveedores |
| vendor/leaflet | Dependencia cartográfica y licencia |
| tests | Pruebas sintéticas, navegador y comprobación real voluntaria |

La API del motor se describe en [js/GENETICO.md](js/GENETICO.md). REVISION.md y el manual Word preexistente describen la versión anterior; no deben utilizarse como instrucciones de instalación de esta versión.

## Pruebas

Desde la raíz:

~~~powershell
node --test tests/*.test.cjs
~~~

Las pruebas no requieren paquetes adicionales ni consultan proveedores reales. Utilizan matrices sintéticas identificadas como tales. Cubren datos, asimetría, retorno, permutaciones, operadores, elitismo, porcentajes, estadísticas, caché y errores.

La suite de navegador requiere **Playwright y Chromium ya instalados** (solo para desarrollo):

~~~powershell
$env:PLAYWRIGHT_PATH = 'C:\ruta\a\node_modules\playwright'
node tests/simulacion.browser.cjs
~~~

Levanta un servidor local temporal, simula proveedores y mosaicos, comprueba 8/30 destinos, estados, repetición, métricas, invalidación, errores, respuestas tardías y anchura móvil. Guarda capturas de escritorio y móvil en tests (ignoradas por Git). No utiliza mapas públicos para pruebas automatizadas visuales. experimentos.browser.cjs es una entrada equivalente a la misma suite; basta ejecutarla una vez.

Comprobación real **voluntaria**, con pocas consultas públicas y sin mosaicos:

~~~powershell
node tests/servicios.live.cjs
~~~

No ejecutarla repetidamente ni en CI. La prueba registrada se encuentra en **tests/verificacion-real.json**, con fecha UTC, coordenadas, proveedor, perfil y resultados de una ejecución por tamaño. Se ejecutaron 50 generaciones con 60 individuos; no es un estudio comparativo ni demuestra superioridad. El genético fue más largo que vecino en el ensayo de 30 destinos.

Validado durante esta implementación: 32 pruebas originales antes de modificar; suite unitaria adaptada; Chromium con servicios simulados en escritorio y 390 px; búsqueda Photon real; matrices OSRM 9×9 y 31×31; evolución local y geometrías reales coincidentes en todos sus tramos. La inspección visual automatizada utilizó fondo de mapa simulado. Queda comprobar manualmente mosaicos reales, arrastre táctil en dispositivo físico y disponibilidad futura de los servicios.

## Límites

Proyecto académico para comparar algoritmos, no sistema logístico de producción. Datos OSM pueden estar incompletos o desactualizados; no se consideran tráfico en vivo, cierres recientes, capacidad, horarios ni varias unidades de reparto. Los accesos ajustados a calles no equivalen a entradas verificadas de domicilios. Internet y los proveedores son necesarios para búsquedas, matriz y geometría; una matriz ya cargada permite continuar la evolución localmente aunque se interrumpa internet.
