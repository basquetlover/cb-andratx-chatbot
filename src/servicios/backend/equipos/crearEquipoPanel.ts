import { supabaseServidor } from "../../supabase/servidor";

import type {
  DatosCrearEquipoPanel,
  EquipoCreadoPanel,
  ErrorCampoEquipo,
  PatrocinadorAsignadoEquipo,
} from "../../../types/EquipoPanel";

interface FilaEquipoCreado {
  id: string;
  temporada_id: string;
  nombre: string;
  nombre_corto: string | null;
  slug: string;
  categoria: string;
  genero: string;
  nivel: string | null;
  descripcion: string | null;
  activo: boolean | null;
  chatbot: boolean | null;
  id_equipo_fbib: string | null;
  mostrar_sponsor: boolean | null;
  created_at: string;
}

export class ErrorCrearEquipo extends Error {
  status: number;
  errores: ErrorCampoEquipo[];

  constructor(
    mensaje: string,
    status = 400,
    errores: ErrorCampoEquipo[] = [],
  ) {
    super(mensaje);
    this.name = "ErrorCrearEquipo";
    this.status = status;
    this.errores = errores;
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function convertirTexto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function convertirTextoOpcional(valor: unknown): string | null {
  const texto = convertirTexto(valor);

  return texto.length > 0 ? texto : null;
}

function convertirBooleano(valor: unknown, valorPredeterminado: boolean): boolean {
  return typeof valor === "boolean" ? valor : valorPredeterminado;
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function normalizarSlug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function convertirPatrocinadoresIds(valor: unknown): string[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return Array.from(
    new Set(
      valor
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => validarUuid(id)),
    ),
  );
}

function validarDatosEquipo(contenido: unknown): DatosCrearEquipoPanel {
  if (!esObjeto(contenido)) {
    throw new ErrorCrearEquipo("Los datos enviados no son válidos.");
  }

  const temporadaId = convertirTexto(contenido.temporadaId);
  const nombre = convertirTexto(contenido.nombre);
  const nombreCorto = convertirTextoOpcional(contenido.nombreCorto);
  const categoria = convertirTexto(contenido.categoria);
  const genero = convertirTexto(contenido.genero);
  const nivel = convertirTextoOpcional(contenido.nivel);
  const descripcion = convertirTextoOpcional(contenido.descripcion);
  const idEquipoFbib = convertirTextoOpcional(contenido.idEquipoFbib);
  const slugIntroducido = convertirTexto(contenido.slug);
  const slug = normalizarSlug(slugIntroducido || nombre);
  const patrocinadoresIds = convertirPatrocinadoresIds(
    contenido.patrocinadoresIds,
  );

  const errores: ErrorCampoEquipo[] = [];

  if (!validarUuid(temporadaId)) {
    errores.push({
      campo: "temporadaId",
      mensaje: "Selecciona una temporada válida.",
    });
  }

  if (nombre.length < 2 || nombre.length > 120) {
    errores.push({
      campo: "nombre",
      mensaje: "El nombre debe tener entre 2 y 120 caracteres.",
    });
  }

  if (nombreCorto && nombreCorto.length > 60) {
    errores.push({
      campo: "nombreCorto",
      mensaje: "El nombre corto no puede superar los 60 caracteres.",
    });
  }

  if (!slug || slug.length > 120) {
    errores.push({
      campo: "slug",
      mensaje: "El slug del equipo no es válido.",
    });
  }

  if (categoria.length < 2 || categoria.length > 60) {
    errores.push({
      campo: "categoria",
      mensaje: "Selecciona o escribe una categoría válida.",
    });
  }

  if (genero.length < 2 || genero.length > 30) {
    errores.push({
      campo: "genero",
      mensaje: "Selecciona un género válido.",
    });
  }

  if (nivel && nivel.length > 80) {
    errores.push({
      campo: "nivel",
      mensaje: "El nivel no puede superar los 80 caracteres.",
    });
  }

  if (descripcion && descripcion.length > 1_500) {
    errores.push({
      campo: "descripcion",
      mensaje: "La descripción no puede superar los 1.500 caracteres.",
    });
  }

  if (idEquipoFbib && idEquipoFbib.length > 100) {
    errores.push({
      campo: "idEquipoFbib",
      mensaje: "El identificador de la FBIB no es válido.",
    });
  }

  if (errores.length > 0) {
    throw new ErrorCrearEquipo(
      errores[0].mensaje,
      400,
      errores,
    );
  }

  return {
    temporadaId,
    nombre,
    nombreCorto,
    slug,
    categoria,
    genero,
    nivel,
    descripcion,
    activo: convertirBooleano(contenido.activo, true),
    chatbot: convertirBooleano(contenido.chatbot, false),
    idEquipoFbib,
    mostrarSponsor: convertirBooleano(
      contenido.mostrarSponsor,
      true,
    ),
    patrocinadoresIds,
  };
}

async function comprobarTemporada(temporadaId: string): Promise<void> {
  const { data, error } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("id", temporadaId)
    .maybeSingle();

  if (error) {
    throw new ErrorCrearEquipo(
      `No se ha podido comprobar la temporada: ${error.message}`,
      500,
    );
  }

  if (!data?.id) {
    throw new ErrorCrearEquipo(
      "La temporada seleccionada no existe.",
      400,
      [
        {
          campo: "temporadaId",
          mensaje: "La temporada seleccionada no existe.",
        },
      ],
    );
  }
}

async function comprobarSlug(
  temporadaId: string,
  slug: string,
): Promise<void> {
  const { data, error } = await supabaseServidor
    .from("equipos")
    .select("id")
    .eq("temporada_id", temporadaId)
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorCrearEquipo(
      `No se ha podido comprobar el slug: ${error.message}`,
      500,
    );
  }

  if (data?.id) {
    throw new ErrorCrearEquipo(
      "Ya existe un equipo con ese slug en la temporada seleccionada.",
      409,
      [
        {
          campo: "slug",
          mensaje: "Este slug ya está siendo utilizado por otro equipo.",
        },
      ],
    );
  }
}

async function comprobarPatrocinadores(
  patrocinadoresIds: string[],
): Promise<void> {
  if (patrocinadoresIds.length === 0) {
    return;
  }

  const { data, error } = await supabaseServidor
    .from("patrocinadores")
    .select("id")
    .in("id", patrocinadoresIds);

  if (error) {
    throw new ErrorCrearEquipo(
      `No se han podido comprobar los patrocinadores: ${error.message}`,
      500,
    );
  }

  const idsEncontrados = new Set(
    (data ?? []).map((patrocinador) => patrocinador.id),
  );

  const hayIdInvalido = patrocinadoresIds.some(
    (id) => !idsEncontrados.has(id),
  );

  if (hayIdInvalido) {
    throw new ErrorCrearEquipo(
      "Uno o varios patrocinadores seleccionados no existen.",
      400,
      [
        {
          campo: "patrocinadoresIds",
          mensaje: "Revisa los patrocinadores seleccionados.",
        },
      ],
    );
  }
}

export async function crearEquipoPanel(
  contenido: unknown,
  administradorId: string,
): Promise<EquipoCreadoPanel> {
  if (!validarUuid(administradorId)) {
    throw new ErrorCrearEquipo(
      "No se ha podido identificar al administrador.",
      401,
    );
  }

  const datos = validarDatosEquipo(contenido);

  await Promise.all([
    comprobarTemporada(datos.temporadaId),
    comprobarSlug(datos.temporadaId, datos.slug),
    comprobarPatrocinadores(datos.patrocinadoresIds),
  ]);

  const fechaAsignacion = new Date().toISOString();

  const patrocinadores: PatrocinadorAsignadoEquipo[] =
    datos.patrocinadoresIds.map((patrocinadorId) => ({
      id: patrocinadorId,
      fechaAsignacion,
      asignadoPor: administradorId,
    }));

  const patrocinadoresBaseDatos = patrocinadores.map(
    (patrocinador) => ({
      id: patrocinador.id,
      fecha_asignacion: patrocinador.fechaAsignacion,
      asignado_por: patrocinador.asignadoPor,
    }),
  );

  const { data: equipoCreado, error } = await supabaseServidor
    .from("equipos")
    .insert({
      temporada_id: datos.temporadaId,
      nombre: datos.nombre,
      nombre_corto: datos.nombreCorto,
      slug: datos.slug,
      categoria: datos.categoria,
      genero: datos.genero,
      nivel: datos.nivel,
      descripcion: datos.descripcion,
      imagen: null,
      activo: datos.activo,
      chatbot: datos.chatbot,
      patrocinadores: patrocinadoresBaseDatos,
      mostrar_sponsor: datos.mostrarSponsor,
      id_equipo_fbib: datos.idEquipoFbib,
      updated_at: new Date().toISOString(),
    })
    .select(`
      id,
      temporada_id,
      nombre,
      nombre_corto,
      slug,
      categoria,
      genero,
      nivel,
      descripcion,
      activo,
      chatbot,
      id_equipo_fbib,
      mostrar_sponsor,
      created_at
    `)
    .single();

  if (error) {
    const mensajeNormalizado = error.message.toLowerCase();

    if (
      mensajeNormalizado.includes("duplicate") ||
      mensajeNormalizado.includes("unique")
    ) {
      throw new ErrorCrearEquipo(
        "Ya existe un equipo con estos datos.",
        409,
      );
    }

    throw new ErrorCrearEquipo(
      `No se ha podido crear el equipo: ${error.message}`,
      500,
    );
  }

  const fila = equipoCreado as FilaEquipoCreado;

  return {
    id: fila.id,
    temporadaId: fila.temporada_id,
    nombre: fila.nombre,
    nombreCorto: fila.nombre_corto,
    slug: fila.slug,
    categoria: fila.categoria,
    genero: fila.genero,
    nivel: fila.nivel,
    descripcion: fila.descripcion,
    activo: fila.activo ?? false,
    chatbot: fila.chatbot ?? false,
    idEquipoFbib: fila.id_equipo_fbib,
    mostrarSponsor: fila.mostrar_sponsor ?? true,
    createdAt: fila.created_at,
  };
}