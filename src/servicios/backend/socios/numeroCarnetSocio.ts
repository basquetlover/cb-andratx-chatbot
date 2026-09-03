export interface NumeroCarnetSocioDescompuesto {
  numeroCarnet: string;

  temporada: {
    codigo: string;
    anioInicio: number;
    anioFin: number;
  };

  numeroSocio: number;
}

const PREFIJO_CARNET =
  "CBA";

const LONGITUD_MINIMA_NUMERO_SOCIO =
  3;

function convertirEntero(
  valor: unknown,
): number | null {
  if (
    typeof valor === "number" &&
    Number.isInteger(valor)
  ) {
    return valor;
  }

  if (
    typeof valor !== "string"
  ) {
    return null;
  }

  const texto =
    valor.trim();

  if (
    !/^\d+$/.test(texto)
  ) {
    return null;
  }

  const numero =
    Number(texto);

  if (
    !Number.isSafeInteger(numero)
  ) {
    return null;
  }

  return numero;
}

function obtenerAniosTemporadaDesdeNombre(
  nombreTemporada: string,
): {
  anioInicio: number;
  anioFin: number;
} | null {
  const texto =
    nombreTemporada.trim();

  const coincidenciaCompleta =
    texto.match(
      /(?:^|\D)(20\d{2})\D+(20\d{2})(?:\D|$)/,
    );

  if (coincidenciaCompleta) {
    const anioInicio =
      Number(
        coincidenciaCompleta[1],
      );

    const anioFin =
      Number(
        coincidenciaCompleta[2],
      );

    if (
      anioFin ===
      anioInicio + 1
    ) {
      return {
        anioInicio,
        anioFin,
      };
    }
  }

  const coincidenciaCorta =
    texto.match(
      /(?:^|\D)(20\d{2})\D+(\d{2})(?:\D|$)/,
    );

  if (coincidenciaCorta) {
    const anioInicio =
      Number(
        coincidenciaCorta[1],
      );

    const siglo =
      Math.floor(
        anioInicio / 100,
      ) * 100;

    let anioFin =
      siglo +
      Number(
        coincidenciaCorta[2],
      );

    if (
      anioFin <
      anioInicio
    ) {
      anioFin += 100;
    }

    if (
      anioFin ===
      anioInicio + 1
    ) {
      return {
        anioInicio,
        anioFin,
      };
    }
  }

  return null;
}

function crearCodigoTemporada(
  anioInicio: number,
  anioFin: number,
): string {
  if (
    !Number.isInteger(
      anioInicio,
    ) ||
    !Number.isInteger(
      anioFin,
    )
  ) {
    throw new Error(
      "Los años de la temporada no son válidos.",
    );
  }

  if (
    anioInicio < 2000 ||
    anioInicio > 2099 ||
    anioFin !==
      anioInicio + 1
  ) {
    throw new Error(
      "La temporada debe contener dos años consecutivos entre 2000 y 2099.",
    );
  }

  const inicio =
    String(
      anioInicio,
    ).slice(-2);

  const fin =
    String(
      anioFin,
    ).slice(-2);

  return `${inicio}${fin}`;
}

function formatearNumeroSocio(
  numeroSocio: number,
): string {
  if (
    !Number.isSafeInteger(
      numeroSocio,
    ) ||
    numeroSocio < 1
  ) {
    throw new Error(
      "El número de socio no es válido.",
    );
  }

  return String(
    numeroSocio,
  ).padStart(
    LONGITUD_MINIMA_NUMERO_SOCIO,
    "0",
  );
}

export function generarNumeroCarnetSocio(
  numeroSocio: number,
  anioInicio: number,
  anioFin: number,
): string {
  const codigoTemporada =
    crearCodigoTemporada(
      anioInicio,
      anioFin,
    );

  const numeroFormateado =
    formatearNumeroSocio(
      numeroSocio,
    );

  return (
    `${PREFIJO_CARNET}-` +
    `${codigoTemporada}` +
    `${numeroFormateado}`
  );
}

export function generarNumeroCarnetDesdeTemporada(
  numeroSocio: number,
  nombreTemporada: string,
): string {
  const temporada =
    obtenerAniosTemporadaDesdeNombre(
      nombreTemporada,
    );

  if (!temporada) {
    throw new Error(
      `No se han podido obtener los años de la temporada "${nombreTemporada}".`,
    );
  }

  return generarNumeroCarnetSocio(
    numeroSocio,
    temporada.anioInicio,
    temporada.anioFin,
  );
}

export function normalizarNumeroCarnetSocio(
  valor: unknown,
): string {
  if (
    typeof valor !== "string"
  ) {
    return "";
  }

  return valor
    .trim()
    .toUpperCase()
    .replace(
      /\s+/g,
      "",
    );
}

export function esNumeroCarnetSocioValido(
  valor: unknown,
): boolean {
  const numeroCarnet =
    normalizarNumeroCarnetSocio(
      valor,
    );

  return /^CBA-\d{7,}$/.test(
    numeroCarnet,
  );
}

export function descomponerNumeroCarnetSocio(
  valor: unknown,
): NumeroCarnetSocioDescompuesto | null {
  const numeroCarnet =
    normalizarNumeroCarnetSocio(
      valor,
    );

  const coincidencia =
    numeroCarnet.match(
      /^CBA-(\d{2})(\d{2})(\d{3,})$/,
    );

  if (!coincidencia) {
    return null;
  }

  const anioInicioCorto =
    Number(
      coincidencia[1],
    );

  const anioFinCorto =
    Number(
      coincidencia[2],
    );

  const numeroSocio =
    convertirEntero(
      coincidencia[3],
    );

  if (
    numeroSocio === null ||
    numeroSocio < 1
  ) {
    return null;
  }

  const anioInicio =
    2000 +
    anioInicioCorto;

  const anioFin =
    2000 +
    anioFinCorto;

  if (
    anioFin !==
      anioInicio + 1
  ) {
    return null;
  }

  return {
    numeroCarnet,

    temporada: {
      codigo:
        `${coincidencia[1]}` +
        `${coincidencia[2]}`,

      anioInicio,
      anioFin,
    },

    numeroSocio,
  };
}

export function obtenerPasswordInicialCarnet(
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
    throw new Error(
      "No se puede generar la contraseña porque el número de carnet no es válido.",
    );
  }

  return numeroNormalizado;
}