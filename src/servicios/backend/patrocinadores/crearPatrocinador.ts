import { supabaseServidor } from "../../supabase/servidor";

import type {
  DatosCrearPatrocinador,
  PatrocinadorCreadoPanel,
  RedSocialPatrocinador,
} from "../../../types/PatrocinadorPanel";

interface FilaEquipo {
  id: string;
  patrocinadores: unknown;
}

interface AsignacionPatrocinadorJson {
  id: string;
  fecha_asignacion: string;
  asignado_por: string;
}

interface DatosCrearPatrocinadorEntrada {
  nombre?: unknown;
  nombreCorto?: unknown;
  slug?: unknown;
  descripcion?: unknown;
  web?: unknown;
  activo?: unknown;
  redes?: unknown;
  equiposIds?: unknown;
  logo?: unknown;
  banner?: unknown;
}

interface RedSocialEntrada {
  id?: unknown;
  nombre?: unknown;
  usuario?: unknown;
  url?: unknown;
  icono?: unknown;
  activo?: unknown;
  orden?: unknown;
}

export class ErrorCrearPatrocinador extends Error {
  status: number;
  campo?: string;

  constructor(mensaje: string, status = 400, campo?: string) {
    super(mensaje);
    this.name = "ErrorCrearPatrocinador";
    this.status = status;
    this.campo = campo;
  }
}

function convertirTexto(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function validarUrl(valor: string): boolean {
  try {
    const url = new URL(valor);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validarSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function obtenerNumero(valor: unknown, predeterminado: number): number {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor;
  }

  return predeterminado;
}

function validarRedes(valor: unknown): RedSocialPatrocinador[] {
  if (valor === undefined || valor === null) {
    return [];
  }

  if (!Array.isArray(valor)) {
    throw new ErrorCrearPatrocinador("Las redes sociales no son válidas.", 400, "redes");
  }

  return valor.map((elemento, indice): RedSocialPatrocinador => {
    if (typeof elemento !== "object" || elemento === null) {
      throw new ErrorCrearPatrocinador(`La red social ${indice + 1} no es válida.`, 400, "redes");
    }

    const red = elemento as RedSocialEntrada;
    const id = convertirTexto(red.id);
    const nombre = convertirTexto(red.nombre);
    const usuario = convertirTexto(red.usuario);
    const url = convertirTexto(red.url);
    const icono = convertirTexto(red.icono);

    if (!id) {
      throw new ErrorCrearPatrocinador(`Falta el identificador de la red social ${indice + 1}.`, 400, "redes");
    }

    if (!nombre) {
      throw new ErrorCrearPatrocinador(`Falta el nombre de la red social ${indice + 1}.`, 400, "redes");
    }

    if (!url || !validarUrl(url)) {
      throw new ErrorCrearPatrocinador(`La URL de la red social ${nombre} no es válida.`, 400, "redes");
    }

    return {
      id,
      nombre,
      usuario,
      url,
      icono,
      activo: red.activo !== false,
      orden: obtenerNumero(red.orden, indice + 1),
    };
  });
}

function validarEquiposIds(valor: unknown): string[] {
  if (valor === undefined || valor === null) {
    return [];
  }

  if (!Array.isArray(valor)) {
    throw new ErrorCrearPatrocinador("La selección de equipos no es válida.", 400, "equiposIds");
  }

  const ids = valor.map((equipoId) => convertirTexto(equipoId));

  if (ids.some((equipoId) => !equipoId || !validarUuid(equipoId))) {
    throw new ErrorCrearPatrocinador("Uno de los equipos seleccionados no es válido.", 400, "equiposIds");
  }

  return Array.from(new Set(ids as string[]));
}

function validarDatos(contenido: unknown): DatosCrearPatrocinador {
  if (typeof contenido !== "object" || contenido === null) {
    throw new ErrorCrearPatrocinador("Los datos del patrocinador no son válidos.");
  }

  const entrada = contenido as DatosCrearPatrocinadorEntrada;
  const nombre = convertirTexto(entrada.nombre);
  const nombreCorto = convertirTexto(entrada.nombreCorto);
  const slug = convertirTexto(entrada.slug)?.toLowerCase() ?? null;
  const descripcion = convertirTexto(entrada.descripcion);
  const web = convertirTexto(entrada.web);
  const logo = convertirTexto(entrada.logo);
  const banner = convertirTexto(entrada.banner);

  if (!nombre) {
    throw new ErrorCrearPatrocinador("El nombre del patrocinador es obligatorio.", 400, "nombre");
  }

  if (nombre.length > 150) {
    throw new ErrorCrearPatrocinador("El nombre no puede superar los 150 caracteres.", 400, "nombre");
  }

  if (nombreCorto && nombreCorto.length > 80) {
    throw new ErrorCrearPatrocinador("El nombre corto no puede superar los 80 caracteres.", 400, "nombreCorto");
  }

  if (!slug) {
    throw new ErrorCrearPatrocinador("El slug es obligatorio.", 400, "slug");
  }

  if (!validarSlug(slug)) {
    throw new ErrorCrearPatrocinador("El slug solo puede contener letras minúsculas, números y guiones.", 400, "slug");
  }

  if (descripcion && descripcion.length > 2_000) {
    throw new ErrorCrearPatrocinador("La descripción no puede superar los 2.000 caracteres.", 400, "descripcion");
  }

  if (web && !validarUrl(web)) {
    throw new ErrorCrearPatrocinador("La página web no es válida.", 400, "web");
  }

  return {
    nombre,
    nombreCorto,
    slug,
    descripcion,
    web,
    activo: entrada.activo === true,
    redes: validarRedes(entrada.redes),
    equiposIds: validarEquiposIds(entrada.equiposIds),
    logo,
    banner,
  };
}

function convertirAsignaciones(valor: unknown): AsignacionPatrocinadorJson[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.filter((elemento): elemento is AsignacionPatrocinadorJson => {
    if (typeof elemento !== "object" || elemento === null) {
      return false;
    }

    const asignacion = elemento as Partial<AsignacionPatrocinadorJson>;

    return (
      typeof asignacion.id === "string" &&
      typeof asignacion.fecha_asignacion === "string" &&
      typeof asignacion.asignado_por === "string"
    );
  });
}

export async function crearPatrocinador(contenido: unknown, administradorId: string, patrocinadorId = crypto.randomUUID()): Promise<PatrocinadorCreadoPanel> {
  const idAdministrador = administradorId.trim();

  if (!validarUuid(idAdministrador)) {
    throw new ErrorCrearPatrocinador("El administrador no es válido.", 401);
  }

  const idPatrocinador = patrocinadorId.trim();

    if (!validarUuid(idPatrocinador)) {
    throw new ErrorCrearPatrocinador("El identificador del patrocinador no es válido.");
    }

  const datos = validarDatos(contenido);

  const { data: patrocinadorExistente, error: errorComprobarSlug } = await supabaseServidor
    .from("patrocinadores")
    .select("id")
    .eq("slug", datos.slug)
    .limit(1)
    .maybeSingle();

  if (errorComprobarSlug) {
    throw new Error(`No se ha podido comprobar el patrocinador: ${errorComprobarSlug.message}`);
  }

  if (patrocinadorExistente?.id) {
    throw new ErrorCrearPatrocinador("Ya existe un patrocinador con este slug.", 409, "slug");
  }

  let equipos: FilaEquipo[] = [];

  if (datos.equiposIds.length > 0) {
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
      throw new ErrorCrearPatrocinador("No hay ninguna temporada activa.", 409, "equiposIds");
    }

    const { data: equiposEncontrados, error: errorEquipos } = await supabaseServidor
      .from("equipos")
      .select("id, patrocinadores")
      .eq("temporada_id", String(temporada.id))
      .eq("activo", true)
      .in("id", datos.equiposIds);

    if (errorEquipos) {
      throw new Error(`No se han podido comprobar los equipos: ${errorEquipos.message}`);
    }

    equipos = (equiposEncontrados ?? []) as FilaEquipo[];

    if (equipos.length !== datos.equiposIds.length) {
      throw new ErrorCrearPatrocinador("Uno o varios equipos no existen o no pertenecen a la temporada activa.", 400, "equiposIds");
    }
  }

  const { data: patrocinadorCreado, error: errorCrear } = await supabaseServidor
    .from("patrocinadores")
    .insert({
        id: idPatrocinador,
        nombre: datos.nombre,
        nombre_corto: datos.nombreCorto,
        slug: datos.slug,
        descripcion: datos.descripcion,
        logo: datos.logo,
        web: datos.web,
        redes: datos.redes,
        activo: false,
        banner: datos.banner,
    })
    .select("id, nombre, slug, activo, logo, banner")
    .single();

  if (errorCrear || !patrocinadorCreado?.id) {
    throw new Error(`No se ha podido crear el patrocinador: ${errorCrear?.message ?? "Respuesta no válida"}`);
  }

  const fechaAsignacion = new Date().toISOString();

  for (const equipo of equipos) {
    const asignacionesActuales = convertirAsignaciones(equipo.patrocinadores);
    const yaAsignado = asignacionesActuales.some((asignacion) => asignacion.id === patrocinadorCreado.id);

    if (yaAsignado) {
      continue;
    }

    const nuevasAsignaciones: AsignacionPatrocinadorJson[] = [
      ...asignacionesActuales,
      {
        id: patrocinadorCreado.id,
        fecha_asignacion: fechaAsignacion,
        asignado_por: idAdministrador,
      },
    ];

    const { error: errorAsignacion } = await supabaseServidor
      .from("equipos")
      .update({
        patrocinadores: nuevasAsignaciones,
        updated_at: fechaAsignacion,
      })
      .eq("id", equipo.id);

    if (errorAsignacion) {
      throw new Error(`No se ha podido asignar el patrocinador al equipo: ${errorAsignacion.message}`);
    }
  }

  if (datos.activo) {
    const { error: errorActivar } = await supabaseServidor
      .from("patrocinadores")
      .update({
        activo: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", patrocinadorCreado.id);

    if (errorActivar) {
      throw new Error(`El patrocinador se ha creado, pero no se ha podido activar: ${errorActivar.message}`);
    }
  }

  return {
    id: patrocinadorCreado.id,
    nombre: patrocinadorCreado.nombre?.trim() || datos.nombre,
    slug: patrocinadorCreado.slug?.trim() || datos.slug,
    activo: datos.activo,
    logo: patrocinadorCreado.logo?.trim() || null,
    banner: patrocinadorCreado.banner?.trim() || null,
    equiposAsignados: equipos.length,
  };
}