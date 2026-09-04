import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  convertirFilaResumenSocioPanel,
} from "./convertirFilaSocioPanel";

import type {
  FiltrosListadoSociosPanel,
  ResultadoListadoSociosPanel,
} from "@tipos/SocioPanel";

interface FilaTemporada {
  id: string;
}

const PAGINA_PREDETERMINADA =
  1;

const LIMITE_PREDETERMINADO =
  20;

const LIMITE_MAXIMO =
  100;

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

function convertirEnteroPositivo(
  valor: unknown,
  predeterminado: number,
): number {
  if (
    typeof valor === "number" &&
    Number.isInteger(valor) &&
    valor >= 1
  ) {
    return valor;
  }

  if (
    typeof valor === "string"
  ) {
    const numero =
      Number(valor);

    if (
      Number.isInteger(numero) &&
      numero >= 1
    ) {
      return numero;
    }
  }

  return predeterminado;
}

function limpiarBusqueda(
  valor: string | undefined,
): string {
  if (!valor) {
    return "";
  }

  /*
   * Estos caracteres pueden alterar la
   * sintaxis del filtro OR de PostgREST.
   */
  return valor
    .trim()
    .replace(
      /[,%()"'\\]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .slice(0, 100);
}

async function obtenerTemporadaActivaId():
  Promise<string | null> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("temporadas")
      .select("id")
      .eq(
        "activa",
        true,
      )
      .order(
        "fecha_inicio",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorObtenerListadoSociosPanel(
      `No se ha podido consultar la temporada activa: ${error.message}`,
      500,
    );
  }

  if (!data) {
    return null;
  }

  return (
    data as
      FilaTemporada
  ).id;
}

function crearSeleccion(
  relacionObligatoria: boolean,
): string {
  const relacionCarnets =
    relacionObligatoria
      ? "carnets:socios_temporadas!inner"
      : "carnets:socios_temporadas";

  return `
    id,
    nombre,
    apellidos,
    email,
    telefono,
    activo,
    created_at,
    updated_at,

    ${relacionCarnets} (
      id,
      socio_id,
      temporada_id,

      numero_socio,
      numero_carnet,

      tipo_socio,
      estado,

      fecha_alta,
      fecha_caducidad,

      motivo_bloqueo,

      activado_at,
      activado_por,

      bloqueado_at,
      bloqueado_por,

      version_acceso,

      password_updated_at,
      intentos_fallidos,
      bloqueado_hasta,
      ultimo_acceso_at,
      email_bienvenida_enviado_at,

      created_at,
      updated_at,

      temporada:temporadas (
        id,
        nombre,
        fecha_inicio,
        fecha_fin,
        activa
      )
    )
  `;
}

export async function obtenerListadoSociosPanel(
  filtros:
    FiltrosListadoSociosPanel = {},
): Promise<ResultadoListadoSociosPanel> {
  const pagina =
    convertirEnteroPositivo(
      filtros.pagina,
      PAGINA_PREDETERMINADA,
    );

  const limite =
    Math.min(
      convertirEnteroPositivo(
        filtros.limite,
        LIMITE_PREDETERMINADO,
      ),
      LIMITE_MAXIMO,
    );

  const busqueda =
    limpiarBusqueda(
      filtros.busqueda,
    );

  const filtroActividad =
    filtros.activo ??
    "todos";

  const filtroEstado =
    filtros.estado ??
    "todos";

  const temporadaFiltradaId =
    filtros.temporadaId
      ?.trim() || null;

  const temporadaActivaId =
    temporadaFiltradaId ??
    await obtenerTemporadaActivaId();

  const filtraPorCarnet =
    Boolean(
      temporadaFiltradaId,
    ) ||
    filtroEstado !==
      "todos";

  const desde =
    (pagina - 1) *
    limite;

  const hasta =
    desde +
    limite -
    1;

  let consulta =
    supabaseServidor
      .from("socios")
      .select(
        crearSeleccion(
          filtraPorCarnet,
        ),
        {
          count: "exact",
        },
      );

  if (busqueda) {
    consulta =
      consulta.or(
        [
          `nombre.ilike.%${busqueda}%`,
          `apellidos.ilike.%${busqueda}%`,
          `email.ilike.%${busqueda}%`,
          `telefono.ilike.%${busqueda}%`,
        ].join(","),
      );
  }

  if (
    filtroActividad ===
    "activos"
  ) {
    consulta =
      consulta.eq(
        "activo",
        true,
      );
  }

  if (
    filtroActividad ===
    "inactivos"
  ) {
    consulta =
      consulta.eq(
        "activo",
        false,
      );
  }

  if (
    temporadaFiltradaId
  ) {
    consulta =
      consulta.eq(
        "carnets.temporada_id",
        temporadaFiltradaId,
      );
  }

  if (
    filtroEstado !==
    "todos"
  ) {
    consulta =
      consulta.eq(
        "carnets.estado",
        filtroEstado,
      );
  }

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
    console.error(
      "Error obteniendo el listado de socios:",
      {
        filtros,
        error,
      },
    );

    throw new ErrorObtenerListadoSociosPanel(
      `No se ha podido obtener el listado de socios: ${error.message}`,
      500,
    );
  }

  const socios =
    (data ?? [])
      .flatMap(
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

  const totalPaginas =
    total === 0
      ? 0
      : Math.ceil(
          total /
          limite,
        );

  return {
    socios,
    total,
    pagina,
    limite,
    totalPaginas,
  };
}