
import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

// ======================================================
// C.B. ANDRATX
// INSTALACIONES PARA DESIGNACIONES
//
// Reutiliza la tabla "instalaciones" existente.
//
// - No crea instalaciones.
// - No modifica registros.
// - No utiliza funciones SQL.
// - No genera relaciones automáticas.
// - Devuelve los UUID reales de Supabase.
// ======================================================

// ======================================================
// TIPOS PÚBLICOS
// ======================================================

export interface InstalacionDesignacion {
  id: string;

  nombre: string;
  nombreCorto: string;

  direccion: string;
  localidad: string;

  activa: boolean;

  etiqueta: string;
}

export interface ResultadoInstalacionesDesignaciones {
  instalaciones: InstalacionDesignacion[];

  total: number;
  totalActivas: number;
}

export interface OpcionesInstalacionesDesignaciones {
  /**
   * Si un partido ya tiene una instalación
   * inactiva, permitimos recuperarla para
   * mostrar correctamente su información.
   *
   * No significa que todas las instalaciones
   * inactivas estén disponibles para nuevas
   * designaciones.
   */
  instalacionSeleccionadaId?: string | null;

  /**
   * false:
   *   Solo instalaciones activas y,
   *   opcionalmente, la seleccionada.
   *
   * true:
   *   Todas las instalaciones.
   */
  incluirInactivas?: boolean;
}

// ======================================================
// TIPOS INTERNOS DE SUPABASE
// ======================================================

interface FilaInstalacion {
  id: string;

  nombre: string | null;
  nombre_corto: string | null;

  direccion: string | null;
  localidad: string | null;

  activa: boolean | null;
}

// ======================================================
// ERRORES
// ======================================================

export class ErrorInstalacionesDesignaciones
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorInstalacionesDesignaciones";

    this.status = status;
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function convertirTexto(
  valor: unknown,
): string {
  if (
    typeof valor !== "string"
  ) {
    return "";
  }

  return valor.trim();
}

function validarUuid(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function crearEtiqueta(
  nombre: string,
  localidad: string,
): string {
  if (!localidad) {
    return nombre;
  }

  const nombreNormalizado =
    nombre.toLocaleLowerCase("es");

  const localidadNormalizada =
    localidad.toLocaleLowerCase("es");

  // Evitamos repetir la localidad cuando
  // ya está incluida en el nombre.

  if (
    nombreNormalizado.includes(
      localidadNormalizada,
    )
  ) {
    return nombre;
  }

  return `${nombre} · ${localidad}`;
}

function convertirInstalacion(
  fila: FilaInstalacion,
): InstalacionDesignacion {
  const nombre =
    convertirTexto(fila.nombre) ||
    "Instalación sin nombre";

  const nombreCorto =
    convertirTexto(
      fila.nombre_corto,
    );

  const direccion =
    convertirTexto(
      fila.direccion,
    );

  const localidad =
    convertirTexto(
      fila.localidad,
    );

  return {
    id: fila.id,

    nombre,
    nombreCorto,

    direccion,
    localidad,

    activa:
      fila.activa === true,

    etiqueta:
      crearEtiqueta(
        nombre,
        localidad,
      ),
  };
}

function ordenarInstalaciones(
  instalaciones: InstalacionDesignacion[],
): InstalacionDesignacion[] {
  return instalaciones.sort(
    (instalacionA, instalacionB) => {
      // Las activas aparecen primero.

      if (
        instalacionA.activa !==
        instalacionB.activa
      ) {
        return instalacionA.activa
          ? -1
          : 1;
      }

      // Después orden alfabético.

      return instalacionA.nombre.localeCompare(
        instalacionB.nombre,
        "es",
        {
          sensitivity: "base",
        },
      );
    },
  );
}

// ======================================================
// CONSULTAR INSTALACIONES
// ======================================================

async function consultarInstalaciones(
  incluirInactivas: boolean,
): Promise<FilaInstalacion[]> {
  let consulta = supabaseServidor
    .from("instalaciones")
    .select(`
      id,
      nombre,
      nombre_corto,
      direccion,
      localidad,
      activa
    `);

  if (!incluirInactivas) {
    consulta = consulta.eq(
      "activa",
      true,
    );
  }

  const {
    data,
    error,
  } = await consulta.order(
    "nombre",
    {
      ascending: true,
    },
  );

  if (error) {
    throw new ErrorInstalacionesDesignaciones(
      `No se han podido consultar las instalaciones: ${error.message}`,
    );
  }

  return (
    data ?? []
  ) as FilaInstalacion[];
}

// ======================================================
// CONSULTAR UNA INSTALACIÓN POR UUID
// ======================================================

export async function obtenerInstalacionDesignacionPorId(
  instalacionId: string,
): Promise<InstalacionDesignacion | null> {
  const id = instalacionId.trim();

  if (!validarUuid(id)) {
    throw new ErrorInstalacionesDesignaciones(
      "El identificador de la instalación no es válido.",
      400,
    );
  }

  const {
    data,
    error,
  } = await supabaseServidor
    .from("instalaciones")
    .select(`
      id,
      nombre,
      nombre_corto,
      direccion,
      localidad,
      activa
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new ErrorInstalacionesDesignaciones(
      `No se ha podido consultar la instalación: ${error.message}`,
    );
  }

  if (!data?.id) {
    return null;
  }

  return convertirInstalacion(
    data as FilaInstalacion,
  );
}

// ======================================================
// LISTADO PARA EL SELECTOR
// ======================================================

export async function obtenerInstalacionesDesignaciones(
  opciones: OpcionesInstalacionesDesignaciones = {},
): Promise<ResultadoInstalacionesDesignaciones> {
  const incluirInactivas =
    opciones.incluirInactivas === true;

  const seleccionadaId =
    convertirTexto(
      opciones.instalacionSeleccionadaId,
    );

  if (
    seleccionadaId &&
    !validarUuid(seleccionadaId)
  ) {
    throw new ErrorInstalacionesDesignaciones(
      "La instalación seleccionada no tiene un UUID válido.",
      400,
    );
  }

  // --------------------------------------------------
  // 1. CONSULTAR INSTALACIONES
  // --------------------------------------------------

  const filas =
    await consultarInstalaciones(
      incluirInactivas,
    );

  const instalaciones =
    filas.map(
      convertirInstalacion,
    );

  // --------------------------------------------------
  // 2. CONSERVAR INSTALACIÓN SELECCIONADA
  // --------------------------------------------------

  // Si la instalación seleccionada está inactiva,
  // no aparecerá en el listado de activas.
  //
  // La recuperamos individualmente para que
  // los partidos históricos no pierdan su
  // información en el formulario.

  if (
    seleccionadaId &&
    !instalaciones.some(
      (instalacion) =>
        instalacion.id === seleccionadaId,
    )
  ) {
    const seleccionada =
      await obtenerInstalacionDesignacionPorId(
        seleccionadaId,
      );

    if (seleccionada) {
      instalaciones.push(
        seleccionada,
      );
    }
  }

  // --------------------------------------------------
  // 3. ORDENAR Y DEVOLVER
  // --------------------------------------------------

  const ordenadas =
    ordenarInstalaciones(
      instalaciones,
    );

  return {
    instalaciones:
      ordenadas,

    total:
      ordenadas.length,

    totalActivas:
      ordenadas.filter(
        (instalacion) =>
          instalacion.activa,
      ).length,
  };
}

// ======================================================
// VALIDACIÓN PARA EL BACKEND DE GUARDADO
// ======================================================

export async function comprobarInstalacionDesignacion(
  instalacionId: string | null,
): Promise<InstalacionDesignacion | null> {
  if (!instalacionId) {
    return null;
  }

  const instalacion =
    await obtenerInstalacionDesignacionPorId(
      instalacionId,
    );

  if (!instalacion) {
    throw new ErrorInstalacionesDesignaciones(
      "La instalación seleccionada no existe.",
      400,
    );
  }

  return instalacion;
}
