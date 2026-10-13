// Comprobación voluntaria contra proveedores REALES. No forma parte de --test.
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),assert=require("node:assert/strict");
const {crearProveedor}=require("../servidor/proveedor.cjs"),config=require("../config.example.json");
const c=vm.createContext({});
for(const n of ["datos","matriz","rutas","genetico"]) vm.runInContext(fs.readFileSync(path.join(__dirname,"../js/"+n+".js"),"utf8"),c);
(async()=>{
 const proveedor=crearProveedor(config), informe={fecha:new Date().toISOString(),osrm:config.osrm,photon:config.photon,perfil:"driving",ejecuciones:[]};
 const lugares=await proveedor.buscar({consulta:"Tehuacan"});
 assert.ok(lugares.length); informe.busqueda={consulta:"Tehuacan",resultados:lugares.length};
 for(const n of [8,30]) {
  const puntos=n===8?c.EvoRuta.datos.puntos():Array.from({length:31},(_,i)=>({id:i?"D"+i:"A",lat:18.459+Math.floor(i/6)*.0014,lng:-97.396+(i%6)*.0014}));
  const res=await proveedor.matriz({puntos,perfil:"driving"});
  assert.equal(res.distancias.length,n+1);
  const matriz=c.EvoRuta.matrices.crear(puntos,res.distancias);
  const almacen=puntos[0],destinos=puntos.slice(1), referencia=c.EvoRuta.rutas.aleatoria(destinos);
  const vecino=c.EvoRuta.rutas.vecinoMasCercano(almacen,destinos,matriz);
  const resultado=c.EvoRuta.genetico.ejecutar({almacen,destinos,referencia,matriz,poblacion:60,generaciones:50});
  const orden=[almacen,...resultado.mejor.ruta.map(id=>destinos.find(d=>d.id===id)),almacen];
  const geo=await proveedor.ruta({puntos:orden,perfil:"driving"});
  const diferencias=geo.tramos.map((d,i)=>Math.abs(d-matriz.distancia(orden[i].id,orden[i+1].id)));
  assert.ok(diferencias.every((d,i)=>d<=Math.max(2,matriz.distancia(orden[i].id,orden[i+1].id)*.001)),"Matriz y geometría no coinciden");
  informe.ejecuciones.push({destinos:n,dimensiones:[res.distancias.length,res.distancias[0].length],puntos,
   asimetrica:res.distancias.some((fila,i)=>fila.some((d,j)=>d!==res.distancias[j][i])),
   ajusteMaximoMetros:res.ajusteMaximo,aleatoriaMetros:c.EvoRuta.rutas.distanciaTotal(referencia,almacen,destinos,matriz),
   vecinoMetros:c.EvoRuta.rutas.distanciaTotal(vecino,almacen,destinos,matriz),geneticoMetros:resultado.mejor.distancia,
   rutaGenetica:resultado.mejor.ruta,generaciones:50,registros:resultado.historial.length,
   puntosGeometria:geo.coordenadas.length,diferenciaMaximaTramoMetros:Math.max(...diferencias)});
 }
 if(process.env.EVORUTA_INFORME) fs.writeFileSync(process.env.EVORUTA_INFORME,JSON.stringify(informe,null,2));
 console.log(JSON.stringify(informe,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
