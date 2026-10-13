// Navegador real, servicios SIMULADOS. No descarga mosaicos ni consulta proveedores.
const {chromium}=require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert=require("node:assert/strict");
const {crearServidor}=require("../servidor.cjs");
(async()=>{
 const servidor=crearServidor(); await new Promise(r=>servidor.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+servidor.address().port;
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  const errores=[]; page.on("pageerror",e=>errores.push(e.message));
  await page.route("https://**/*",r=>r.fulfill({status:200,contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=","base64")}));
  let matrices=0,geometrias=0,busquedas=0,fallar=false;
  const valor=(i,j)=>i===j?0:100+((i*43+j*79)%211);
  await page.route("**/api/matriz",async r=>{
   matrices++; const datos=r.request().postDataJSON(),n=datos.puntos.length;
   if(fallar) return r.fulfill({status:502,json:{error:"Error de red simulado"}});
   await r.fulfill({json:{distancias:Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>valor(i,j))),ajusteMaximo:2}});
  });
  await page.route("**/api/ruta",async r=>{
   geometrias++; const {puntos}=r.request().postDataJSON();
   const todos=await page.evaluate(()=>EvoRuta.datos.puntos());
   const indices=puntos.map(p=>todos.findIndex(t=>t.id===p.id));
   const tramos=indices.slice(1).map((j,i)=>valor(indices[i],j));
   await r.fulfill({json:{coordenadas:puntos.map(p=>[p.lng,p.lat]),tramos,distancia:tramos.reduce((a,b)=>a+b,0)}});
  });
  await page.route("**/api/buscar",r=>{busquedas++;return r.fulfill({json:[{lat:18.4701,lng:-97.4001,nombre:"Lugar simulado para pruebas"}]});});
  await page.goto(base); await page.waitForFunction(()=>Boolean(window.EvoRuta?.interaccion));
  assert.deepEqual(errores,[]);
  await page.locator("#consulta").fill("Lugar de prueba"); assert.equal(busquedas,0);
  await page.locator("#busqueda button").click(); await page.waitForFunction(()=>document.querySelector("#resultados-busqueda button"));
  await page.locator("#resultados-busqueda button").click();
  assert.equal(await page.locator("#conteo").textContent(),"9 destinos");
  await page.locator("#restablecer").click();
  for(const n of [8,30]) {
   if(n===30) await page.evaluate(()=>{for(let i=0;i<22;i++) EvoRuta.datos.agregar(18.47+i*.0001,-97.4);EvoRuta.interaccion.actualizar();});
   await page.locator("#ejecutar").click(); await page.waitForFunction(()=>Boolean(EvoRuta.resultados.obtener()));
   const refs=await page.evaluate(()=>EvoRuta.resultados.obtener());
   const peticiones=matrices;
   await page.locator("#generaciones").fill("5"); await page.locator("#poblacion").fill("12");
   await page.clock.install(); await page.clock.pauseAt(new Date());
   await page.evaluate(()=>{document.getElementById("iniciar").click();document.getElementById("iniciar").click();document.getElementById("pausar").click();});
   assert.equal(await page.locator("#generacion-actual").textContent(),"0");
   for(const id of ["consulta","poblacion","restablecer","coordenada-x"]) assert.equal(await page.locator("#"+id).isDisabled(),true);
   const antes=await page.evaluate(()=>EvoRuta.datos.firma());
   await page.evaluate(()=>EvoRuta.interaccion.clic(18,-97));
   assert.equal(await page.evaluate(()=>EvoRuta.datos.firma()),antes);
   await page.clock.runFor(300); assert.equal(await page.locator("#generacion-actual").textContent(),"0");
   await page.locator("#paso").click(); assert.equal(await page.locator("#generacion-actual").textContent(),"1");
   await page.evaluate(()=>{document.getElementById("continuar").click();document.getElementById("continuar").click();});
   await page.clock.runFor(31); assert.equal(await page.locator("#generacion-actual").textContent(),"2");
   await page.clock.runFor(400); assert.equal(await page.locator("#generacion-actual").textContent(),"5");
   assert.equal(matrices,peticiones); assert.equal(geometrias,0);
   const medida=await page.evaluate(()=>{
    const e=EvoRuta.datos.escenario,r=EvoRuta.resultados.obtenerRuta("genetico");
    return {guardada:r.distancia,calculada:EvoRuta.rutas.distanciaTotal(r.ruta,e.almacen,e.destinos,EvoRuta.resultados.matriz()),negativa:EvoRuta.simulacion.describirMejora(100,125),registro:EvoRuta.experimentos.obtener()[0].distancia};
   });
   assert.equal(medida.guardada,medida.calculada); assert.equal(medida.registro,medida.calculada); assert.match(medida.negativa,/-25.00%.*más larga/);
   await page.locator("#repetir").click(); await page.clock.runFor(400);
   assert.equal(await page.locator("#cantidad-ejecuciones").textContent(),"2");
   assert.deepEqual(await page.evaluate(()=>EvoRuta.resultados.obtener()),refs);
   await page.locator("#reiniciar").click(); assert.deepEqual(await page.evaluate(()=>EvoRuta.resultados.obtener()),refs);
   await page.clock.resume();
   if(n===30) break;
   await page.locator("#restablecer").click(); // Mismo escenario: conserva referencias e historial.
  }
  await page.locator("#ruta-animacion").selectOption("aleatoria");
  await page.locator("#trazar-ruta").click(); await page.waitForFunction(()=>Boolean(EvoRuta.resultados.geometria("aleatoria")));
  assert.equal(geometrias,1);
  await page.locator("#reproducir-ruta").click(); assert.equal(await page.locator("#detener-ruta").isDisabled(),false);
  await page.locator("#detener-ruta").click();
  // Una edición invalida matriz, geometría, referencias e historial.
  await page.evaluate(()=>EvoRuta.interaccion.mover("A",18.461,-97.39));
  assert.equal(await page.evaluate(()=>EvoRuta.resultados.matriz()),null);
  assert.equal(await page.locator("#cantidad-ejecuciones").textContent(),"0");
  assert.match(await page.locator("#aviso-experimentos").textContent(),/se eliminó/);
  fallar=true; await page.locator("#ejecutar").click();
  await page.waitForFunction(()=>document.getElementById("estado-resultados").textContent.includes("Error de red simulado"));
  assert.equal(await page.locator("#iniciar").isDisabled(),true);
  assert.equal(await page.evaluate(()=>EvoRuta.resultados.obtener()),null);
  // Respuesta atrasada de búsqueda tras cancelar/modificar no repone resultados.
  let liberar; const espera=new Promise(r=>liberar=r);
  await page.unroute("**/api/buscar");
  await page.route("**/api/buscar",async r=>{await espera;try{await r.fulfill({json:[{lat:18,lng:-97,nombre:"Obsoleto"}]});}catch{}});
  await page.locator("#consulta").fill("Consulta tardía"); await page.locator("#busqueda button").click();
  await page.waitForFunction(()=>EvoRuta.servicios.ocupado());
  await page.locator("#cancelar-consulta").click(); await page.locator("#restablecer").click(); liberar();
  await page.waitForTimeout(80); assert.equal(await page.locator("#resultados-busqueda button").count(),0);
  await page.screenshot({path:process.env.EVORUTA_CAPTURA || "tests/escritorio.png",fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:process.env.EVORUTA_CAPTURA_MOVIL || "tests/movil.png",fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  assert.deepEqual(errores,[]);
  console.log("Navegador: flujo 8/30, bloqueos, pausa/paso/continuación, repetición, métricas, geometría, errores, cancelación y móvil OK. Servicios simulados.");
 } finally {await browser.close();await new Promise(r=>servidor.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
