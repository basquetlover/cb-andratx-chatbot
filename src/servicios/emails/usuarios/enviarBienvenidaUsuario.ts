import { enviarEmailApi } from "../cliente/enviarEmailApi";
import { generarEmailBienvenidaUsuario } from "../plantillas/generarEmailBienvenidaUsuario";

interface DatosBienvenidaUsuario {
  email: string;
  nombre: string;
  cargo: string;
}

export async function enviarBienvenidaUsuario({ email, nombre, cargo }: DatosBienvenidaUsuario) {
  const contenido = generarEmailBienvenidaUsuario({
    nombre,
    cargo,
  });

  return enviarEmailApi({
    to: email,
    subject: contenido.asunto,
    html: contenido.html,
    origen: "info",
  });
}