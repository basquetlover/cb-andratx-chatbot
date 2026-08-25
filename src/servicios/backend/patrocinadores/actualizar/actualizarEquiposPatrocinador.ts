import { obtenerPatrocinadorPanelPorId } from "../obtenerPatrocinadorPanelPorId";
import { supabaseServidor } from "../../../supabase/servidor";

import type { EquipoPatrocinadoPanel } from "../../../../types/PatrocinadorPanel";

interface DatosEntrada {
  equiposIds?: unknown;
}

interface FilaEquipo {
  id: string;
  patrocinadores: unknown;
}

interface AsignacionPatrocinador {
  id: string;
  fecha_asignacion: string;
  asignado_por: string;
}

export class ErrorActualizarEquiposPatrocinador extends Error {
  status: number;
  campo?: string;

  constructor(mensaje: string, status = 400, campo?: string) {
    super(mensaje);
    this.name = "ErrorActualizarEquiposPatrocinador";
    this.status = status;
    this.campo = campo;
  }
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function convertirTexto(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

function validarEquiposIds(contenido: unknown): string[] {
  if (typeof contenido !== "object" || contenido === null || Array.isArray(contenido)) {
    throw new ErrorActualizarEquiposPatrocinador("Los datos enviados no son válidos.");
  }

  const datos = contenido as DatosEntrada;

  if (!Array.isArray(datos.equiposIds)) {
    throw new ErrorActualizarEquiposPatrocinador("La selección de equipos no es válida.", 400, "equiposIds");
  }

  const equiposIds = datos.equiposIds.map((equipoId) => convertirTexto(equipoId));

  if (equiposIds.some((equipoId) => !equipoId || !validarUuid(equipoId))) {
    throw new ErrorActualizarEquiposPatrocinador("Uno de los equipos seleccionados no es válido.", 400, "equiposIds");
  }

  return Array.from(new Set(equiposIds as string[]));
}

function obtenerIdAsignacion(valor: unknown): string | null {
  if (typeof valor !== "object" || valor === null || !("id" in valor)) {
    return null;
  }

  return convertirTexto((valor as { id?: unknown }).id);
}

function obtenerAsignaciones(valor: unknown): unknown[] {
  return Array.isArray(valor) ? [...valor] : [];
}

export async function actualizarEquiposPatrocinador(patrocinadorId: string, administradorId: string, contenido: unknown): Promise<EquipoPatrocinadoPanel[]> {
  const idPatrocinador = patrocinadorId.trim();
  const idAdministrador = administradorId.trim();

  if (!validarUuid(idPatrocinador)) {
    throw new ErrorActualizarEquiposPatrocinador("El identificador del patrocinador no es válido.");
  }

  if (!validarUuid(idAdministrador)) {
    throw new ErrorActualizarEquiposPatrocinador("El administrador no es válido.", 401);
  }

  const equiposIds = validarEquiposIds(contenido);
  const equiposSeleccionados = new Set(equiposIds);

  const { data: patrocinador, error: errorPatrocinador } = await supabaseServidor
    .from("patrocinadores")
    .select("id")
    .eq("id", idPatrocinador)
    .maybeSingle();

  if (errorPatrocinador) {
    throw new Error(`No se ha podido comprobar el patrocinador: ${errorPatrocinador.message}`);
  }

  if (!patrocinador?.id) {
    throw new ErrorActualizarEquiposPatrocinador("El patrocinador no existe.", 404);
  }

  const { data: temporada, error: errorTemporada } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new Error(`No se ha podido obtener la temporada activa: ${errorTemporada.message}`);
  }

  if (!temporada?.id) {
    throw new ErrorActualizarEquiposPatrocinador("No hay ninguna temporada activa.", 409);
  }

  const { data: equiposEncontrados, error: errorEquipos } = await supabaseServidor
    .from("equipos")
    .select("id, patrocinadores")
    .eq("temporada_id", String(temporada.id))
    .eq("activo", true);

  if (errorEquipos) {
    throw new Error(`No se han podido obtener los equipos: ${errorEquipos.message}`);
  }

  const equipos = (equiposEncontrados ?? []) as FilaEquipo[];
  const idsEquiposDisponibles = new Set(equipos.map((equipo) => equipo.id));

  if (equiposIds.some((equipoId) => !idsEquiposDisponibles.has(equipoId))) {
    throw new ErrorActualizarEquiposPatrocinador("Uno o varios equipos no pertenecen a la temporada activa.", 400, "equiposIds");
  }

  const fechaAsignacion = new Date().toISOString();

  for (const equipo of equipos) {
    const asignacionesActuales = obtenerAsignaciones(equipo.patrocinadores);
    const asignacionExistente = asignacionesActuales.find((asignacion) => obtenerIdAsignacion(asignacion) === idPatrocinador);
    const debeEstarAsignado = equiposSeleccionados.has(equipo.id);
    const estaAsignado = asignacionExistente !== undefined;

    if (debeEstarAsignado === estaAsignado) {
      continue;
    }

    let nuevasAsignaciones: unknown[];

    if (debeEstarAsignado) {
      const nuevaAsignacion: AsignacionPatrocinador = {
        id: idPatrocinador,
        fecha_asignacion: fechaAsignacion,
        asignado_por: idAdministrador,
      };

      nuevasAsignaciones = [
        ...asignacionesActuales,
        nuevaAsignacion,
      ];
    } else {
      nuevasAsignaciones = asignacionesActuales.filter((asignacion) => obtenerIdAsignacion(asignacion) !== idPatrocinador);
    }

    const { error: errorActualizacion } = await supabaseServidor
      .from("equipos")
      .update({
        patrocinadores: nuevasAsignaciones,
        updated_at: fechaAsignacion,
      })
      .eq("id", equipo.id);

    if (errorActualizacion) {
      throw new Error(`No se ha podido actualizar la asignación del equipo: ${errorActualizacion.message}`);
    }
  }

  const patrocinadorActualizado = await obtenerPatrocinadorPanelPorId(idPatrocinador);

  if (!patrocinadorActualizado) {
    throw new ErrorActualizarEquiposPatrocinador("No se ha podido volver a obtener el patrocinador.", 500);
  }

  return patrocinadorActualizado.equipos;
}