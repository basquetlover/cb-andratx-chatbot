import { supabaseServidor } from "../../supabase/servidor";
import { verificarPassword } from "../../seguridad/password";
import { crearSesionUsuario, type SesionUsuarioCreada } from "./crearSesionUsuario";

interface DatosInicioSesion {
  email: string;
  password: string;
  mantenerSesion?: boolean;
  userAgent?: string | null;
  requiereAccesoPanel?: boolean;
}

interface FilaUsuario {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  email_normalizado: string;
  tipo_usuario: string;
  cargo: string | null;
  imagen: string | null;
  password_hash: string | null;
  estado: string;
}

interface FilaPermisosUsuario {
  acceso_panel: boolean;
  acceso_total: boolean;
  acceso_todos_equipos: boolean;
}

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  tipoUsuario: string;
  cargo: string | null;
  imagen: string | null;
  accesoPanel: boolean;
  accesoTotal: boolean;
  accesoTodosEquipos: boolean;
}

export interface ResultadoInicioSesion {
  usuario: UsuarioAutenticado;
  sesion: SesionUsuarioCreada;
}

export class ErrorInicioSesion extends Error {
  status: number;

  constructor(mensaje: string, status = 401) {
    super(mensaje);

    this.name = "ErrorInicioSesion";
    this.status = status;
  }
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validarDatosInicioSesion(email: unknown, password: unknown): {
  emailNormalizado: string;
  password: string;
} {
  if (typeof email !== "string" || typeof password !== "string") {
    throw new ErrorInicioSesion("El correo electrónico o la contraseña no son correctos.");
  }

  const emailNormalizado = normalizarEmail(email);

  if (!emailNormalizado || emailNormalizado.length > 254 || !emailNormalizado.includes("@")) {
    throw new ErrorInicioSesion("El correo electrónico o la contraseña no son correctos.");
  }

  if (!password || password.length > 128) {
    throw new ErrorInicioSesion("El correo electrónico o la contraseña no son correctos.");
  }

  return {
    emailNormalizado,
    password,
  };
}

export async function iniciarSesionUsuario({
  email,
  password,
  mantenerSesion = false,
  userAgent = null,
  requiereAccesoPanel = false,
}: DatosInicioSesion): Promise<ResultadoInicioSesion> {
  const datosValidados = validarDatosInicioSesion(email, password);

  const { data: usuarioEncontrado, error: errorUsuario } = await supabaseServidor
    .from("usuarios")
    .select("id, nombre, apellidos, email, email_normalizado, tipo_usuario, cargo, imagen, password_hash, estado")
    .eq("email_normalizado", datosValidados.emailNormalizado)
    .maybeSingle();

  if (errorUsuario) {
    throw new ErrorInicioSesion("No se ha podido comprobar el acceso.", 500);
  }

  const usuario = usuarioEncontrado as FilaUsuario | null;

  if (!usuario?.id || !usuario.password_hash) {
    throw new ErrorInicioSesion("El correo electrónico o la contraseña no son correctos.");
  }

  const passwordCorrecta = await verificarPassword(usuario.password_hash, datosValidados.password);

  if (!passwordCorrecta) {
    throw new ErrorInicioSesion("El correo electrónico o la contraseña no son correctos.");
  }

  if (usuario.estado === "pendiente") {
    throw new ErrorInicioSesion("La cuenta todavía no ha sido activada.", 403);
  }

  if (usuario.estado === "bloqueado") {
    throw new ErrorInicioSesion("La cuenta se encuentra bloqueada. Contacta con una persona responsable del club.", 403);
  }

  if (usuario.estado === "desactivado") {
    throw new ErrorInicioSesion("La cuenta se encuentra desactivada.", 403);
  }

  if (usuario.estado !== "activo") {
    throw new ErrorInicioSesion("No se puede acceder con esta cuenta.", 403);
  }

  const { data: permisosEncontrados, error: errorPermisos } = await supabaseServidor
    .from("usuarios_permisos")
    .select("acceso_panel, acceso_total, acceso_todos_equipos")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (errorPermisos) {
    throw new ErrorInicioSesion("No se han podido comprobar los permisos del usuario.", 500);
  }

  const permisos = permisosEncontrados as FilaPermisosUsuario | null;
  const accesoPanel = permisos?.acceso_panel === true || permisos?.acceso_total === true;
  const accesoTotal = permisos?.acceso_total === true;
  const accesoTodosEquipos = permisos?.acceso_todos_equipos === true || accesoTotal;

  if (requiereAccesoPanel && !accesoPanel) {
    throw new ErrorInicioSesion("Esta cuenta no tiene acceso al panel de gestión.", 403);
  }

  const sesion = await crearSesionUsuario({
    usuarioId: usuario.id,
    mantenerSesion,
    userAgent,
  });

  const fechaAcceso = new Date().toISOString();

  const { error: errorActualizacion } = await supabaseServidor
    .from("usuarios")
    .update({
      ultimo_acceso_at: fechaAcceso,
      updated_at: fechaAcceso,
    })
    .eq("id", usuario.id);

  if (errorActualizacion) {
    console.error("No se ha podido actualizar el último acceso del usuario:", errorActualizacion);
  }

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      email: usuario.email,
      tipoUsuario: usuario.tipo_usuario,
      cargo: usuario.cargo,
      imagen: usuario.imagen,
      accesoPanel,
      accesoTotal,
      accesoTodosEquipos,
    },
    sesion,
  };
}