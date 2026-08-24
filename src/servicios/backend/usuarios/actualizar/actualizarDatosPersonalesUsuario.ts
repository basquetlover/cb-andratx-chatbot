import { supabaseServidor } from "../../../supabase/servidor";

import type { TipoUsuarioPanel } from "../../../../types/UsuarioDetallePanel";

interface DatosPersonalesActualizados {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  tipoUsuario: TipoUsuarioPanel;
  cargo: string;
  imagen: string | null;
  aceptaComunicaciones: boolean;
}

interface FilaUsuarioActual {
  id: string;
  email_normalizado: string;
  acepta_comunicaciones: boolean;
}

interface FilaUsuarioActualizada {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  telefono: string | null;
  tipo_usuario: TipoUsuarioPanel;
  cargo: string | null;
  imagen: string | null;
  acepta_comunicaciones: boolean;
  estado: "pendiente" | "activo" | "bloqueado" | "desactivado";
  updated_at: string;
}

export class ErrorActualizarUsuario extends Error {
  status: number;
  campo?: string;

  constructor(mensaje: string, status = 400, campo?: string) {
    super(mensaje);

    this.name = "ErrorActualizarUsuario";
    this.status = status;
    this.campo = campo;
  }
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarImagen(imagen: string | null): boolean {
  if (!imagen) {
    return true;
  }

  return imagen.startsWith("https://") || imagen.startsWith("/");
}

function validarDatos(datos: unknown): DatosPersonalesActualizados {
  if (typeof datos !== "object" || datos === null) {
    throw new ErrorActualizarUsuario("Los datos enviados no son válidos.");
  }

  const contenido = datos as Record<string, unknown>;

  const nombre = typeof contenido.nombre === "string" ? contenido.nombre.trim() : "";
  const apellidos = typeof contenido.apellidos === "string" ? contenido.apellidos.trim() : "";
  const email = typeof contenido.email === "string" ? contenido.email.trim() : "";
  const telefono = typeof contenido.telefono === "string" ? contenido.telefono.trim() : "";
  const tipoUsuario = contenido.tipoUsuario;
  const cargo = typeof contenido.cargo === "string" ? contenido.cargo.trim() : "";
  const imagen = typeof contenido.imagen === "string" && contenido.imagen.trim() ? contenido.imagen.trim() : null;
  const aceptaComunicaciones = contenido.aceptaComunicaciones === true;

  if (!nombre) {
    throw new ErrorActualizarUsuario("Introduce el nombre del usuario.", 400, "nombre");
  }

  if (nombre.length > 100) {
    throw new ErrorActualizarUsuario("El nombre no puede superar los 100 caracteres.", 400, "nombre");
  }

  if (!apellidos) {
    throw new ErrorActualizarUsuario("Introduce los apellidos del usuario.", 400, "apellidos");
  }

  if (apellidos.length > 150) {
    throw new ErrorActualizarUsuario("Los apellidos no pueden superar los 150 caracteres.", 400, "apellidos");
  }

  if (!email || !validarEmail(email) || email.length > 254) {
    throw new ErrorActualizarUsuario("Introduce un correo electrónico válido.", 400, "email");
  }

  if (telefono.length > 30) {
    throw new ErrorActualizarUsuario("El teléfono no puede superar los 30 caracteres.", 400, "telefono");
  }

  if (tipoUsuario !== "interno" && tipoUsuario !== "publico") {
    throw new ErrorActualizarUsuario("El tipo de usuario no es válido.", 400, "tipoUsuario");
  }

  if (tipoUsuario === "interno" && !cargo) {
    throw new ErrorActualizarUsuario("Selecciona el cargo o función del usuario.", 400, "cargo");
  }

  if (cargo.length > 100) {
    throw new ErrorActualizarUsuario("El cargo no puede superar los 100 caracteres.", 400, "cargo");
  }

  if (!validarImagen(imagen)) {
    throw new ErrorActualizarUsuario("La dirección de la imagen no es válida.", 400, "imagen");
  }

  return {
    nombre,
    apellidos,
    email,
    telefono,
    tipoUsuario,
    cargo: tipoUsuario === "interno" ? cargo : "",
    imagen,
    aceptaComunicaciones,
  };
}

export async function actualizarDatosPersonalesUsuario(usuarioId: string, datos: unknown): Promise<FilaUsuarioActualizada> {
  const datosValidados = validarDatos(datos);
  const emailNormalizado = normalizarEmail(datosValidados.email);

  const { data: usuarioEncontrado, error: errorUsuario } = await supabaseServidor
    .from("usuarios")
    .select("id, email_normalizado, acepta_comunicaciones")
    .eq("id", usuarioId)
    .maybeSingle();

  if (errorUsuario) {
    throw new ErrorActualizarUsuario(`No se ha podido obtener el usuario: ${errorUsuario.message}`, 500);
  }

  const usuarioActual = usuarioEncontrado as FilaUsuarioActual | null;

  if (!usuarioActual?.id) {
    throw new ErrorActualizarUsuario("El usuario no existe.", 404);
  }

  const { data: usuarioMismoEmail, error: errorEmail } = await supabaseServidor
    .from("usuarios")
    .select("id")
    .eq("email_normalizado", emailNormalizado)
    .neq("id", usuarioId)
    .limit(1)
    .maybeSingle();

  if (errorEmail) {
    throw new ErrorActualizarUsuario(`No se ha podido comprobar el correo electrónico: ${errorEmail.message}`, 500);
  }

  if (usuarioMismoEmail?.id) {
    throw new ErrorActualizarUsuario("Ya existe otro usuario con ese correo electrónico.", 409, "email");
  }

  const fechaActual = new Date().toISOString();
  const emailModificado = usuarioActual.email_normalizado !== emailNormalizado;
  const comunicacionesModificadas = usuarioActual.acepta_comunicaciones !== datosValidados.aceptaComunicaciones;

  const cambios: Record<string, unknown> = {
    nombre: datosValidados.nombre,
    apellidos: datosValidados.apellidos,
    email: datosValidados.email,
    email_normalizado: emailNormalizado,
    telefono: datosValidados.telefono || null,
    tipo_usuario: datosValidados.tipoUsuario,
    cargo: datosValidados.cargo || null,
    imagen: datosValidados.imagen,
    acepta_comunicaciones: datosValidados.aceptaComunicaciones,
    updated_at: fechaActual,
  };

  if (emailModificado) {
    cambios.email_verificado_at = null;
  }

  if (comunicacionesModificadas) {
    cambios.acepta_comunicaciones_at = datosValidados.aceptaComunicaciones ? fechaActual : null;
  }

  const { data: usuarioActualizado, error: errorActualizacion } = await supabaseServidor
    .from("usuarios")
    .update(cambios)
    .eq("id", usuarioId)
    .select("id, nombre, apellidos, email, telefono, tipo_usuario, cargo, imagen, acepta_comunicaciones, estado, updated_at")
    .single();

  if (errorActualizacion) {
    throw new ErrorActualizarUsuario(`No se han podido guardar los datos del usuario: ${errorActualizacion.message}`, 500);
  }

  return usuarioActualizado as FilaUsuarioActualizada;
}