"use strict";
// Servidor local sin paquetes: mismo origen, caché, identificación y límite de consultas.
const http=require("node:http"), fs=require("node:fs"), path=require("node:path");
const {crearProveedor}=require("./servidor/proveedor.cjs");
const predeterminada=require("./config.example.json");
const archivo=path.join(__dirname,"config.local.json");
const config={...predeterminada,...(fs.existsSync(archivo)?JSON.parse(fs.readFileSync(archivo,"utf8")):{})};
function crearServidor(configuracion=config, proveedor=crearProveedor(configuracion)) {
  function json(res,status,valor) {res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}); res.end(JSON.stringify(valor));}
  return http.createServer(async(req,res)=>{
    try {
      const host=req.headers.host || "";
      if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return json(res,403,{error:"Solo se admite acceso local."});
      const url=new URL(req.url,"http://"+host);
      if(url.pathname==="/api/config" && req.method==="GET") return json(res,200,{
        tiles:configuracion.tiles,atribucion:configuracion.atribucion,
        descripcion:"Búsqueda: "+new URL(configuracion.photon).hostname+" · Red vial: "+new URL(configuracion.osrm).hostname+" · Perfil: automóvil"});
      if(url.pathname.startsWith("/api/")) {
        if(req.method!=="POST") return json(res,405,{error:"Método no permitido."});
        if(req.headers.origin && req.headers.origin!=="http://"+host) return json(res,403,{error:"Origen no autorizado."});
        if(!String(req.headers["content-type"]).startsWith("application/json")) return json(res,415,{error:"Se requiere JSON."});
        let cuerpo=""; for await(const parte of req) {cuerpo+=parte; if(cuerpo.length>20000) return json(res,413,{error:"Solicitud demasiado grande."});}
        let datos; try {datos=JSON.parse(cuerpo);} catch {return json(res,400,{error:"JSON inválido."});}
        const operaciones={"/api/buscar":"buscar","/api/matriz":"matriz","/api/ruta":"ruta"};
        const operacion=operaciones[url.pathname]; if(!operacion) return json(res,404,{error:"Operación desconocida."});
        return json(res,200,await proveedor[operacion](datos));
      }
      if(req.method!=="GET") return json(res,405,{error:"Método no permitido."});
      // Lista de recursos públicos: nunca servir configuración, .git, servidor o documentos.
      const recurso=url.pathname==="/"?"/index.html":url.pathname;
      if(!/^\/(index\.html|(js|css|vendor)\/[a-zA-Z0-9_./-]+\.(js|css|png|map))$/.test(recurso) || recurso.includes("..")) return json(res,404,{error:"Recurso no disponible."});
      const contenido=await fs.promises.readFile(path.join(__dirname,recurso));
      const tipo={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".map":"application/json"}[path.extname(recurso)];
      res.writeHead(200,{"Content-Type":tipo+"; charset=utf-8","Referrer-Policy":"strict-origin-when-cross-origin","X-Content-Type-Options":"nosniff"});
      res.end(contenido);
    } catch(error) {json(res,error.status || (error.code==="ENOENT"?404:502),{error:error.code==="ENOENT"?"Recurso no disponible.":error.message});}
  });
}
if(require.main===module) {
  crearServidor().listen(config.puerto,"127.0.0.1",()=>console.log("EvoRuta: http://127.0.0.1:"+config.puerto+" · Ctrl+C para detener."));
}
module.exports={crearServidor};
