const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function cargar(){
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const ids=new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]));
 class Elemento{
  constructor(){this.value='';this.children=[];this.listeners={};this.style={};this.dataset={};this.disabled=false;}
  addEventListener(n,f){this.listeners[n]=f;}
  click(){if(!this.disabled)this.emitir('click');}
  emitir(n,e={}){this.listeners[n]?.(e);}
  setAttribute(){}
  replaceChildren(){this.children=[];this.value='';}
  appendChild(e){this.children.push(e);if(this.children.length===1)this.value=e.value;}
  reportValidity(){return true;}
  checkValidity(){return true;}
 }
 const elementos={},get=id=>{assert.ok(ids.has(id),'ID ausente en index.html: '+id);return elementos[id] ||= new Elemento();};
 const botones=['mover','agregar','eliminar'].map(m=>{const e=new Elemento();e.dataset.modo=m;return e;});
 const controles=['coordenada-x','coordenada-y','punto','aplicar','agregar-centro','eliminar-seleccion','restablecer'].map(get).concat(botones);
 for(const id of ['plano','grafica']){
  get(id).parentElement={};get(id).getBoundingClientRect=()=>({left:0,top:0,width:600,height:400});
  get(id).getContext=()=>new Proxy({measureText:s=>({width:s.length*6})},{get:(o,k)=>o[k]??(()=>{})});
 }
 const frames=new Map(),timers=new Map();let serial=0;
 const ctx={document:{getElementById:get,createElement:()=>new Elemento(),querySelectorAll:q=>q==='[data-modo]'?botones:controles},addEventListener(){},
  requestAnimationFrame:f=>{frames.set(++serial,f);return serial;},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout:f=>{timers.set(++serial,f);return serial;},clearTimeout:id=>timers.delete(id)};
 ctx.window=ctx;vm.createContext(ctx);
 get('vista-ruta').value='todas';get('ruta-animacion').value='aleatoria';
 get('poblacion').value='10';get('generaciones').value='3';get('mutacion').value='100';
 for(const m of html.matchAll(/<script defer src="([^"]+)"><\/script>/g))vm.runInContext(fs.readFileSync(path.join(__dirname,'..',m[1]),'utf8'),ctx);
 let dibujo=null, ultimoDibujo=null;const original=ctx.EvoRuta.dibujo.establecerRecorrido;
 ctx.EvoRuta.dibujo.establecerRecorrido=d=>{dibujo=d;if(d)ultimoDibujo=d;original(d);};
 return {app:ctx.EvoRuta,get,frames,timers,dibujo:()=>dibujo,ultimoDibujo:()=>ultimoDibujo,
  tick:()=>{const pendientes=Array.from(timers.values());timers.clear();pendientes.forEach(f=>f());},
  frame:t=>{const fs=Array.from(frames.values());frames.clear();fs.forEach(f=>f(t));}};
}
test('Animación visita la ruta real, vuelve a A y no modifica resultados',()=>{
 const h=cargar();h.get('ejecutar').click();const antes=JSON.stringify(h.app.resultados.obtener());
 h.get('reproducir-ruta').click();h.frame(0);
 const orden=h.app.resultados.obtener().aleatoria.ruta;
 assert.deepEqual(Array.from(h.dibujo().puntos,p=>p.id),['A',...orden,'A']);
 for(let i=0;i<=orden.length+1;i++){
  h.frame(i*650);const esperado=h.ultimoDibujo().puntos[i];
  assert.equal(h.ultimoDibujo().posicion.x,esperado.x);assert.equal(h.ultimoDibujo().posicion.y,esperado.y);
 }
 assert.equal(h.frames.size,0);assert.equal(h.get('detener-ruta').disabled,true);
 assert.equal(h.dibujo(),null);
 h.get('vista-ruta').value='vecino';h.get('vista-ruta').emitir('change');
 assert.equal(h.dibujo(),null);
 assert.match(h.get('estado-animacion').textContent,/regreso al almacén/);
 assert.equal(JSON.stringify(h.app.resultados.obtener()),antes);
});
test('Detener, cambiar selección y editar cancelan frames y limpian el marcador',()=>{
 const h=cargar();h.get('ejecutar').click();
 for(const accion of ['detener','seleccion','eliminar']){
  h.get('reproducir-ruta').click();h.frame(0);assert.ok(h.dibujo());
  if(accion==='detener')h.get('detener-ruta').click();
  if(accion==='seleccion'){h.get('ruta-animacion').value='vecino';h.get('ruta-animacion').emitir('change');}
  if(accion==='eliminar'){h.get('punto').value='D1';h.get('punto').emitir('change');h.get('eliminar-seleccion').click();}
  assert.equal(h.frames.size,0);assert.equal(h.dibujo(),null);
 }
 assert.equal(h.get('reproducir-ruta').disabled,true);
});
test('Evolución y reproducción son independientes; reinicio limpia la vista didáctica',()=>{
 const h=cargar();h.get('iniciar').click();h.get('pausar').click();h.get('paso').click();
 assert.equal(h.get('generacion-actual').textContent,'1');
 const rows=h.get('ejemplo-reproduccion').children.filter(e=>e.className==='cromosoma');
 assert.equal(rows.length,4);
 rows.forEach(row=>{
  const ids=row.children.slice(1,-1).map(c=>c.textContent.split(' · ')[0]);
  assert.equal(h.app.rutas.validarRuta(ids,h.app.datos.escenario.destinos),true);
 });
 assert.equal(rows[3].children.filter(e=>e.className.includes('intercambiado')).length,2);
 h.get('ruta-animacion').value='genetico';h.get('ruta-animacion').emitir('change');h.get('reproducir-ruta').click();h.frame(0);
 const snapshot=JSON.stringify(h.dibujo().puntos);
 h.get('paso').click();h.frame(200);
 assert.equal(JSON.stringify(h.dibujo().puntos),snapshot);
 h.get('detener-ruta').click();assert.equal(h.get('generacion-actual').textContent,'2');
 h.get('reiniciar').click();assert.match(h.get('ejemplo-reproduccion').children[0].textContent,/Aún no hubo/);
});
test('Registro OX y mutación coincide con el descendiente real, sin inventar rutas',()=>{
 const h=cargar(),d=h.app.datos.escenario,g=h.app.genetico,r=h.app.rutas;
 for(const probabilidadMutacion of [0,1]){
  const ejec=g.crearEjecucion({...d,referencia:d.destinos.map(p=>p.id),poblacion:10,generaciones:3,probabilidadMutacion});
  assert.equal(ejec.obtenerEstado().ejemplo,null);
  for(let generacion=1;generacion<=3;generacion++){
   const s=ejec.avanzar(),e=s.ejemplo;assert.equal(e.generacion,generacion);
   for(const ruta of [e.padre,e.madre,e.antes,e.despues])assert.equal(r.validarRuta(ruta,d.destinos),true);
   const [a,b]=e.cortes;
   assert.deepEqual(e.antes.slice(a,b+1),e.padre.slice(a,b+1));
   const segmento=new Set(e.padre.slice(a,b+1));
   const orden=Array.from({length:e.madre.length},(_,i)=>e.madre[(b+1+i)%e.madre.length]).filter(id=>!segmento.has(id));
   const completado=Array.from({length:e.antes.length},(_,i)=>(b+1+i)%e.antes.length).filter(i=>i<a||i>b).map(i=>e.antes[i]);
   assert.deepEqual(completado,orden);
   const esperado=e.antes.slice();
   if(e.intercambio){const [i,j]=e.intercambio;[esperado[i],esperado[j]]=[esperado[j],esperado[i]];}
   assert.deepEqual(e.despues,esperado);assert.deepEqual(s.poblacion[1].ruta,e.despues);
   assert.equal(e.intercambio!==null,probabilidadMutacion===1);
   h.app.didactica.mostrar(e);
   if(!e.intercambio)assert.ok(h.get('ejemplo-reproduccion').children.some(x=>/No hubo mutación/.test(x.textContent)));
   e.padre[0]='ajeno';assert.notEqual(ejec.obtenerEstado().ejemplo.padre[0],'ajeno');
  }
 }
});

for(const cantidad of [8,30])test(`Flujo completo con ${cantidad} destinos: controles, temporizadores y escenarios aislados`,()=>{
 const h=cargar();
 for(let i=0;i<cantidad-8;i++)assert.ok(h.app.datos.agregar(i,0));
 h.app.resultados.actualizar();
 if(cantidad===30)h.get('poblacion').value='300';
 const antes=JSON.stringify(h.app.datos.escenario);
 h.get('iniciar').click();h.get('iniciar').emitir('click');
 assert.equal(h.timers.size,1);assert.equal(h.get('generacion-actual').textContent,'0');
 h.get('agregar-centro').emitir('click');h.get('restablecer').emitir('click');
 assert.equal(JSON.stringify(h.app.datos.escenario),antes);
 h.get('pausar').click();assert.equal(h.timers.size,0);h.tick();
 assert.equal(h.get('generacion-actual').textContent,'0');
 h.get('paso').click();assert.equal(h.get('generacion-actual').textContent,'1');assert.equal(h.timers.size,0);
 h.get('continuar').click();h.get('continuar').emitir('click');assert.equal(h.timers.size,1);
 h.tick();assert.equal(h.get('generacion-actual').textContent,'2');assert.equal(h.timers.size,1);
 h.tick();assert.equal(h.get('generacion-actual').textContent,'3');assert.equal(h.timers.size,0);
 h.tick();assert.equal(h.app.experimentos.obtener().length,1);
 const referencias=JSON.stringify(h.app.resultados.obtener());
 const ruta=h.app.resultados.obtenerRuta('genetico');
 assert.equal(h.app.rutas.validarRuta(ruta.ruta,h.app.datos.escenario.destinos),true);
 const ps=[h.app.datos.escenario.almacen,...Array.from(ruta.ruta,id=>h.app.datos.escenario.destinos.find(p=>p.id===id)),h.app.datos.escenario.almacen];
 const distancia=ps.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-ps[i].x,p.y-ps[i].y),0);
 assert.equal(ruta.distancia,distancia);
 for(const metodo of ['aleatoria','vecino','genetico']){
  h.get('ruta-animacion').value=metodo;h.get('ruta-animacion').emitir('change');
  h.get('reproducir-ruta').click();h.get('reproducir-ruta').emitir('click');assert.equal(h.frames.size,1);
  h.frame(0);h.frame(100000);assert.equal(h.frames.size,0);assert.equal(h.dibujo(),null);
  assert.equal(h.ultimoDibujo().puntos.length,cantidad+2);
  assert.equal(h.ultimoDibujo().posicion.x,50);assert.equal(h.ultimoDibujo().posicion.y,49);
 }
 h.get('repetir').click();assert.equal(h.timers.size,1);assert.equal(JSON.stringify(h.app.resultados.obtener()),referencias);
 h.get('pausar').click();h.get('reiniciar').click();assert.equal(h.timers.size,0);assert.equal(h.app.experimentos.obtener().length,1);
 h.get('iniciar').click();h.get('reproducir-ruta').click();assert.equal(h.timers.size,1);assert.equal(h.frames.size,1);
 h.get('reiniciar').click();assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);h.tick();h.frame(99999);
 assert.equal(h.get('generacion-actual').textContent,'—');
 h.get('generaciones').value='0';h.get('iniciar').click();assert.equal(h.timers.size,0);assert.equal(h.app.experimentos.obtener().length,2);
 h.get('reiniciar').click();h.get('coordenada-x').value='51';h.get('coordenada-y').value='49';h.get('aplicar').click();
 assert.equal(h.app.resultados.obtener(),null);assert.equal(h.app.experimentos.obtener().length,0);
 assert.equal(h.app.resultados.obtenerRuta('genetico'),null);assert.equal(h.dibujo(),null);
 assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
 assert.match(h.get('ejemplo-reproduccion').children[0].textContent,/Aún no hubo/);
 h.get('iniciar').click();assert.equal(h.app.experimentos.obtener().length,1);
 assert.equal(h.app.datos.escenario.almacen.x,51);
});

test('Comparaciones positivas, negativas, iguales, cero y menores que precisión visible',()=>{
 const h=cargar(),s=h.app.simulacion;
 assert.equal(s.porcentaje(200,150),25);assert.equal(s.porcentaje(100,125),-25);
 assert.equal(s.porcentaje(0,0),null);assert.match(s.describirMejora(100,100),/0.00%.*misma distancia/);
 for(const distancia of [100.000001,99.999999]){
  assert.match(s.describirMejora(100,distancia),/inferior a 0.01/);
  h.app.experimentos.registrar({poblacion:3,generaciones:0,probabilidadMutacion:0},distancia,{aleatoria:{distancia:100},vecino:{distancia:100}});
 }
 for(const row of h.get('ejecuciones-registradas').children)assert.match(row.children[6].textContent,/inferior a 0.01/);
 assert.ok(h.app.experimentos.obtener()[0].mejoraVecino<0);
 assert.ok(h.app.experimentos.obtener()[1].mejoraVecino>0);
});
