
import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  obtenerInstalacionesDesignaciones,
} from "@servicios/backend/designaciones/obtenerInstalacionesDesignaciones";

import type {
  InstalacionDesignacion,
} from "@servicios/backend/designaciones/obtenerInstalacionesDesignaciones";

// ======================================================
// C.B. ANDRATX
// DATOS PARA CREACIÓN MANUAL DE PARTIDOS
//
// Solo lectura.
//
// - Temporada activa.
// - Equipos designables.
// - Instalaciones activas.
// - Numeración orientativa.
// ======================================================

export interface TemporadaCreacionPartidoCba {
  id: string;
  nombre: string;
  prefijo: string;
}

export interface EquipoCreacionPartidoCba {
  id: string;
  nombre: string;
  nombreCorto: string;
  categoria: string;
  genero: string;
}

export interface DatosCreacionPartidoCba {
  temporada: TemporadaCreacionPartidoCba;
  equipos: EquipoCreacionPartidoCba[];
  instalaciones: InstalacionDesignacion[];
  siguienteNumeroOrientativo: string;
  avisos: string[];
}

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  categoria: string | null;
  genero: string | null;
}

interface FilaNumeroPartido {
  numero_partido: string | null;
}

export class ErrorDatosCreacionPartidoCba extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);
    this.name = "ErrorDatosCreacionPartidoCba";
    this.status = status;
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function texto(valor: unknown): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function obtenerPrefijoTemporada(
  nombre: string,
): string {
  // Acepta 2026/2027, 2026-2027 y 2026/27.
  // No presupone que el nombre de la temporada
  // tenga siempre un formato específico.

  const coincidencia = nombre.match(
    /(?:^|[^\d])((?:19|20)\d{2})\s*[/\-–]\s*((?:19|20)?\d{2})(?!\d)/,
  );

  if (!coincidencia) {
    throw new ErrorDatosCreacionPartidoCba(
      "El nombre de la temporada activa no permite generar la numeración CBA. Comprueba su formato.",
      422,
    );
  }

  const inicio = Number(coincidencia[1]);
  const finalTexto = coincidencia[2];

  const final = finalTexto.length === 2
    ? Math.floor(inicio / 100) * 100 + Number(finalTexto)
    : Number(finalTexto);

  if (final !== inicio + 1) {
    throw new ErrorDatosCreacionPartidoCba(
      "La temporada activa debe indicar dos años consecutivos para generar la numeración CBA.",
      422,
    );
  }

  return (
    String(inicio).slice(-2) +
    String(final).slice(-2)
  );
}

// ======================================================
// TEMPORADA ACTIVA
// ======================================================

async function obtenerTemporadaActiva():
Promise<TemporadaCreacionPartidoCba> {
  const {
    data,
    error,
  } = await supabaseServidor
    .from("temporadas")
    .select("id, nombre")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorDatosCreacionPartidoCba(
      `No se ha podido consultar la temporada activa: ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new ErrorDatosCreacionPartidoCba(
      "No existe ninguna temporada activa.",
      404,
    );
  }

  const fila = data as FilaTemporada;
  const nombre = texto(fila.nombre);

  return {
    id: fila.id,
    nombre,
    prefijo: obtenerPrefijoTemporada(nombre),
  };
}

// ======================================================
// EQUIPOS DESIGNABLES
// ======================================================

async function obtenerEquipos(
  temporadaId: string,
): Promise<EquipoCreacionPartidoCba[]> {
  const {
    data,
    error,
  } = await supabaseServidor
    .from("equipos")
    .select(`
      id,
      nombre,
      nombre_corto,
      categoria,
      genero
    `)
    .eq("temporada_id", temporadaId)
    .eq("activo", true)
    .eq("designable", true)
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    throw new ErrorDatosCreacionPartidoCba(
      `No se han podido consultar los equipos designables: ${error.message}`,
    );
  }

  return ((data ?? []) as FilaEquipo[]).map(
    (equipo) => ({
      id: equipo.id,
      nombre: texto(equipo.nombre),
      nombreCorto: texto(equipo.nombre_corto),
      categoria: texto(equipo.categoria),
      genero: texto(equipo.genero),
    }),
  );
}

// ======================================================
// SIGUIENTE NÚMERO ORIENTATIVO
// ======================================================

async function obtenerSiguienteNumeroOrientativo(
  temporadaId: string,
  prefijo: string,
): Promise<string> {
  const {
    data,
    error,
  } = await supabaseServidor
    .from("designaciones_partidos")
    .select("numero_partido")
    .eq("temporada_id", temporadaId)
    .eq("origen", "cba")
    .like("numero_partido", `CBA-${prefijo}%`);

  if (error) {
    throw new ErrorDatosCreacionPartidoCba(
      `No se ha podido consultar la numeración de partidos: ${error.message}`,
    );
  }

  const expresion = new RegExp(
    `^CBA-${prefijo}(\\d{3,})$`,
  );

  let ultimo = 0;

  for (const fila of (data ?? []) as FilaNumeroPartido[]) {
    const numeroPartido = texto(
      fila.numero_partido,
    );

    const coincidencia = numeroPartido.match(
      expresion,
    );

    if (!coincidencia) {
      continue;
    }

    const numero = Number(coincidencia[1]);

    if (
      Number.isSafeInteger(numero) &&
      numero > ultimo
    ) {
      ultimo = numero;
    }
  }

  if (ultimo >= 999999) {
    throw new ErrorDatosCreacionPartidoCba(
      "Se ha alcanzado el límite de numeración de partidos CBA para esta temporada.",
      409,
    );
  }

  return `CBA-${prefijo}${String(
    ultimo + 1,
  ).padStart(3, "0")}`;
}

// ======================================================
// SERVICIO PRINCIPAL
// ======================================================

export async function obtenerDatosCreacionPartidoCba():
Promise<DatosCreacionPartidoCba> {
  const avisos: string[] = [];

  const temporada =
    await obtenerTemporadaActiva();

  const [
    equipos,
    resultadoInstalaciones,
    siguienteNumeroOrientativo,
  ] = await Promise.all([
    obtenerEquipos(temporada.id),

    obtenerInstalacionesDesignaciones({
      incluirInactivas: false,
    }),

    obtenerSiguienteNumeroOrientativo(
      temporada.id,
      temporada.prefijo,
    ),
  ]);

  const instalaciones =
    resultadoInstalaciones.instalaciones.filter(
      (instalacion) => instalacion.activa,
    );

  if (equipos.length === 0) {
    avisos.push(
      "No hay equipos activos y designables en la temporada actual.",
    );
  }

  if (instalaciones.length === 0) {
    avisos.push(
      "No hay instalaciones activas disponibles.",
    );
  }

  avisos.push(
    "El número mostrado es orientativo. El número definitivo deberá asignarse en el momento de guardar el partido.",
  );

  return {
    temporada,
    equipos,
    instalaciones,
    siguienteNumeroOrientativo,
    avisos,
  };
}
