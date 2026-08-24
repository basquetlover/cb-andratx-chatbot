import { supabaseServidor } from "../../../supabase/servidor";

interface EquipoAsignadoRecibido {
  equipoId: string;
  fechaCaducidad: string | null;
}

interface FilaAsignacionActual {
  id: string;
  equipo_id: string;
}

interface FilaPermisosUsuario {
  acceso_total: boolean;
  acceso_todos_equipos: boolean;
}

interface FilaEquipoValido {
  id: string;
}

export interface EquipoAsignadoActualizado {
  equipoId: string;
  fechaCaducidad: string | null;
}

export interface ResultadoEquiposUsuario {
  accesoTodosEquipos: boolean;
  equiposAsignados: EquipoAsignadoActualizado[];
}

export class ErrorActualizarEquiposUsuario extends Error {
  status: number;

  constructor(mensaje: string, status = 400) {
    super(mensaje);

    this.name = "ErrorActualizarEquiposUsuario";
    this.status = status;
  }
}

function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function normalizarFechaCaducidad(fecha: unknown): string | null {
  if (fecha === null || fecha === undefined || fecha === "") {
    return null;
  }

  if (typeof fecha !== "string") {
    throw new ErrorActualizarEquiposUsuario("Una fecha de caducidad no es válida.");
  }

  const fechaLimpia = fecha.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaLimpia)) {
    throw new ErrorActualizarEquiposUsuario("La fecha de caducidad debe tener el formato AAAA-MM-DD.");
  }

  const fechaConvertida = new Date(`${fechaLimpia}T23:59:59.999Z`);

  if (Number.isNaN(fechaConvertida.getTime())) {
    throw new ErrorActualizarEquiposUsuario("Una fecha de caducidad no es válida.");
  }

  return fechaConvertida.toISOString();
}

function validarEquipos(datos: unknown): EquipoAsignadoRecibido[] {
  if (typeof datos !== "object" || datos === null) {
    throw new ErrorActualizarEquiposUsuario("Los datos de equipos no son válidos.");
  }

  const contenido = datos as Record<string, unknown>;

  if (!Array.isArray(contenido.equiposAsignados)) {
    throw new ErrorActualizarEquiposUsuario("La lista de equipos asignados no es válida.");
  }

  const equiposAsignados = contenido.equiposAsignados.map((asignacion) => {
    if (typeof asignacion !== "object" || asignacion === null) {
      throw new ErrorActualizarEquiposUsuario("Una asignación de equipo no es válida.");
    }

    const datosAsignacion = asignacion as Record<string, unknown>;
    const equipoId = typeof datosAsignacion.equipoId === "string" ? datosAsignacion.equipoId.trim() : "";

    if (!esUuid(equipoId)) {
      throw new ErrorActualizarEquiposUsuario("Uno de los equipos seleccionados no es válido.");
    }

    return {
      equipoId,
      fechaCaducidad: normalizarFechaCaducidad(datosAsignacion.fechaCaducidad),
    };
  });

  const idsEquipos = equiposAsignados.map((equipo) => equipo.equipoId);

  if (new Set(idsEquipos).size !== idsEquipos.length) {
    throw new ErrorActualizarEquiposUsuario("No se puede asignar el mismo equipo más de una vez.");
  }

  return equiposAsignados;
}

export async function actualizarEquiposUsuario(usuarioId: string, asignadoPor: string, datos: unknown): Promise<ResultadoEquiposUsuario> {
  const equiposSeleccionados = validarEquipos(datos);

  const { data: usuarioEncontrado, error: errorUsuario } = await supabaseServidor
    .from("usuarios")
    .select("id")
    .eq("id", usuarioId)
    .maybeSingle();

  if (errorUsuario) {
    throw new ErrorActualizarEquiposUsuario(`No se ha podido obtener el usuario: ${errorUsuario.message}`, 500);
  }

  if (!usuarioEncontrado?.id) {
    throw new ErrorActualizarEquiposUsuario("El usuario no existe.", 404);
  }

  const { data: permisosEncontrados, error: errorPermisos } = await supabaseServidor
    .from("usuarios_permisos")
    .select("acceso_total, acceso_todos_equipos")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (errorPermisos) {
    throw new ErrorActualizarEquiposUsuario(`No se ha podido comprobar el acceso a los equipos: ${errorPermisos.message}`, 500);
  }

  const permisos = permisosEncontrados as FilaPermisosUsuario | null;
  const accesoTodosEquipos = permisos?.acceso_total === true || permisos?.acceso_todos_equipos === true;

  if (accesoTodosEquipos) {
    throw new ErrorActualizarEquiposUsuario("Este usuario ya tiene acceso a todos los equipos. Modifica primero su nivel de acceso.", 409);
  }

  const idsSeleccionados = equiposSeleccionados.map((equipo) => equipo.equipoId);

  if (idsSeleccionados.length > 0) {
    const { data: temporadaEncontrada, error: errorTemporada } = await supabaseServidor
      .from("temporadas")
      .select("id")
      .eq("activa", true)
      .limit(1)
      .maybeSingle();

    if (errorTemporada) {
      throw new ErrorActualizarEquiposUsuario(`No se ha podido obtener la temporada activa: ${errorTemporada.message}`, 500);
    }

    if (!temporadaEncontrada?.id) {
      throw new ErrorActualizarEquiposUsuario("No hay ninguna temporada activa.", 409);
    }

    const { data: equiposValidosEncontrados, error: errorEquipos } = await supabaseServidor
      .from("equipos")
      .select("id")
      .in("id", idsSeleccionados)
      .eq("temporada_id", String(temporadaEncontrada.id))
      .eq("activo", true);

    if (errorEquipos) {
      throw new ErrorActualizarEquiposUsuario(`No se han podido comprobar los equipos seleccionados: ${errorEquipos.message}`, 500);
    }

    const equiposValidos = (equiposValidosEncontrados ?? []) as FilaEquipoValido[];
    const idsValidos = new Set(equiposValidos.map((equipo) => equipo.id));

    if (idsSeleccionados.some((equipoId) => !idsValidos.has(equipoId))) {
      throw new ErrorActualizarEquiposUsuario("Uno o varios equipos no pertenecen a la temporada activa.", 400);
    }
  }

  const { data: asignacionesEncontradas, error: errorAsignaciones } = await supabaseServidor
    .from("usuarios_equipos")
    .select("id, equipo_id")
    .eq("usuario_id", usuarioId);

  if (errorAsignaciones) {
    throw new ErrorActualizarEquiposUsuario(`No se han podido obtener las asignaciones actuales: ${errorAsignaciones.message}`, 500);
  }

  const asignacionesActuales = (asignacionesEncontradas ?? []) as FilaAsignacionActual[];
  const asignacionesPorEquipo = new Map(asignacionesActuales.map((asignacion) => [asignacion.equipo_id, asignacion]));
  const idsSeleccionadosSet = new Set(idsSeleccionados);
  const fechaActual = new Date().toISOString();

  for (const equipoSeleccionado of equiposSeleccionados) {
    const asignacionActual = asignacionesPorEquipo.get(equipoSeleccionado.equipoId);

    if (asignacionActual) {
      const { error } = await supabaseServidor
        .from("usuarios_equipos")
        .update({
          expires_at: equipoSeleccionado.fechaCaducidad,
          asignado_por: asignadoPor,
          updated_at: fechaActual,
        })
        .eq("id", asignacionActual.id);

      if (error) {
        throw new ErrorActualizarEquiposUsuario(`No se ha podido actualizar una asignación: ${error.message}`, 500);
      }

      continue;
    }

    const { error } = await supabaseServidor
      .from("usuarios_equipos")
      .insert({
        usuario_id: usuarioId,
        equipo_id: equipoSeleccionado.equipoId,
        asignado_por: asignadoPor,
        expires_at: equipoSeleccionado.fechaCaducidad,
      });

    if (error) {
      throw new ErrorActualizarEquiposUsuario(`No se ha podido crear una asignación: ${error.message}`, 500);
    }
  }

  const asignacionesRetiradas = asignacionesActuales.filter((asignacion) => !idsSeleccionadosSet.has(asignacion.equipo_id));

  if (asignacionesRetiradas.length > 0) {
    const idsAsignacionesRetiradas = asignacionesRetiradas.map((asignacion) => asignacion.id);

    const { error } = await supabaseServidor
      .from("usuarios_equipos")
      .update({
        expires_at: fechaActual,
        asignado_por: asignadoPor,
        updated_at: fechaActual,
      })
      .in("id", idsAsignacionesRetiradas);

    if (error) {
      throw new ErrorActualizarEquiposUsuario(`No se han podido retirar las asignaciones anteriores: ${error.message}`, 500);
    }
  }

  return {
    accesoTodosEquipos: false,
    equiposAsignados: equiposSeleccionados,
  };
}