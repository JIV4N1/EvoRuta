const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// DOM/canvas mínimos para ejecutar los módulos reales sin dependencias externas.
function iniciar() {
  class Elemento {
    constructor() { this.value = ''; this.children = []; this.listeners = {}; this.style = {}; this.dataset = {}; this.attributes = {}; }
    addEventListener(nombre, fn) { this.listeners[nombre] = fn; }
    emitir(nombre, evento = {}) { this.listeners[nombre]?.(evento); }
    setAttribute(nombre, valor) { this.attributes[nombre] = valor; }
    replaceChildren() { this.children = []; this.value = ''; }
    appendChild(opcion) { this.children.push(opcion); if (this.children.length === 1) this.value = opcion.value; }
    checkValidity() { const n = Number(this.value); return Number.isFinite(n) && n >= 0 && n <= 100 && Math.abs(n * 10 - Math.round(n * 10)) < 1e-8; }
  }
  const elementos = {};
  const obtener = id => elementos[id] ||= new Elemento();
  const canvas = obtener('plano');
  let rectangulo = { left: 37, top: 121, width: 600, height: 410 };
  canvas.getBoundingClientRect = () => rectangulo;
  canvas.parentElement = new Elemento();
  canvas.getContext = () => new Proxy({ measureText: s => ({ width: s.length * 6 }) }, { get: (o, k) => o[k] ?? (() => {}) });
  const capturas = new Set();
  canvas.setPointerCapture = id => capturas.add(id);
  canvas.hasPointerCapture = id => capturas.has(id);
  canvas.releasePointerCapture = id => capturas.delete(id);
  const botones = ['mover', 'agregar', 'eliminar'].map(modo => { const b = new Elemento(); b.dataset.modo = modo; return b; });
  const eventosVentana = {};
  const contexto = { document: { getElementById: obtener, createElement: () => new Elemento(), querySelectorAll: () => botones }, devicePixelRatio: 1, addEventListener: (n, fn) => eventosVentana[n] = fn };
  contexto.window = contexto;
  vm.createContext(contexto);
  obtener('vista-ruta').value = 'ambas';
  for (const archivo of ['datos', 'rutas', 'dibujo', 'resultados', 'interaccion']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', archivo + '.js'), 'utf8'), contexto);
  }
  function evento(x, y, extras = {}) {
    const lado = Math.max(1, Math.min(rectangulo.width - 76, rectangulo.height - 62));
    return { clientX: rectangulo.left + (rectangulo.width - lado) / 2 + x * lado / 100,
      clientY: rectangulo.top + (rectangulo.height - lado) / 2 - 5 + (100 - y) * lado / 100,
      isPrimary: true, button: 0, pointerId: 1, pointerType: 'mouse', ...extras };
  }
  return { ...contexto.EvoRuta, obtener, canvas, contexto, evento,
    modo: nombre => botones.find(b => b.dataset.modo === nombre).emitir('click'),
    redimensionar: (ancho, alto, dpr = 1) => { rectangulo = { left: 73, top: -42, width: ancho, height: alto }; contexto.devicePixelRatio = dpr; eventosVentana.resize(); } };
}

test('Permite editar de 0 a 30; solo 8 a 30 destinos son válidos', () => {
  const { datos: d } = iniciar();
  assert.equal(d.validar().valido, true);
  assert.equal(d.eliminar('A'), false);
  for (const p of d.escenario.destinos.slice()) assert.equal(d.eliminar(p.id), true);
  assert.equal(d.validar().faltantes, 8);
  for (let i = 0; i < 30; i++) {
    assert.ok(d.agregar(i, 0));
    assert.equal(d.validar().valido, i >= 7);
  }
  assert.equal(d.agregar(99, 99), null);
  assert.equal(d.escenario.destinos.length, 30);
});

test('Rechaza superposiciones con almacén y destinos después de redondear/acotar', () => {
  const { datos: d } = iniciar();
  assert.equal(d.agregar(50, 49), null);
  assert.equal(d.agregar(19.04, 76.04), null);
  assert.equal(d.mover('A', 19, 76), false);
  assert.equal(d.mover('D1', 50, 49), false);
  assert.equal(d.mover('D1', 19, 76), true);
  const borde = d.agregar(0, 100);
  assert.ok(borde);
  assert.equal(d.agregar(-1, 101), null);
  assert.equal(d.mover('A', -1, 101), false);
  assert.equal(d.escenario.almacen.x, 50);
  for (const valor of [NaN, Infinity, -Infinity]) {
    assert.equal(d.agregar(valor, 12), null);
    assert.equal(d.mover('A', 12, valor), false);
  }
});

test('Los IDs sobrevivientes no cambian y los eliminados no se reutilizan', () => {
  const { datos: d } = iniciar();
  const nuevo = d.agregar(1, 1);
  d.eliminar('D1');
  d.eliminar(nuevo.id);
  const siguiente = d.agregar(2, 2);
  assert.equal(siguiente.id, 'D10');
  assert.equal(d.escenario.destinos[0].id, 'D2');
  assert.equal(d.mover('D2', 3, 3), true);
  assert.equal(d.escenario.destinos[0].id, 'D2');
});

test('Eliminar por interfaz informa faltantes y bloquea ejecución', () => {
  const app = iniciar();
  app.modo('eliminar');
  app.canvas.emitir('pointerdown', app.evento(19, 76));
  assert.equal(app.datos.escenario.destinos.length, 7);
  assert.match(app.obtener('validacion-escenario').textContent, /Faltan 1 destino para ejecutar/);
  assert.equal(app.obtener('ejecutar').disabled, true);
  app.canvas.emitir('pointerdown', app.evento(50, 49));
  assert.match(app.obtener('estado').textContent, /No se puede eliminar el almacén/);
  app.modo('agregar');
  app.canvas.emitir('pointerdown', app.evento(10, 10));
  assert.match(app.obtener('validacion-escenario').textContent, /Escenario válido: 8/);
  assert.equal(app.obtener('ejecutar').disabled, false); // Referencias disponibles con 8 destinos.
});

for (const pointerType of ['mouse', 'touch']) {
  test(`Agregar y arrastrar destino/almacén con ${pointerType}, límites y colisiones`, () => {
    const app = iniciar();
    app.redimensionar(320, 350, 2);
    const evento = (x, y) => app.evento(x, y, { pointerType });
    app.modo('agregar');
    app.canvas.emitir('pointerdown', evento(10, 10));
    assert.equal(app.datos.escenario.destinos.at(-1).x, 10);
    app.canvas.emitir('pointerdown', evento(10, 10));
    assert.equal(app.datos.escenario.destinos.length, 9);
    app.canvas.emitir('pointerdown', evento(-5, 10));
    assert.equal(app.datos.escenario.destinos.length, 9);
    app.modo('mover');
    app.canvas.emitir('pointerdown', evento(10, 10));
    app.canvas.emitir('pointermove', evento(11, 15));
    app.canvas.emitir('pointerup', evento(11, 15));
    assert.equal(app.datos.escenario.destinos.at(-1).y, 15);
    app.canvas.emitir('pointerdown', evento(50, 49));
    app.canvas.emitir('pointermove', evento(11, 15));
    app.canvas.emitir('pointerup', evento(11, 15));
    assert.equal(app.datos.escenario.almacen.x, 50);
    assert.match(app.obtener('estado').textContent, /No se pueden superponer/);
    app.canvas.emitir('pointerdown', evento(50, 49));
    app.canvas.emitir('pointermove', evento(120, -10));
    app.canvas.emitir('pointercancel', evento(120, -10));
    assert.equal(app.datos.escenario.almacen.x, 100);
    assert.equal(app.datos.escenario.almacen.y, 0);
    assert.equal(app.canvas.hasPointerCapture(1), false);
  });
}

test('Editor numérico y botón de centro rechazan coincidencias; ejemplo restaura datos', () => {
  const app = iniciar();
  app.obtener('coordenada-x').value = '19';
  app.obtener('coordenada-y').value = '76';
  app.obtener('aplicar').emitir('click');
  assert.equal(app.datos.escenario.almacen.x, 50);
  assert.match(app.obtener('estado').textContent, /Ya hay un punto/);
  app.obtener('agregar-centro').emitir('click');
  app.obtener('agregar-centro').emitir('click');
  assert.equal(app.datos.escenario.destinos.length, 9);
  app.obtener('restablecer').emitir('click');
  assert.equal(app.datos.escenario.destinos.length, 8);
  assert.equal(app.datos.escenario.almacen.y, 49);
  assert.equal(app.obtener('punto').value, 'A');
});

test('Redimensionar y cambiar DPR preserva coordenadas y todas las distancias', () => {
  const app = iniciar();
  const distancias = () => app.datos.puntos().flatMap(a => app.datos.puntos().map(b => Math.hypot(a.x - b.x, a.y - b.y)));
  const antes = JSON.stringify(app.datos.escenario);
  const distanciasAntes = distancias();
  for (const [ancho, alto, dpr] of [[250, 350, 1], [600, 410, 2], [1200, 600, 1.25], [320, 350, 3]]) {
    app.redimensionar(ancho, alto, dpr);
    assert.equal(JSON.stringify(app.datos.escenario), antes);
    assert.deepEqual(distancias(), distanciasAntes);
    for (const p of app.datos.puntos()) {
      const pixel = app.dibujo.posicionEvento(app.evento(p.x, p.y));
      const logico = app.dibujo.aEscenario(pixel.x, pixel.y);
      assert.ok(Math.abs(logico.x - p.x) < 1e-9);
      assert.ok(Math.abs(logico.y - p.y) < 1e-9);
      assert.equal(app.dibujo.buscarPunto(pixel.x, pixel.y).id, p.id);
    }
  }
});

test('Referencias persisten al consultar y redimensionar; una edición real las invalida', () => {
  const app = iniciar();
  app.obtener('ejecutar').emitir('click');
  const orden = app.obtener('orden-aleatoria').textContent;
  const distancia = app.obtener('distancia-aleatoria').textContent;
  assert.match(orden, /^A → D/);
  assert.ok(Number(distancia) > 0);
  app.obtener('ejecutar').emitir('click');
  app.redimensionar(320, 350, 2);
  assert.equal(app.obtener('orden-aleatoria').textContent, orden);
  assert.equal(app.obtener('distancia-aleatoria').textContent, distancia);
  // Intentar superponer no cambia el escenario y conserva las referencias.
  app.obtener('coordenada-x').value = '19';
  app.obtener('coordenada-y').value = '76';
  app.obtener('aplicar').emitir('click');
  assert.equal(app.obtener('orden-aleatoria').textContent, orden);
  app.obtener('coordenada-x').value = '51';
  app.obtener('coordenada-y').value = '49';
  app.obtener('aplicar').emitir('click');
  assert.equal(app.obtener('distancia-aleatoria').textContent, '—');
  assert.equal(app.obtener('distancia-vecino').textContent, '—');
  assert.match(app.obtener('estado-resultados').textContent, /Recalcula/);
  app.obtener('ejecutar').emitir('click');
  assert.ok(Number(app.obtener('distancia-vecino').textContent) > 0);
});

test('Agregar, eliminar, arrastrar y restaurar invalidan las referencias', () => {
  for (const accion of ['agregar', 'eliminar', 'arrastrar', 'restaurar']) {
    const app = iniciar();
    if (accion === 'restaurar') app.obtener('agregar-centro').emitir('click');
    app.obtener('ejecutar').emitir('click');
    if (accion === 'agregar') app.obtener('agregar-centro').emitir('click');
    if (accion === 'eliminar') { app.modo('eliminar'); app.canvas.emitir('pointerdown', app.evento(19, 76)); }
    if (accion === 'arrastrar') {
      app.canvas.emitir('pointerdown', app.evento(19, 76));
      app.canvas.emitir('pointermove', app.evento(21, 77));
      app.canvas.emitir('pointerup', app.evento(21, 77));
    }
    if (accion === 'restaurar') app.obtener('restablecer').emitir('click');
    assert.equal(app.obtener('distancia-aleatoria').textContent, '—', accion);
    assert.equal(app.obtener('distancia-vecino').textContent, '—', accion);
    assert.equal(app.obtener('vista-ruta').disabled, true, accion);
  }
});
