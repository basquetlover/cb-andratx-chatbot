import { supabaseServidor } from "../../supabase/servidor";

import type { CreacionUsuarioPreparada } from "./prepararCreacionUsuario";

export interface UsuarioGuardado {
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  estado: string;
}

interface FilaUsuarioCreado {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  estado: string;
}

function obtenerOffsetMadrid(fecha: string): string {
  const fechaReferencia = new Date(`${fecha}T12:00:00Z`);

  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    timeZoneName: "longOffset",
  }).formatToParts(fechaReferencia);

  const zonaHoraria = partes.find((parte) => parte.type === "timeZoneName")?.value;
  const coincidencia = zonaHoraria?.match(/GMT([+-]\d{2}:\d{2})/);

  if (!coincidencia) {
    throw new Error("No se ha podido calcular la zona horaria de la fecha de caducidad");
  }

  return coincidencia[1];
}

function convertirFechaCaducidad(fecha: string | null): string | null {
  if (!fecha) {
    return null;
  }

  const offsetMadrid = obtenerOffsetMadrid(fecha);

  return new Date(`${fecha}T23:59:59.999${offsetMadrid}`).toISOString();
}

export async function guardarUsuario(preparacion: CreacionUsuarioPreparada, creadoPor: string | null): Promise<UsuarioGuardado> {
  const { solicitud, tokenActivacion } = preparacion;

  const accesoTotal = solicitud.configuracionPermisos.nivelAcceso === "acceso-total";
  const accesoTodosEquipos = accesoTotal || solicitud.configuracionPermisos.nivelAcceso === "todos-equipos";
  const emailNormalizado = solicitud.datosPersonales.email.trim().toLowerCase();

  let usuarioCreadoId: string | null = null;

  try {
    const { data: usuarioCreado, error: errorUsuario } = await supabaseServidor
      .from("usuarios")
      .insert({
        nombre: solicitud.datosPersonales.nombre,
        apellidos: solicitud.datosPersonales.apellidos || null,
        email: solicitud.datosPersonales.email,
        email_normalizado: emailNormalizado,
        telefono: solicitud.datosPersonales.telefono || null,
        tipo_usuario: solicitud.datosPersonales.tipoUsuario,
        cargo: solicitud.datosPersonales.cargo || null,
        imagen: null,
        password_hash: null,
        estado: "pendiente",
        origen_registro: "invitacion",
        creado_por: creadoPor,
      })
      .select("id, nombre, apellidos, email, estado")
      .single();

    if (errorUsuario) {
      if (errorUsuario.code === "23505") {
        throw new Error("Ya existe un usuario con ese correo electrónico.");
      }

      throw new Error(`No se ha podido crear el usuario: ${errorUsuario.message}`);
    }

    const usuario = usuarioCreado as FilaUsuarioCreado;

    usuarioCreadoId = usuario.id;

    const fechaConcesion = new Date().toISOString();

    const permisosJson = accesoTotal
      ? []
      : solicitud.configuracionPermisos.permisosSeleccionados.map((permisoId) => ({
          permiso_id: permisoId,
          concedido_por: creadoPor,
          concedido_at: fechaConcesion,
        }));

    const { error: errorPermisos } = await supabaseServidor
      .from("usuarios_permisos")
      .insert({
        usuario_id: usuario.id,
        acceso_panel: true,
        acceso_total: accesoTotal,
        acceso_todos_equipos: accesoTodosEquipos,
        permisos: permisosJson,
        version: 1,
        actualizado_por: creadoPor,
      });

    if (errorPermisos) {
      throw new Error(`No se han podido guardar los permisos: ${errorPermisos.message}`);
    }

    if (!accesoTodosEquipos && solicitud.equiposAsignados.length > 0) {
      const filasEquipos = solicitud.equiposAsignados.map((asignacion) => ({
        usuario_id: usuario.id,
        equipo_id: asignacion.equipoId,
        asignado_por: creadoPor,
        expires_at: convertirFechaCaducidad(asignacion.fechaCaducidad),
      }));

      const { error: errorEquipos } = await supabaseServidor
        .from("usuarios_equipos")
        .insert(filasEquipos);

      if (errorEquipos) {
        throw new Error(`No se han podido asignar los equipos: ${errorEquipos.message}`);
      }
    }

    const { error: errorToken } = await supabaseServidor
      .from("tokens_usuario")
      .insert({
        usuario_id: usuario.id,
        tipo: "activar-cuenta",
        token_hash: tokenActivacion.tokenHash,
        destino: usuario.email,
        expires_at: tokenActivacion.fechaCaducidad.toISOString(),
        creado_por: creadoPor,
      });

    if (errorToken) {
      throw new Error(`No se ha podido guardar el token de activación: ${errorToken.message}`);
    }

    return {
      usuarioId: usuario.id,
      nombreCompleto: [usuario.nombre, usuario.apellidos].filter(Boolean).join(" "),
      email: usuario.email,
      estado: usuario.estado,
    };
  } catch (error) {
    if (usuarioCreadoId) {
      const { error: errorLimpieza } = await supabaseServidor
        .from("usuarios")
        .delete()
        .eq("id", usuarioCreadoId);

      if (errorLimpieza) {
        console.error("No se ha podido limpiar el usuario incompleto:", {
          usuarioId: usuarioCreadoId,
          error: errorLimpieza.message,
        });

        throw new Error("La creación del usuario ha fallado y no se ha podido completar la limpieza automática.");
      }
    }

    throw error;
  }
}