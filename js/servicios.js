"use strict";
// Exclusión de consultas y cancelación: una respuesta obsoleta nunca se publica.
EvoRuta.servicios = (function () {
  let activa=null, secuencia=0;
  function ocupado() { return activa!==null; }
  function avisar() { if(EvoRuta.simulacion) EvoRuta.simulacion.actualizarControles(); }
  function cancelar() { secuencia++; if(activa) activa.abort(); activa=null; avisar(); }
  async function consultar(ruta,datos) {
    if(ocupado()) throw new Error("Espera a que termine la consulta actual.");
    if(location.protocol==="file:") throw new Error("Inicia node servidor.cjs y abre http://127.0.0.1:8080. Esta versión necesita el servidor local.");
    const controlador=new AbortController(), turno=++secuencia;
    activa=controlador; avisar();
    const limite=setTimeout(()=>controlador.abort(),60000);
    try {
      const respuesta=await fetch("/api/"+ruta,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(datos),signal:controlador.signal});
      const resultado=await respuesta.json();
      if(turno!==secuencia) throw new DOMException("Consulta cancelada","AbortError");
      if(!respuesta.ok) throw new Error(resultado.error || "El proveedor no pudo responder.");
      return resultado;
    } catch(error) {
      if(error.name==="AbortError") throw error;
      throw new Error(error.message==="Failed to fetch" ? "No se pudo conectar al servidor local. Comprueba que siga encendido y la conexión a internet." : error.message);
    } finally {
      clearTimeout(limite);
      if(turno===secuencia) {activa=null; avisar();}
    }
  }
  return {consultar,cancelar,ocupado};
})();
