import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  convertirFilaResumenSocioPanel,
} from "./convertirFilaSocioPanel";

import type {
  EstadoCarnetSocio,
  FiltrosListadoSocios,
  ResultadoListadoSocios,
} from "@tipos/SocioPanel";

interface FilaTemporadaActiva {
  id: string;
}

interface FilaRelacionSocio {
  socio_id: string;
}

export class ErrorObtenerListadoSociosPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerListadoSociosPanel";

    this.status = status;
  }
}

function normalizarPagina(
  valor: unknown,
): number {
  if (
    typeof valor !== "number" ||
    !Number.isInteger(valor) ||
    valor < 1
  ) {
    return 1;
  }

  return valor;
}

function normalizarLimite(
  valor: unknown,
): number {
  if (
    typeof valor !== "number" ||
    !Number.isInteger(valor)
  ) {
    return 20;
  }

  return Math.min(
    100,
    Math.max(
      1,
      valor,
    ),
  );
}

function normalizarConsulta(
  valor: unknown,
): string {
  if (
    typeof valor !== "string"
  ) {
    return "";
  }

  return valor
    .trim()
    .slice(0, 100)
    .replace(
      /[,%()]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function esEstadoCarnet(
  valor: unknown,
): valor is EstadoCarnetSocio {
  return (
    valor === "pendiente" ||
    valor === "activo" ||
    valor === "bloqueado" ||
    valor === "caducado"
  );
}

async function obtenerTemporadaActivaId(): Promise<
  string | null
> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("temporadas")
      .select("id")
      .eq("activa", true)
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorObtenerListadoSociosPanel(
      `No se ha podido obtener la temporada activa: ${error.message}`,
      500,
    );
  }

  const temporada =
    data as
      | FilaTemporadaActiva
      | null;

  return (
    temporada?.id ??
    null
  );
}

async function obtenerSociosPermitidosPorCarnet(
  temporadaId:
    string | null,
  estado:
    EstadoCarnetSocio | null,
): Promise<string[] | null> {
  if (
    !temporadaId &&
    !estado
  ) {
    return null;
  }

  if (
    estado &&
    !temporadaId
  ) {
    return [];
  }

  let consulta =
    supabaseServidor
      .from("socios_temporadas")
      .select("socio_id");

  if (temporadaId) {
    consulta =
      consulta.eq(
        "temporada_id",
        temporadaId,
      );
  }

  if (estado) {
    consulta =
      consulta.eq(
        "estado",
        estado,
      );
  }

  const {
    data,
    error,
  } = await consulta;

  if (error) {
    throw new ErrorObtenerListadoSociosPanel(
      `No se han podido aplicar los filtros de carnets: ${error.message}`,
      500,
    );
  }

  const filas =
    (data ?? []) as
      FilaRelacionSocio[];

  return Array.from(
    new Set(
      filas
        .map(
          (fila) =>
            fila.socio_id,
        )
        .filter(Boolean),
    ),
  );
}

export async function obtenerListadoSociosPanel(
  filtros:
    FiltrosListadoSocios = {},
): Promise<ResultadoListadoSocios> {
  const pagina =
    normalizarPagina(
      filtros.pagina,
    );

  const limite =
    normalizarLimite(
      filtros.limite,
    );

  const consultaTexto =
    normalizarConsulta(
      filtros.consulta,
    );

  const temporadaActivaId =
    await obtenerTemporadaActivaId();

  const temporadaSolicitada =
    typeof filtros.temporadaId ===
      "string" &&
    esUuidValido(
      filtros.temporadaId.trim(),
    )
      ? filtros.temporadaId.trim()
      : null;

  const estadoSolicitado =
    esEstadoCarnet(
      filtros.estado,
    )
      ? filtros.estado
      : null;

  const temporadaFiltro =
    temporadaSolicitada ??
    (
      estadoSolicitado
        ? temporadaActivaId
        : null
    );

  const sociosPermitidos =
    await obtenerSociosPermitidosPorCarnet(
      temporadaFiltro,
      estadoSolicitado,
    );

  if (
    sociosPermitidos &&
    sociosPermitidos.length === 0
  ) {
    return {
      socios: [],
      total: 0,
      pagina,
      limite,
      totalPaginas: 0,
    };
  }

  let consulta =
    supabaseServidor
      .from("socios")
      .select(
        `
          id,
          numero_socio,
          nombre,
          apellidos,
          email,
          telefono,
          activo,
          created_at,
          updated_at,
          socios_temporadas (
            id,
            socio_id,
            temporada_id,
            numero_carnet,
            tipo_socio,
            estado,
            fecha_alta,
            fecha_caducidad,
            activado_at,
            bloqueado_at,
            motivo_bloqueo,
            bloqueado_hasta,
            email_bienvenida_enviado_at,
            ultimo_acceso_at,
            intentos_fallidos,
            version_acceso,
            created_at,
            updated_at,
            temporadas (
              id,
              nombre,
              activa,
              fecha_inicio,
              fecha_fin
            )
          )
        `,
        {
          count: "exact",
        },
      );

  if (
    sociosPermitidos
  ) {
    consulta =
      consulta.in(
        "id",
        sociosPermitidos,
      );
  }

  if (
    filtros.activo ===
    "activos"
  ) {
    consulta =
      consulta.eq(
        "activo",
        true,
      );
  }

  if (
    filtros.activo ===
    "inactivos"
  ) {
    consulta =
      consulta.eq(
        "activo",
        false,
      );
  }

  if (consultaTexto) {
    const numeroBuscado =
      /^\d+$/.test(
        consultaTexto,
      )
        ? Number(
            consultaTexto,
          )
        : null;

    const filtrosBusqueda = [
      `nombre.ilike.%${consultaTexto}%`,
      `apellidos.ilike.%${consultaTexto}%`,
      `email.ilike.%${consultaTexto}%`,
    ];

    if (
      numeroBuscado !== null &&
      Number.isSafeInteger(
        numeroBuscado,
      )
    ) {
      filtrosBusqueda.push(
        `numero_socio.eq.${numeroBuscado}`,
      );
    }

    consulta =
      consulta.or(
        filtrosBusqueda.join(
          ",",
        ),
      );
  }

  const desde =
    (pagina - 1) *
    limite;

  const hasta =
    desde +
    limite -
    1;

  const {
    data,
    error,
    count,
  } =
    await consulta
      .order(
        "apellidos",
        {
          ascending: true,
        },
      )
      .order(
        "nombre",
        {
          ascending: true,
        },
      )
      .range(
        desde,
        hasta,
      );

  if (error) {
    throw new ErrorObtenerListadoSociosPanel(
      `No se ha podido obtener el listado de socios: ${error.message}`,
      500,
    );
  }

  const socios =
    (data ?? []).flatMap(
      (fila) => {
        const socio =
          convertirFilaResumenSocioPanel(
            fila,
            temporadaActivaId,
          );

        return socio
          ? [socio]
          : [];
      },
    );

  const total =
    count ?? 0;

  return {
    socios,
    total,
    pagina,
    limite,

    totalPaginas:
      total === 0
        ? 0
        : Math.ceil(
            total /
              limite,
          ),
  };
}