const {test}=require("node:test"),assert=require("node:assert/strict");
const {cargar}=require("./ayudas.cjs");
test("Edición geográfica: 0–30 destinos, ejecución solo 8–30; almacén protegido",()=>{
 const d=cargar(["datos"]).datos;
 assert.equal(d.validar().valido,true);
 while(d.escenario.destinos.length) d.eliminar(d.escenario.destinos[0].id);
 assert.equal(d.validar().valido,false);
 assert.equal(d.eliminar("A"),false);
 for(let i=0;i<30;i++) assert.ok(d.agregar(18.4+i*.001,-97.3));
 assert.equal(d.agregar(18.9,-97.3),null);
 assert.equal(d.validar().valido,true);
});
test("Coordenadas, colisiones, IDs y descarte de dirección al mover",()=>{
 const d=cargar(["datos"]).datos,p=d.escenario.almacen;
 assert.equal(d.agregar(p.lat,p.lng),null);
 assert.equal(d.agregar(NaN,-97),null);
 assert.equal(d.mover("A",90,-97),false);
 const a=d.agregar(18,-97,"Nombre de proveedor"); d.eliminar(a.id);
 const b=d.agregar(18,-97,"Nombre de proveedor"); assert.notEqual(a.id,b.id);
 d.mover(b.id,18.1,-97); assert.equal(b.nombre,"");
});
test("La firma de caché cambia con puntos o perfil y no con redimensionamiento",()=>{
 const d=cargar(["datos"]).datos,f=d.firma();
 assert.equal(d.firma(),f);
 d.escenario.perfil="otro"; assert.notEqual(d.firma(),f);
 d.escenario.perfil="driving"; assert.equal(d.firma(),f);
 d.mover("A",18.4,-97.3); assert.notEqual(d.firma(),f);
});
