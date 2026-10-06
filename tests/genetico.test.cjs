const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function motor() {
  const contexto = vm.createContext({}); // Sin window ni document.
  for (const nombre of ['rutas', 'genetico']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', nombre + '.js'), 'utf8'), contexto);
  return contexto.EvoRuta;
}
function azarSemilla(semilla) {
  return () => ((semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function escenario(n = 8) {
  const destinos = Array.from({ length: n }, (_, i) => ({ id: 'D' + (i * 2 + 1), x: (i * 17) % 101, y: (i * 29) % 101 }));
  return { almacen: { id: 'A', x: 50, y: 49 }, destinos, referencia: destinos.map(p => p.id).reverse() };
}

test('OX conserva el segmento y completa circularmente en el orden del otro padre', () => {
  const { genetico: g } = motor();
  const padre = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const madre = ['3', '7', '5', '1', '6', '8', '2', '4'];
  const valores = [0.25, 0.5]; // Cortes inclusivos 2 y 4.
  const hijos = g.cruceOX(padre, madre, () => valores.shift());
  assert.deepEqual(Array.from(hijos[0]), ['1', '6', '3', '4', '5', '8', '2', '7']);
  assert.deepEqual(Array.from(hijos[1]), ['3', '4', '5', '1', '6', '7', '8', '2']);
  assert.deepEqual(padre, ['1', '2', '3', '4', '5', '6', '7', '8']);
});

test('Cruce y mutación preservan permutaciones para todos los tamaños 8–30', () => {
  const { genetico: g, rutas: r } = motor();
  const azar = azarSemilla(123);
  for (let n = 8; n <= 30; n++) {
    const { destinos } = escenario(n);
    for (let intento = 0; intento < 40; intento++) {
      const padre = r.aleatoria(destinos, azar), madre = r.aleatoria(destinos, azar);
      const antes = JSON.stringify([padre, madre]);
      for (const hijo of g.cruceOX(padre, madre, azar)) {
        assert.equal(r.validarRuta(hijo, destinos), true);
        const mutado = g.mutarIntercambio(hijo, azar);
        assert.equal(r.validarRuta(mutado, destinos), true);
        assert.equal(mutado.filter((id, i) => id !== hijo[i]).length, 2);
      }
      assert.equal(JSON.stringify([padre, madre]), antes);
    }
  }
  assert.deepEqual(Array.from(g.mutarIntercambio(['D1', 'D2'], () => 0)), ['D2', 'D1']);
});

test('Torneo usa tres sorteos y elige la menor distancia entre los participantes', () => {
  const { genetico: g } = motor();
  const poblacion = [10, 7, 4, 1].map((distancia, i) => ({ ruta: ['D' + i], distancia }));
  const sorteos = [0, 0.25, 0.5];
  const elegido = g.torneo(poblacion, () => sorteos.shift());
  assert.equal(elegido.distancia, 4);
  assert.equal(sorteos.length, 0);
  elegido.ruta[0] = 'alterado';
  assert.equal(poblacion[2].ruta[0], 'D2');
});

test('Generación 0 incluye la referencia, evalúa toda la población y no invoca vecino', () => {
  const { genetico: g, rutas: r } = motor();
  r.vecinoMasCercano = () => { throw new Error('No debe invocarse'); };
  const entrada = escenario();
  const antes = JSON.stringify(entrada);
  const resultado = g.ejecutar({ ...entrada, generaciones: 0, azar: azarSemilla(7) });
  assert.equal(resultado.poblacion.length, 60);
  assert.deepEqual(Array.from(resultado.poblacion[0].ruta), entrada.referencia);
  assert.equal(resultado.historial.length, 1);
  assert.equal(resultado.historial[0].generacion, 0);
  assert.equal(resultado.mejor.distancia, Math.min(...resultado.poblacion.map(p => p.distancia)));
  assert.equal(JSON.stringify(entrada), antes);
});

test('Valores iniciales: 60 individuos y 150 generaciones más generación 0', () => {
  const { genetico: g } = motor();
  assert.equal(g.predeterminados.probabilidadMutacion, 0.15);
  const resultado = g.ejecutar({ ...escenario(), azar: azarSemilla(42) });
  assert.equal(resultado.poblacion.length, 60);
  assert.equal(resultado.historial.length, 151);
  assert.equal(resultado.historial.at(-1).generacion, 150);
});

test('Elitismo, tamaño constante y mejor global no creciente en cada generación', () => {
  const { genetico: g, rutas: r } = motor();
  for (const n of [8, 30]) for (const tamano of [3, 10, 11]) for (const probabilidadMutacion of [0, 0.15, 1]) {
    const entrada = escenario(n);
    let anterior = Infinity, elite = null, llamadas = 0;
    const resultado = g.ejecutar({ ...entrada, poblacion: tamano, generaciones: 20, probabilidadMutacion,
      azar: azarSemilla(n + tamano), alGeneracion({ generacion, mejor, poblacion }) {
        assert.equal(generacion, llamadas++);
        assert.equal(poblacion.length, tamano);
        for (const individuo of poblacion) {
          assert.equal(r.validarRuta(individuo.ruta, entrada.destinos), true);
          assert.equal(individuo.distancia, r.distanciaTotal(individuo.ruta, entrada.almacen, entrada.destinos));
        }
        if (elite) assert.ok(poblacion.some(p => JSON.stringify(p.ruta) === elite));
        assert.ok(mejor.distancia <= anterior);
        anterior = mejor.distancia;
        elite = JSON.stringify(mejor.ruta);
        // Las notificaciones son copias, no referencias al estado del motor.
        poblacion[0].ruta[0] = 'ajeno'; mejor.distancia = -1;
      } });
    assert.equal(llamadas, 21);
    assert.equal(resultado.mejor.distancia, anterior);
    assert.equal(resultado.historial.at(-1).distancia, anterior);
    resultado.historial.forEach((p, i, h) => { if (i) assert.ok(p.distancia <= h[i - 1].distancia); });
  }
});

test('Reproducible con la misma semilla, sin alterar las entradas', () => {
  const { genetico: g } = motor();
  const entrada = escenario(30), antes = JSON.stringify(entrada);
  const correr = () => g.ejecutar({ ...entrada, generaciones: 10, azar: azarSemilla(2026) });
  assert.deepEqual(correr(), correr());
  assert.equal(JSON.stringify(entrada), antes);
});

test('Rechaza referencias incompletas, huecos y parámetros inválidos', () => {
  const { genetico: g, rutas: r } = motor();
  const entrada = escenario();
  const huecos = entrada.referencia.slice(); delete huecos[2];
  assert.equal(r.validarRuta(huecos, entrada.destinos), false);
  for (const extra of [{ referencia: huecos }, { referencia: [] }, { poblacion: 2 }, { poblacion: 3.5 },
    { generaciones: -1 }, { generaciones: 1.5 }, { probabilidadMutacion: -0.1 }, { probabilidadMutacion: NaN },
    { probabilidadMutacion: 1.1 }, { azar: () => 1 }, { destinos: entrada.destinos.slice(1) }]) {
    assert.throws(() => g.ejecutar({ ...entrada, ...extra }));
  }
  assert.throws(() => g.cruceOX(['D1', 'D2'], ['D1', 'D3']));
  assert.throws(() => g.mutarIntercambio(['D1', 'D1']));
});
