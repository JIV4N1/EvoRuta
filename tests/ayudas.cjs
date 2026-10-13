const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function cargar(nombres,extras={}) {
  const c=vm.createContext(extras);
  for(const n of nombres) vm.runInContext(fs.readFileSync(path.join(__dirname,"../js/"+n+".js"),"utf8"),c);
  return c.EvoRuta;
}
// Matriz sintética ASIMÉTRICA para pruebas, no distancias reales.
function escenario(n=8) {
  const destinos=Array.from({length:n},(_,i)=>({id:"D"+(i*2+1),lat:18.46+i*.0001,lng:-97.39+i*.0002}));
  const almacen={id:"A",lat:18.462,lng:-97.392};
  const matriz=cargar(["matriz"]).matrices.crear([almacen,...destinos],
    Array.from({length:n+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===j?0:100+((i*43+j*79)%211))));
  return {almacen,destinos,referencia:destinos.map(p=>p.id).reverse(),matriz};
}
module.exports={cargar,escenario};
