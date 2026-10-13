const {test}=require("node:test"),assert=require("node:assert/strict");
const {crearProveedor,validarPuntos}=require("../servidor/proveedor.cjs");
const config=require("../config.example.json");
const puntos=n=>Array.from({length:n},(_,i)=>({id:i?"D"+i:"A",lat:18.46+i*.0001,lng:-97.39}));
test("Proveedor simulado admite 31 ubicaciones y rechaza 32 en matriz",async()=>{
 const p=puntos(31); let solicitudes=0;
 const proveedor=crearProveedor(config,async url=>{
  solicitudes++; assert.equal(url.searchParams.get("annotations"),"distance");
  assert.equal(url.searchParams.has("fallback_speed"),false);
  return {ok:true,json:async()=>({code:"Ok",distances:p.map((_,i)=>p.map((_,j)=>i===j?0:i*10+j)),sources:p.map(()=>({distance:1}))})};
 });
 const entrada={puntos:p,perfil:"driving"};
 const [a,b]=await Promise.all([proveedor.matriz(entrada),proveedor.matriz(entrada)]);
 assert.equal(a.distancias.length,31); assert.equal(a.distancias[0].length,31); assert.equal(solicitudes,1);
 assert.notEqual(a.distancias[1][2],a.distancias[2][1]);
 assert.deepEqual(a,b); await proveedor.matriz(entrada); assert.equal(solicitudes,1);
 assert.throws(()=>validarPuntos({puntos:puntos(32),perfil:"driving"}));
 assert.throws(()=>validarPuntos({puntos:p,perfil:"cycling"}));
});
test("Errores de red y celdas nulas no se convierten en distancias rectas",async()=>{
 const entrada={puntos:puntos(9),perfil:"driving"};
 for(const respuesta of [
  async()=>{throw new Error("sin red");},
  async()=>({ok:false,status:429}),
  async()=>({ok:true,json:async()=>({code:"Ok",distances:entrada.puntos.map(()=>Array(9).fill(null))})}),
  async()=>({ok:true,json:async()=>({code:"NoTable"})})
 ]) await assert.rejects(crearProveedor(config,respuesta).matriz(entrada));
});
test("El servicio de geometría usa route, conserva orden y regreso; nunca trip",async()=>{
 const p=puntos(9), entrada={puntos:[...p,p[0]],perfil:"driving"};
 const proveedor=crearProveedor(config,async url=>{
  assert.match(url.pathname,/\/route\/v1\/driving\//);
  assert.equal(url.searchParams.get("continue_straight"),"false");
  assert.ok(url.pathname.endsWith(p[0].lng+","+p[0].lat));
  return {ok:true,json:async()=>({code:"Ok",routes:[{distance:90,geometry:{type:"LineString",coordinates:[[0,0],[1,1]]},legs:Array.from({length:9},()=>({distance:10}))}]})};
 });
 assert.equal((await proveedor.ruta(entrada)).tramos.length,9);
 assert.throws(()=>validarPuntos({puntos:[...p,{...p[0],lat:19}],perfil:"driving"},true));
});
test("Búsqueda explícita reutiliza caché solo para la misma consulta",async()=>{
 let llamadas=0;
 const proveedor=crearProveedor(config,async()=>{llamadas++;return {ok:true,json:async()=>({features:[]})};});
 await proveedor.buscar({consulta:"Tehuacan"}); await proveedor.buscar({consulta:"Tehuacan"}); assert.equal(llamadas,1);
 await proveedor.buscar({consulta:"Puebla"}); assert.equal(llamadas,2);
});
