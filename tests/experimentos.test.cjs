const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function iniciar() {
  const elementos = new Map();
  function elemento() { return { textContent: '', children: [], setAttribute() {}, replaceChildren() { this.children = []; }, appendChild(hijo) { this.children.push(hijo); } }; }
  const document = { createElement: elemento, getElementById(id) { if (!elementos.has(id)) elementos.set(id, elemento()); return elementos.get(id); } };
  const contexto = vm.createContext({ EvoRuta: {}, document });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/experimentos.js'), 'utf8'), contexto);
  return { historial: contexto.EvoRuta.experimentos, document };
}
test('Registros, porcentajes negativos y promedio conservan precisión y copias', () => {
  const { historial, document } = iniciar();
  const parametros = { poblacion: 60, generaciones: 150, probabilidadMutacion: 0.15 };
  const referencias = { aleatoria: { distancia: 200 }, vecino: { distancia: 100 } };
  historial.registrar(parametros, 125, referencias);
  historial.registrar({ ...parametros, poblacion: 80 }, 100.12345, referencias);
  const registros = historial.obtener();
  assert.equal(registros[0].mejoraAleatoria, 37.5);
  assert.equal(registros[0].mejoraVecino, -25);
  assert.equal(registros[1].numero, 2);
  assert.equal(historial.resumen().mejor, 100.12345);
  assert.equal(historial.resumen().promedio, (125 + 100.12345) / 2);
  assert.match(document.getElementById('ejecuciones-registradas').children[0].children[6].textContent, /-25.00%.*más larga/);
  parametros.poblacion = 999;
  registros[0].parametros.poblacion = 1000;
  assert.equal(historial.obtener()[0].parametros.poblacion, 60);
});
test('Limpiar reinicia estadísticas y numeración, avisa y no guarda datos entre sesiones', () => {
  const { historial, document } = iniciar();
  const referencias = { aleatoria: { distancia: 0 }, vecino: { distancia: 0 } };
  historial.registrar({ poblacion: 3, generaciones: 0, probabilidadMutacion: 0 }, 0, referencias);
  assert.equal(historial.obtener()[0].mejoraAleatoria, null);
  historial.limpiarPorCambio();
  assert.equal(historial.resumen().cantidad, 0);
  assert.equal(historial.resumen().promedio, null);
  assert.equal(historial.resumen().mejor, null);
  assert.match(document.getElementById('aviso-experimentos').textContent, /se eliminó el historial/);
  historial.registrar({ poblacion: 3, generaciones: 0, probabilidadMutacion: 0 }, 0, referencias);
  assert.equal(historial.obtener()[0].numero, 1);
  assert.equal(iniciar().historial.obtener().length, 0);
});
