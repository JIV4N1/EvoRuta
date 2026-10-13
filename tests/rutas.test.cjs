const {test}=require("node:test"),assert=require("node:assert/strict");
const {cargar,escenario}=require("./ayudas.cjs");
const {rutas:r,matrices:m}=cargar(["matriz","rutas"]);
test("Matriz dirigida: sumar salida y regreso, sin simetrizar",()=>{
 const puntos=[{id:"A"},{id:"D1"},{id:"D2"}],matriz=m.crear(puntos,[[0,10,90],[30,0,20],[40,50,0]]);
 assert.equal(r.distanciaTotal(["D1","D2"],puntos[0],puntos.slice(1),matriz),70);
 assert.equal(r.distanciaTotal(["D2","D1"],puntos[0],puntos.slice(1),matriz),170);
});
test("Vecino utiliza la fila de origen y desempata por ID",()=>{
 const p=[{id:"A"},{id:"D2"},{id:"D10"},{id:"D9"}],matriz=m.crear(p,[[0,10,10,20],[3,0,99,88],[100,50,0,2],[1,3,6,0]]);
 assert.deepEqual(Array.from(r.vecinoMasCercano(p[0],p.slice(1),matriz)),["D10","D9","D2"]);
});
test("No hay distancia alternativa ante matriz ausente, incompleta, desconectada u obsoleta",()=>{
 const e=escenario();
 assert.throws(()=>r.distanciaTotal(e.referencia,e.almacen,e.destinos));
 assert.throws(()=>m.crear([{id:"A"},{id:"D1"}],[[0,null],[10,0]]));
 assert.throws(()=>m.crear([{id:"A"}],[[NaN]]));
 assert.throws(()=>m.crear([{id:"A"},{id:"A"}],[[0,1],[1,0]]));
 assert.throws(()=>m.crear([{id:"A"}],[new Array(1)]));
 e.almacen.lat+=.001;
 assert.throws(()=>r.distanciaTotal(e.referencia,e.almacen,e.destinos,e.matriz));
});
test("Permutaciones y validación para 8 y 30; matriz copiada e inmutable",()=>{
 for(const n of [8,30]) {
  const e=escenario(n),previo=JSON.stringify(e.destinos);
  for(const ruta of [r.aleatoria(e.destinos),r.vecinoMasCercano(e.almacen,e.destinos,e.matriz)]) assert.equal(r.validarRuta(ruta,e.destinos),true);
  for(const ruta of [[],["A"],e.referencia.slice(1),e.referencia.map(()=>"D1")]) assert.equal(r.validarRuta(ruta,e.destinos),false);
  assert.equal(JSON.stringify(e.destinos),previo);
  assert.equal(Object.isFrozen(e.matriz.distancias[0]),true);
 }
 const distancias=[[0,2],[9,0]], mat=m.crear([{id:"A"},{id:"D1"}],distancias);
 distancias[0][1]=999; assert.equal(mat.distancia("A","D1"),2);
});
