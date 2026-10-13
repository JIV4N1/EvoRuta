const {test}=require("node:test"),assert=require("node:assert/strict"),{cargar}=require("./ayudas.cjs");
test("Consulta cancelada no publica respuesta atrasada ni desbloquea una solicitud más nueva",async()=>{
 let resolverPrimera,resolverSegunda;
 const promesas=[new Promise(r=>resolverPrimera=r),new Promise(r=>resolverSegunda=r)];
 const EvoRuta={simulacion:{actualizarControles(){}}};
 const servicios=cargar(["servicios"],{EvoRuta,location:{protocol:"http:"},fetch:()=>promesas.shift(),AbortController,DOMException,setTimeout,clearTimeout}).servicios;
 const primera=servicios.consultar("matriz",{}); const rechazada=assert.rejects(primera,{name:"AbortError"});
 assert.equal(servicios.ocupado(),true);
 await assert.rejects(servicios.consultar("matriz",{}),/Espera/);
 servicios.cancelar();
 const segunda=servicios.consultar("matriz",{});
 resolverPrimera({ok:true,json:async()=>({vieja:true})}); await rechazada;
 assert.equal(servicios.ocupado(),true);
 resolverSegunda({ok:true,json:async()=>({nueva:true})}); assert.equal((await segunda).nueva,true);
 assert.equal(servicios.ocupado(),false);
});
test("Error HTTP libera controles y no inventa respuesta",async()=>{
 const EvoRuta={simulacion:{actualizarControles(){}}};
 const servicios=cargar(["servicios"],{EvoRuta,location:{protocol:"http:"},fetch:async()=>({ok:false,json:async()=>({error:"Proveedor no disponible"})}),AbortController,DOMException,setTimeout,clearTimeout}).servicios;
 await assert.rejects(servicios.consultar("matriz",{}),/Proveedor no disponible/); assert.equal(servicios.ocupado(),false);
});
