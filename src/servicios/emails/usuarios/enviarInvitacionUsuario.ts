import { enviarEmailApi } from "../cliente/enviarEmailApi";
import { generarEmailInvitacionUsuario } from "../plantillas/generarEmailInvitacionUsuario";

interface DatosInvitacionUsuario {
  email: string;
  nombre: string;
  cargo: string;
  enlaceActivacion: string;
  fechaCaducidad: Date;
  urlEscudo?: string;
}

export async function enviarInvitacionUsuario({ email, nombre, cargo, enlaceActivacion, fechaCaducidad, urlEscudo }: DatosInvitacionUsuario) {
  const contenido = generarEmailInvitacionUsuario({
    nombre,
    cargo,
    enlaceActivacion,
    fechaCaducidad,
    urlEscudo,
  });

  return enviarEmailApi({
    to: email,
    subject: contenido.asunto,
    html: contenido.html,
    origen: "info",
  });
}