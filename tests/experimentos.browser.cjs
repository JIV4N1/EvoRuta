// Usa Playwright ya instalado, como las otras comprobaciones de navegador.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.locator('#generaciones').fill('2');
    await page.locator('#poblacion').fill('12');
    // Semilla solo en esta prueba: permite comprobar poblaciones nuevas de forma reproducible.
    await page.evaluate(() => {
      let semilla = 42;
      Math.random = () => ((semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0) / 4294967296);
      window.poblaciones = [];
      const crear = EvoRuta.genetico.crearEjecucion;
      EvoRuta.genetico.crearEjecucion = function (opciones) {
        const motor = crear(opciones);
        poblaciones.push(motor.obtenerEstado().poblacion);
        return motor;
      };
    });
    await page.locator('#iniciar').click();
    await page.clock.runFor(100);
    assert.equal(await page.locator('#cantidad-ejecuciones').textContent(), '1');
    const escenario = await page.evaluate(() => JSON.stringify(EvoRuta.datos.escenario));
    const referencias = await page.evaluate(() => EvoRuta.resultados.obtener());
    await page.locator('#repetir').click();
    await page.clock.runFor(100);
    assert.equal(await page.locator('#cantidad-ejecuciones').textContent(), '2');
    const poblaciones = await page.evaluate(() => poblaciones);
    assert.notDeepEqual(poblaciones[0], poblaciones[1]);
    assert.deepEqual(poblaciones[0][0].ruta, referencias.aleatoria.ruta);
    assert.deepEqual(poblaciones[1][0].ruta, referencias.aleatoria.ruta);
    assert.equal(await page.evaluate(() => JSON.stringify(EvoRuta.datos.escenario)), escenario);
    assert.deepEqual(await page.evaluate(() => EvoRuta.resultados.obtener()), referencias);
    await page.clock.runFor(500);
    assert.equal(await page.locator('#cantidad-ejecuciones').textContent(), '2');
    // Interrumpir una ejecución no crea una fila.
    await page.evaluate(() => { document.getElementById('repetir').click(); document.getElementById('pausar').click(); document.getElementById('reiniciar').click(); });
    assert.equal(await page.locator('#cantidad-ejecuciones').textContent(), '2');
    await page.locator('#poblacion').fill('15');
    await page.locator('#generaciones').fill('0');
    await page.locator('#iniciar').click();
    const registros = await page.evaluate(() => EvoRuta.experimentos.obtener());
    assert.equal(registros.length, 3);
    assert.equal(registros[2].parametros.poblacion, 15);
    assert.equal(registros[2].parametros.generaciones, 0);
    const promedio = registros.reduce((suma, r) => suma + r.distancia, 0) / 3;
    assert.equal(await page.locator('#promedio-experimentos').textContent(), promedio.toFixed(2));
    assert.equal(await page.locator('#mejor-experimentos').textContent(), Math.min(...registros.map(r => r.distancia)).toFixed(2));
    for (const r of registros) {
      assert.equal(r.mejoraAleatoria, (referencias.aleatoria.distancia - r.distancia) / referencias.aleatoria.distancia * 100);
      assert.equal(r.mejoraVecino, (referencias.vecino.distancia - r.distancia) / referencias.vecino.distancia * 100);
    }
    await page.setViewportSize({ width: 320, height: 850 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.SCREENSHOT_DIR) await page.locator('.experimentos').screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'experimentos-mobile.png') });
    await page.setViewportSize({ width: 1366, height: 900 });
    if (process.env.SCREENSHOT_DIR) await page.locator('.experimentos').screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'experimentos-desktop.png') });
    await page.locator('#reiniciar').click();
    await page.locator('summary').click();
    // Un movimiento rechazado conserva el historial; uno válido lo elimina.
    await page.locator('#coordenada-x').fill('19');
    await page.locator('#coordenada-y').fill('76');
    await page.locator('#aplicar').click();
    assert.equal(await page.locator('#cantidad-ejecuciones').textContent(), '3');
    await page.locator('#coordenada-x').fill('51');
    await page.locator('#aplicar').click();
    assert.equal(await page.locator('#cantidad-ejecuciones').textContent(), '0');
    assert.match(await page.locator('#aviso-experimentos').textContent(), /se eliminó el historial/);
    await page.locator('#iniciar').click();
    assert.equal(await page.locator('#cantidad-ejecuciones').textContent(), '1');
    await page.reload();
    assert.equal(await page.locator('#cantidad-ejecuciones').textContent(), '0');
    assert.deepEqual(errores, []);
    console.log('PASS: repetición, nuevas poblaciones, referencias fijas, registro único, interrupción, generación 0, parámetros, métricas, limpieza por edición, recarga y diseño móvil.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
