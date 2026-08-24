import { supabaseServidor } from "../../supabase/servidor";
import { calcularHashToken } from "../usuarios/calcularHashToken";

interface FilaSesion {
  id: string;
  usuario_id: string;
  expires_at: string;
}

interface FilaUsuario {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  tipo_usuario: string;
  cargo: string | null;
  imagen: string | null;
  estado: string;
}

interface FilaPermisos {
  acceso_panel: boolean;
  acceso_total: boolean;
  acceso_todos_equipos: boolean;
  permisos: unknown;
}

export interface UsuarioSesion {
  sesionId: string;
  usuario: {
    id: string;
    nombre: string;
    apellidos: string | null;
    email: string;
    tipoUsuario: string;
    cargo: string | null;
    imagen: string | null;
  };
  acceso: {
    panel: boolean;
    total: boolean;
    todosEquipos: boolean;
    permisos: unknown;
  };
  expiresAt: string;
}

export async function obtenerUsuarioSesion(token: string): Promise<UsuarioSesion | null> {
  const tokenNormalizado = token.trim();

  if (!tokenNormalizado || tokenNormalizado.length > 128) {
    return null;
  }

  let tokenHash: string;

  try {
    tokenHash = await calcularHashToken(tokenNormalizado);
  } catch {
    return null;
  }

  const { data: sesionEncontrada, error: errorSesion } = await supabaseServidor
    .from("sesiones_usuario")
    .select("id, usuario_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (errorSesion) {
    throw new Error(`No se ha podido comprobar la sesión: ${errorSesion.message}`);
  }

  const sesion = sesionEncontrada as FilaSesion | null;

  if (!sesion?.id || !sesion.usuario_id || !sesion.expires_at) {
    return null;
  }

  const fechaCaducidad = new Date(sesion.expires_at);

  if (Number.isNaN(fechaCaducidad.getTime()) || fechaCaducidad.getTime() <= Date.now()) {
    return null;
  }

  const [{ data: usuarioEncontrado, error: errorUsuario }, { data: permisosEncontrados, error: errorPermisos }] = await Promise.all([
    supabaseServidor.from("usuarios").select("id, nombre, apellidos, email, tipo_usuario, cargo, imagen, estado").eq("id", sesion.usuario_id).maybeSingle(),
    supabaseServidor.from("usuarios_permisos").select("acceso_panel, acceso_total, acceso_todos_equipos, permisos").eq("usuario_id", sesion.usuario_id).maybeSingle(),
  ]);

  if (errorUsuario) {
    throw new Error(`No se ha podido obtener el usuario de la sesión: ${errorUsuario.message}`);
  }

  if (errorPermisos) {
    throw new Error(`No se han podido obtener los permisos de la sesión: ${errorPermisos.message}`);
  }

  const usuario = usuarioEncontrado as FilaUsuario | null;
  const permisos = permisosEncontrados as FilaPermisos | null;

  if (!usuario?.id || usuario.estado !== "activo") {
    return null;
  }

  const accesoTotal = permisos?.acceso_total === true;
  const accesoPanel = permisos?.acceso_panel === true || accesoTotal;
  const accesoTodosEquipos = permisos?.acceso_todos_equipos === true || accesoTotal;

  if (!accesoPanel) {
    return null;
  }

  return {
    sesionId: sesion.id,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      email: usuario.email,
      tipoUsuario: usuario.tipo_usuario,
      cargo: usuario.cargo,
      imagen: usuario.imagen,
    },
    acceso: {
      panel: accesoPanel,
      total: accesoTotal,
      todosEquipos: accesoTodosEquipos,
      permisos: permisos?.permisos ?? [],
    },
    expiresAt: sesion.expires_at,
  };
}