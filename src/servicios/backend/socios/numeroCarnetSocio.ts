import {
  supabaseServidor,
} from "../../supabase/servidor";

const PREFIJO_CARNET =
  "CBA-";

const LONGITUD_CODIGO_TEMPORADA =
  4;

const LONGITUD_MINIMA_NUMERO_SOCIO =
  3;

const EXPRESION_NUMERO_CARNET =
  /^CBA-[0-9]{7,}$/;

interface FilaNumeroSocio {
  numero_socio:
    | number
    | string
    | null;
}

export class ErrorNumeroCarnetSocio
  extends Error {
  constructor(
    mensaje: string,
  ) {
    super(mensaje);

    this.name =
      "ErrorNumeroCarnetSocio";
  }
}

function convertirNumeroEntero(
  valor: unknown,
): number | null {
  if (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
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
      Number.isSafeInteger(numero) &&
      numero >= 1
    ) {
      return numero;
    }
  }

  return null;
}

function extraerAnioFecha(
  fecha: string,
): number | null {
  const coincidencia =
    /^([0-9]{4})-[0-9]{2}-[0-9]{2}$/.exec(
      fecha.trim(),
    );

  if (!coincidencia) {
    return null;
  }

  const anio =
    Number(coincidencia[1]);

  return Number.isInteger(anio)
    ? anio
    : null;
}

function convertirDosUltimosDigitos(
  anio: number,
): string {
  return String(
    anio % 100,
  ).padStart(2, "0");
}

export function normalizarNumeroCarnetSocio(
  numeroCarnet: string,
): string {
  return numeroCarnet
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function esNumeroCarnetSocioValido(
  numeroCarnet: string,
): boolean {
  return EXPRESION_NUMERO_CARNET.test(
    normalizarNumeroCarnetSocio(
      numeroCarnet,
    ),
  );
}

export function obtenerCodigoTemporadaSocio(
  fechaInicio: string,
  fechaFin: string,
): string {
  const anioInicio =
    extraerAnioFecha(
      fechaInicio,
    );

  const anioFin =
    extraerAnioFecha(
      fechaFin,
    );

  if (
    anioInicio === null ||
    anioFin === null
  ) {
    throw new ErrorNumeroCarnetSocio(
      "Las fechas de la temporada no tienen un formato válido.",
    );
  }

  if (
    anioFin < anioInicio
  ) {
    throw new ErrorNumeroCarnetSocio(
      "La fecha final de la temporada no puede ser anterior a la fecha inicial.",
    );
  }

  return (
    convertirDosUltimosDigitos(
      anioInicio,
    ) +
    convertirDosUltimosDigitos(
      anioFin,
    )
  );
}

export function crearNumeroCarnetSocio(
  codigoTemporada: string,
  numeroSocio: number,
): string {
  const codigoLimpio =
    codigoTemporada
      .trim()
      .replace(/\D/g, "");

  if (
    codigoLimpio.length !==
    LONGITUD_CODIGO_TEMPORADA
  ) {
    throw new ErrorNumeroCarnetSocio(
      "El código de la temporada debe contener exactamente cuatro números.",
    );
  }

  if (
    !Number.isSafeInteger(
      numeroSocio,
    ) ||
    numeroSocio < 1
  ) {
    throw new ErrorNumeroCarnetSocio(
      "El número de socio debe ser un número entero mayor o igual que uno.",
    );
  }

  const numeroFormateado =
    String(
      numeroSocio,
    ).padStart(
      LONGITUD_MINIMA_NUMERO_SOCIO,
      "0",
    );

  return (
    PREFIJO_CARNET +
    codigoLimpio +
    numeroFormateado
  );
}

export const generarNumeroCarnetSocio =
  crearNumeroCarnetSocio;

export function obtenerNumeroSocioDesdeCarnet(
  numeroCarnet: string,
): number | null {
  const numeroNormalizado =
    normalizarNumeroCarnetSocio(
      numeroCarnet,
    );

  if (
    !esNumeroCarnetSocioValido(
      numeroNormalizado,
    )
  ) {
    return null;
  }

  const contenido =
    numeroNormalizado.slice(
      PREFIJO_CARNET.length,
    );

  const numeroSocioTexto =
    contenido.slice(
      LONGITUD_CODIGO_TEMPORADA,
    );

  return convertirNumeroEntero(
    numeroSocioTexto,
  );
}

export function obtenerCodigoTemporadaDesdeCarnet(
  numeroCarnet: string,
): string | null {
  const numeroNormalizado =
    normalizarNumeroCarnetSocio(
      numeroCarnet,
    );

  if (
    !esNumeroCarnetSocioValido(
      numeroNormalizado,
    )
  ) {
    return null;
  }

  return numeroNormalizado.slice(
    PREFIJO_CARNET.length,
    PREFIJO_CARNET.length +
      LONGITUD_CODIGO_TEMPORADA,
  );
}

export function generarPasswordCarnetSocio(
  numeroCarnet: string,
): string {
  const numeroNormalizado =
    normalizarNumeroCarnetSocio(
      numeroCarnet,
    );

  if (
    !esNumeroCarnetSocioValido(
      numeroNormalizado,
    )
  ) {
    throw new ErrorNumeroCarnetSocio(
      "No se puede generar la contraseña porque el número de carnet no es válido.",
    );
  }

  /*
   * La contraseña inicial del carnet es
   * exactamente su número de carnet:
   *
   * CBA-2627001
   *
   * Esta función no crea el hash. La
   * función que inserta el carnet debe
   * cifrar este valor antes de guardarlo.
   */
  return numeroNormalizado;
}

export async function obtenerSiguienteNumeroSocioTemporada(
  temporadaId: string,
): Promise<number> {
  const temporadaIdLimpio =
    temporadaId.trim();

  if (!temporadaIdLimpio) {
    throw new ErrorNumeroCarnetSocio(
      "La temporada es obligatoria para calcular el número de socio.",
    );
  }

  const {
    data,
    error,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .select(
        "numero_socio",
      )
      .eq(
        "temporada_id",
        temporadaIdLimpio,
      )
      .not(
        "numero_socio",
        "is",
        null,
      )
      .order(
        "numero_socio",
        {
          ascending: false,
          nullsFirst: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    console.error(
      "Error obteniendo el último número de socio de la temporada:",
      error,
    );

    throw new ErrorNumeroCarnetSocio(
      `No se ha podido calcular el siguiente número de socio: ${error.message}`,
    );
  }

  if (!data) {
    return 1;
  }

  const fila =
    data as FilaNumeroSocio;

  const numeroMayor =
    convertirNumeroEntero(
      fila.numero_socio,
    );

  if (
    numeroMayor === null
  ) {
    return 1;
  }

  const siguienteNumero =
    numeroMayor + 1;

  if (
    !Number.isSafeInteger(
      siguienteNumero,
    )
  ) {
    throw new ErrorNumeroCarnetSocio(
      "No se puede generar el siguiente número de socio.",
    );
  }

  return siguienteNumero;
}