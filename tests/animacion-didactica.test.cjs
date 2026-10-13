const {test}=require("node:test"),assert=require("node:assert/strict"),{cargar,escenario}=require("./ayudas.cjs");
test("Ejemplo OX y mutación corresponde al descendiente realmente incorporado",()=>{
 const {genetico:g,rutas:r}=cargar(["matriz","rutas","genetico"]);
 const e=escenario(), motor=g.crearEjecucion({...e,poblacion:6,probabilidadMutacion:1});
 const estado=motor.avanzar(), ejemplo=estado.ejemplo;
 assert.ok(r.validarRuta(ejemplo.despues,e.destinos));
 assert.equal(ejemplo.intercambio.length,2);
 const esperado=Array.from(ejemplo.antes),[a,b]=ejemplo.intercambio;
 [esperado[a],esperado[b]]=[esperado[b],esperado[a]];
 assert.deepEqual(Array.from(ejemplo.despues),esperado);
 assert.deepEqual(estado.poblacion[1].ruta,ejemplo.despues);
});
test("Animación sigue puntos de geometría, termina y cancela sin tocar métricas",()=>{
 const elementos=new Map(), frames=new Map(), posiciones=[]; let sec=0;
 const document={getElementById(id){if(!elementos.has(id)) elementos.set(id,{value:"aleatoria",addEventListener(tipo,f){this[tipo]=f;}}); return elementos.get(id);}};
 const coords=[[0,0],[0,1],[1,1],[0,0]];
 const EvoRuta={resultados:{geometria:()=>({coordenadas:coords})},servicios:{ocupado:()=>false},dibujo:{colocarVehiculo:c=>posiciones.push(c),mapa:{distance:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])}}};
 cargar(["animacion"],{EvoRuta,document,requestAnimationFrame:f=>{frames.set(++sec,f);return sec;},cancelAnimationFrame:id=>frames.delete(id)});
 document.getElementById("reproducir-ruta").click();
 function avanzar(t) {const [id,f]=frames.entries().next().value;frames.delete(id);f(t);}
 avanzar(0); avanzar(5000); assert.ok(posiciones.at(-1)[0]>0 || posiciones.at(-1)[1]>0);
 avanzar(16000); assert.equal(posiciones.at(-1),null); assert.equal(frames.size,0);
 document.getElementById("reproducir-ruta").click(); document.getElementById("detener-ruta").click(); assert.equal(frames.size,0);
});
