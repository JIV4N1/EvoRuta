const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const contexto = { window: {} };
contexto.window = contexto;
vm.createContext(contexto);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/rutas.js'), 'utf8'), contexto);
const rutas = contexto.EvoRuta.rutas;

test('Distancia conocida: triángulo 3-4-5 incluye los tres lados y el regreso', () => {
  const almacen = { x: 0, y: 0 };
  const destinos = [{ id: 'D1', x: 3, y: 0 }, { id: 'D2', x: 3, y: 4 }];
  assert.equal(rutas.distanciaEuclidiana(almacen, destinos[1]), 5);
  assert.equal(rutas.distanciaTotal(['D1', 'D2'], almacen, destinos), 12);
  assert.equal(rutas.distanciaTotal(['D2', 'D1'], almacen, destinos), 12);
  assert.equal(rutas.distanciaTotal([], almacen, []), 0);
  assert.equal(rutas.distanciaTotal(['D1'], almacen, destinos.slice(0, 1)), 6);
});

test('Validación rechaza faltantes, repeticiones, almacén e IDs ajenos', () => {
  const destinos = [{ id: 'D1', x: 1, y: 0 }, { id: 'D9', x: 2, y: 0 }];
  assert.equal(rutas.validarRuta(['D9', 'D1'], destinos), true);
  for (const ruta of [null, [], ['D1'], ['D1', 'D1'], ['A', 'D1'], ['D1', 'D2'], ['D1', 'D9', 'D1']]) {
    assert.equal(rutas.validarRuta(ruta, destinos), false);
    assert.throws(() => rutas.distanciaTotal(ruta, { x: 0, y: 0 }, destinos));
  }
  assert.equal(rutas.validarRuta(['D1', 'D9'], [destinos[0], destinos[0]]), false);
});

test('Vecino parte del almacén y desempata por ID sin depender del orden original', () => {
  const almacen = { x: 0, y: 0 };
  const destinos = [{ id: 'D2', x: -1, y: 0 }, { id: 'D10', x: 1, y: 0 }, { id: 'D9', x: 2, y: 0 }];
  const esperado = ['D10', 'D9', 'D2'];
  assert.deepEqual(Array.from(rutas.vecinoMasCercano(almacen, destinos)), esperado);
  assert.deepEqual(Array.from(rutas.vecinoMasCercano(almacen, destinos.slice().reverse())), esperado);
});

test('Ambos métodos producen permutaciones válidas para 8 y 30 sin mutar los datos', () => {
  for (const cantidad of [8, 30]) {
    const destinos = Array.from({ length: cantidad }, (_, i) => ({ id: 'D' + (i * 2 + 1), x: i, y: i % 7 }));
    const antes = JSON.stringify(destinos);
    for (const azar of [() => 0, () => 0.5, () => 0.999999]) {
      assert.equal(rutas.validarRuta(rutas.aleatoria(destinos, azar), destinos), true);
    }
    assert.equal(rutas.validarRuta(rutas.vecinoMasCercano({ x: 50, y: 49 }, destinos), destinos), true);
    assert.equal(JSON.stringify(destinos), antes);
  }
});
