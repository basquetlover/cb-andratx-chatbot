
import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

// ======================================================
// C.B. ANDRATX
// DESIGNACIONES - LISTADO DE PERSONAL
//
// Servicio exclusivo del backend.
//
// Consulta árbitros y oficiales de mesa.
// No realiza operaciones de escritura.
// No requiere modificaciones SQL.
// ======================================================

// ======================================================
// TIPOS
// ======================================================

export type HabilitacionPersonalDesignacion =
  | "pista"
  | "mesa"
  | "ambos"
  | "sin_definir";

export interface PersonalDesignacion {
  id: string;

  codigo: string;
  nombreCompleto: string;

  habilitacion: HabilitacionPersonalDesignacion;

  nivelPista: string | null;
  nivelMesa: string | null;

  grupos: string[];

  activo: boolean;

  anotaciones: string;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface ResumenPersonalDesignaciones {
  total: number;
  activos: number;
  inactivos: number;

  soloPista: number;
  soloMesa: number;
  ambos: number;
  sinDefinir: number;
}

export interface FiltrosPersonalDesignaciones {
  incluirInactivos?: boolean;
}

export interface ResultadoListadoPersonalDesignaciones {
  personal: PersonalDesignacion[];

  resumen: ResumenPersonalDesignaciones;

  nivelesPista: string[];
  nivelesMesa: string[];

  gruposDisponibles: string[];
}

// ======================================================
// FILA REAL DE SUPABASE
// ======================================================

interface FilaPersonal {
  id: string;

  codigo: string | null;
  nombre_completo: string | null;

  habilitacion: string | null;

  nivel_pista: string | null;
  nivel_mesa: string | null;

  grupos: string[] | null;

  activo: boolean | null;

  anotaciones: string | null;

  created_at: string | null;
  updated_at: string | null;
}

// ======================================================
// ERRORES
// ======================================================

export class ErrorListadoPersonalDesignaciones
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorListadoPersonalDesignaciones";

    this.status = status;
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function texto(
  valor: unknown,
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function normalizarHabilitacion(
  valor: unknown,
): HabilitacionPersonalDesignacion {
  const habilitacion = texto(valor)
    .toLocaleLowerCase("es");

  if (
    [
      "ambos",
      "ambas",
      "pista y mesa",
      "mesa y pista",
    ].includes(habilitacion)
  ) {
    return "ambos";
  }

  if (
    [
      "pista",
      "arbitro",
      "árbitro",
    ].includes(habilitacion)
  ) {
    return "pista";
  }

  if (
    [
      "mesa",
      "oficial de mesa",
    ].includes(habilitacion)
  ) {
    return "mesa";
  }

  return "sin_definir";
}

function normalizarGrupos(
  valor: unknown,
): string[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const grupos = valor
    .filter(
      (grupo): grupo is string =>
        typeof grupo === "string",
    )
    .map(
      (grupo) => grupo.trim(),
    )
    .filter(Boolean);

  return Array.from(
    new Set(grupos),
  );
}

function convertirPersonal(
  fila: FilaPersonal,
): PersonalDesignacion {
  return {
    id: fila.id,

    codigo:
      texto(fila.codigo),

    nombreCompleto:
      texto(fila.nombre_completo),

    habilitacion:
      normalizarHabilitacion(
        fila.habilitacion,
      ),

    nivelPista:
      texto(fila.nivel_pista) || null,

    nivelMesa:
      texto(fila.nivel_mesa) || null,

    grupos:
      normalizarGrupos(fila.grupos),

    activo:
      fila.activo !== false,

    anotaciones:
      texto(fila.anotaciones),

    createdAt:
      fila.created_at,

    updatedAt:
      fila.updated_at,
  };
}

function ordenarTextos(
  valores: string[],
): string[] {
  return Array.from(
    new Set(
      valores.filter(Boolean),
    ),
  ).sort(
    (a, b) =>
      a.localeCompare(
        b,
        "es",
        {
          sensitivity: "base",
        },
      ),
  );
}

function ordenarPersonal(
  personal: PersonalDesignacion[],
): PersonalDesignacion[] {
  return [...personal].sort(
    (a, b) => {
      // Activos primero.

      if (a.activo !== b.activo) {
        return a.activo ? -1 : 1;
      }

      // Después por nombre.

      const comparacion =
        a.nombreCompleto.localeCompare(
          b.nombreCompleto,
          "es",
          {
            sensitivity: "base",
          },
        );

      if (comparacion !== 0) {
        return comparacion;
      }

      // Desempate estable.

      return a.id.localeCompare(b.id);
    },
  );
}

// ======================================================
// RESUMEN
// ======================================================

function calcularResumen(
  personal: PersonalDesignacion[],
): ResumenPersonalDesignaciones {
  return {
    total:
      personal.length,

    activos:
      personal.filter(
        (persona) => persona.activo,
      ).length,

    inactivos:
      personal.filter(
        (persona) => !persona.activo,
      ).length,

    soloPista:
      personal.filter(
        (persona) =>
          persona.habilitacion === "pista",
      ).length,

    soloMesa:
      personal.filter(
        (persona) =>
          persona.habilitacion === "mesa",
      ).length,

    ambos:
      personal.filter(
        (persona) =>
          persona.habilitacion === "ambos",
      ).length,

    sinDefinir:
      personal.filter(
        (persona) =>
          persona.habilitacion ===
          "sin_definir",
      ).length,
  };
}

// ======================================================
// CONSULTA PRINCIPAL
// ======================================================

export async function obtenerListadoPersonalDesignaciones(
  filtros: FiltrosPersonalDesignaciones = {},
): Promise<ResultadoListadoPersonalDesignaciones> {
  const incluirInactivos =
    filtros.incluirInactivos !== false;

  let consulta = supabaseServidor
    .from("designaciones_personal")
    .select(`
      id,
      codigo,
      nombre_completo,
      habilitacion,
      nivel_pista,
      nivel_mesa,
      grupos,
      activo,
      anotaciones,
      created_at,
      updated_at
    `);

  if (!incluirInactivos) {
    consulta = consulta.eq(
      "activo",
      true,
    );
  }

  const {
    data,
    error,
  } = await consulta.order(
    "nombre_completo",
    {
      ascending: true,
    },
  );

  if (error) {
    console.error(
      "[DESIGNACIONES] Error consultando personal:",
      {
        codigo: error.code,
        mensaje: error.message,
      },
    );

    throw new ErrorListadoPersonalDesignaciones(
      "No se ha podido obtener el listado de árbitros y oficiales de mesa.",
      500,
    );
  }

  const personal = ordenarPersonal(
    ((data ?? []) as FilaPersonal[])
      .map(convertirPersonal),
  );

  const nivelesPista =
    ordenarTextos(
      personal
        .map(
          (persona) =>
            persona.nivelPista ?? "",
        ),
    );

  const nivelesMesa =
    ordenarTextos(
      personal
        .map(
          (persona) =>
            persona.nivelMesa ?? "",
        ),
    );

  const gruposDisponibles =
    ordenarTextos(
      personal.flatMap(
        (persona) =>
          persona.grupos,
      ),
    );

  return {
    personal,

    resumen:
      calcularResumen(personal),

    nivelesPista,
    nivelesMesa,

    gruposDisponibles,
  };
}
