// Verificación opcional: recibe la ruta de una instalación existente de Playwright.
// EvoRuta no necesita esta herramienta para funcionar ni se instala nada aquí.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async function () {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const errores = [], externos = [];
    page.on('pageerror', error => errores.push(error.message));
    page.on('console', mensaje => { if (mensaje.type() === 'error') errores.push(mensaje.text()); });
    page.on('request', solicitud => { if (/^https?:/.test(solicitud.url())) externos.push(solicitud.url()); });
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
    // Reloj controlado: prueba determinista de pausa y temporizadores duplicados.
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.locator('#generaciones').fill('5');
    await page.locator('#poblacion').fill('12');
    await page.locator('#ejecutar').click();
    const referencias = await page.evaluate(() => EvoRuta.resultados.obtener());
    const escenario = await page.evaluate(() => JSON.stringify(EvoRuta.datos.escenario));
    await page.evaluate(() => {
      window.historialObservado = [];
      const actualizar = EvoRuta.grafica.actualizar;
      EvoRuta.grafica.actualizar = function (historial) {
        window.historialObservado = JSON.parse(JSON.stringify(historial));
        actualizar(historial);
      };
      document.getElementById('iniciar').click();
      document.getElementById('iniciar').click();
      document.getElementById('pausar').click();
    });
    assert.equal(await page.locator('#generacion-actual').textContent(), '0');
    assert.equal(await page.locator('#poblacion').isDisabled(), true);
    assert.equal(await page.locator('#restablecer').isDisabled(), true);
    await page.evaluate(() => {
      const canvas = document.getElementById('plano');
      const rect = canvas.getBoundingClientRect();
      const lado = Math.min(rect.width - 76, rect.height - 62);
      const x = rect.left + (rect.width - lado) / 2 + 19 * lado / 100;
      const y = rect.top + (rect.height - lado) / 2 - 5 + 24 * lado / 100;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, isPrimary: true, button: 0, pointerId: 1 }));
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: x + 30, clientY: y + 20, isPrimary: true, pointerId: 1 }));
      document.getElementById('agregar-centro').dispatchEvent(new Event('click'));
      document.getElementById('restablecer').dispatchEvent(new Event('click'));
    });
    assert.equal(await page.evaluate(() => JSON.stringify(EvoRuta.datos.escenario)), escenario);
    await page.clock.runFor(300);
    assert.equal(await page.locator('#generacion-actual').textContent(), '0');
    await page.locator('#paso').click();
    assert.equal(await page.locator('#generacion-actual').textContent(), '1');
    await page.clock.runFor(300);
    assert.equal(await page.locator('#generacion-actual').textContent(), '1');
    await page.evaluate(() => {
      document.getElementById('continuar').click();
      document.getElementById('continuar').click();
    });
    await page.clock.runFor(31);
    assert.equal(await page.locator('#generacion-actual').textContent(), '2');
    await page.clock.runFor(400);
    assert.equal(await page.locator('#generacion-actual').textContent(), '5');
    assert.equal(await page.locator('#paso').isDisabled(), true);
    assert.equal(await page.locator('#continuar').isDisabled(), true);
    const datos = await page.evaluate(() => {
      const ruta = document.getElementById('orden-genetico').textContent.split(' → ').slice(1, -1);
      return { historial: historialObservado, distancia: EvoRuta.rutas.distanciaTotal(ruta, EvoRuta.datos.escenario.almacen, EvoRuta.datos.escenario.destinos),
        porcentajeNegativo: EvoRuta.simulacion.describirMejora(100, 125),
        cero: EvoRuta.simulacion.describirMejora(0, 0) };
    });
    assert.equal(datos.historial.length, 6);
    assert.equal(datos.historial.at(-1).distancia, datos.distancia);
    assert.equal(await page.locator('#distancia-genetico').textContent(), datos.distancia.toFixed(2));
    for (let i = 1; i < datos.historial.length; i++) assert.ok(datos.historial[i].distancia <= datos.historial[i - 1].distancia);
    assert.match(datos.porcentajeNegativo, /-25.00%.*más larga/);
    assert.match(datos.cero, /No calculable/);
    for (const metodo of ['aleatoria', 'vecino']) {
      const mejora = ((referencias[metodo].distancia - datos.distancia) / referencias[metodo].distancia * 100).toFixed(2);
      assert.ok((await page.locator('#mejora-' + metodo).textContent()).includes(mejora + '%'));
    }
    for (const width of [1366, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('#distancia-genetico').textContent(), datos.distancia.toFixed(2));
    }
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'simulacion-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1366, height: 1000 });
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'simulacion-desktop.png'), fullPage: true });
    await page.locator('#reiniciar').click();
    assert.equal(await page.locator('#distancia-genetico').textContent(), '—');
    assert.equal(await page.locator('#poblacion').isDisabled(), false);
    assert.deepEqual(await page.evaluate(() => historialObservado), []);
    assert.deepEqual(await page.evaluate(() => EvoRuta.resultados.obtener()), referencias);
    assert.equal(await page.evaluate(() => JSON.stringify(EvoRuta.datos.escenario)), escenario);
    // Reiniciar mientras corre cancela el callback pendiente.
    await page.evaluate(() => { document.getElementById('iniciar').click(); document.getElementById('reiniciar').click(); });
    await page.clock.runFor(500);
    assert.equal(await page.locator('#generacion-actual').textContent(), '—');
    await page.locator('#generaciones').fill('0');
    await page.locator('#iniciar').click();
    assert.equal(await page.locator('#generacion-actual').textContent(), '0');
    assert.equal(await page.locator('#pausar').isDisabled(), true);
    assert.equal(await page.evaluate(() => historialObservado.length), 1);
    await page.locator('#reiniciar').click();
    // Una edición posterior limpia las tres métricas.
    await page.locator('summary').click();
    await page.locator('#coordenada-x').fill('51');
    await page.locator('#aplicar').click();
    assert.equal(await page.locator('#distancia-aleatoria').textContent(), '—');
    assert.equal(await page.locator('#distancia-genetico').textContent(), '—');
    // También se comprueba la integración con el máximo de destinos y población.
    await page.evaluate(() => {
      for (let i = 0; i < 22; i++) EvoRuta.datos.agregar(i, 0);
      EvoRuta.resultados.actualizar();
    });
    await page.locator('#generaciones').fill('2');
    await page.locator('#poblacion').fill('300');
    await page.locator('#iniciar').click();
    await page.clock.runFor(200);
    assert.equal(await page.locator('#generacion-actual').textContent(), '2');
    assert.equal((await page.locator('#orden-genetico').textContent()).split(' → ').length, 32);
    assert.equal(await page.evaluate(() => historialObservado.length), 3);
    assert.deepEqual(errores, []);
    assert.deepEqual(externos, []);
    console.log('PASS: controles, generación 0, pausa, paso, continuación sin duplicados, fin exacto, reinicio, métricas e historial, negativos, file:// offline y diseño adaptable.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
