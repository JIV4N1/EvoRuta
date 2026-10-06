const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function cargar(){
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
 const elementos={},get=id=>elementos[id] ||= new Elemento();
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
 for(const f of ['datos','rutas','genetico','dibujo','resultados','grafica','experimentos','simulacion','animacion','didactica','interaccion'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f+'.js'),'utf8'),ctx);
 let dibujo=null;const original=ctx.EvoRuta.dibujo.establecerRecorrido;
 ctx.EvoRuta.dibujo.establecerRecorrido=d=>{dibujo=d;original(d);};
 return {app:ctx.EvoRuta,get,frames,timers,dibujo:()=>dibujo,frame:t=>{const fs=Array.from(frames.values());frames.clear();fs.forEach(f=>f(t));}};
}
test('Animación visita la ruta real, vuelve a A y no modifica resultados',()=>{
 const h=cargar();h.get('ejecutar').click();const antes=JSON.stringify(h.app.resultados.obtener());
 h.get('reproducir-ruta').click();h.frame(0);
 const orden=h.app.resultados.obtener().aleatoria.ruta;
 assert.deepEqual(Array.from(h.dibujo().puntos,p=>p.id),['A',...orden,'A']);
 for(let i=0;i<=orden.length+1;i++){
  h.frame(i*650);const esperado=h.dibujo().puntos[i];
  assert.equal(h.dibujo().posicion.x,esperado.x);assert.equal(h.dibujo().posicion.y,esperado.y);
 }
 assert.equal(h.frames.size,0);assert.equal(h.get('detener-ruta').disabled,true);
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
