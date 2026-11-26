
export type FuncionLiquidacion =
  | "AP"
  | "AX"
  | "AN"
  | "CR"
  | "OP"
  | "AY";

export interface DefinicionFuncionLiquidacion {
  codigo: FuncionLiquidacion;
  nombre: string;
  tipo: "pista" | "mesa";
}

export type TarifasLiquidaciones = Record<
  FuncionLiquidacion,
  number | null
>;

// ======================================================
// CONFIGURACIÓN DE FUNCIONES
// ======================================================

export const FUNCIONES_LIQUIDACION:
  readonly DefinicionFuncionLiquidacion[] = [
    {
      codigo: "AP",
      nombre: "Árbitro principal",
      tipo: "pista",
    },
    {
      codigo: "AX",
      nombre: "Árbitro auxiliar",
      tipo: "pista",
    },
    {
      codigo: "AN",
      nombre: "Anotador",
      tipo: "mesa",
    },
    {
      codigo: "CR",
      nombre: "Cronometrador",
      tipo: "mesa",
    },
    {
      codigo: "OP",
      nombre: "Operador de RLL",
      tipo: "mesa",
    },
    {
      codigo: "AY",
      nombre: "Ayudante de anotador",
      tipo: "mesa",
    },
  ];

export const CODIGOS_FUNCIONES_LIQUIDACION:
  readonly FuncionLiquidacion[] =
    FUNCIONES_LIQUIDACION.map(
      (funcion) => funcion.codigo,
    );

// ======================================================
// CONFIGURACIÓN DEL ALMACENAMIENTO LOCAL
// ======================================================

const CLAVE_ALMACENAMIENTO =
  "cba.designaciones.liquidaciones.tarifas.v1";

const VERSION_TARIFAS = 1;

const IMPORTE_MAXIMO_CENTIMOS = 100000;

interface TarifasAlmacenadas {
  version: number;
  tarifas: TarifasLiquidaciones;
}

// ======================================================
// TARIFAS INICIALES
// ======================================================

export function crearTarifasIniciales():
  TarifasLiquidaciones {
  return {
    AP: null,
    AX: null,
    AN: null,
    CR: null,
    OP: null,
    AY: null,
  };
}

// ======================================================
// FUNCIONES DE ARBITRAJE
// ======================================================

export function esFuncionLiquidacion(
  valor: unknown,
): valor is FuncionLiquidacion {
  return (
    typeof valor === "string" &&
    CODIGOS_FUNCIONES_LIQUIDACION.includes(
      valor as FuncionLiquidacion,
    )
  );
}

export function obtenerNombreFuncion(
  codigo: FuncionLiquidacion,
): string {
  return (
    FUNCIONES_LIQUIDACION.find(
      (funcion) => funcion.codigo === codigo,
    )?.nombre ?? codigo
  );
}

export function obtenerTipoFuncion(
  codigo: FuncionLiquidacion,
): "pista" | "mesa" | null {
  return (
    FUNCIONES_LIQUIDACION.find(
      (funcion) => funcion.codigo === codigo,
    )?.tipo ?? null
  );
}

// ======================================================
// VALIDACIÓN DE IMPORTES
// ======================================================

// Todos los importes se guardan en céntimos
// para evitar errores de precisión decimal.

export function esImporteValido(
  valor: unknown,
): valor is number {
  return (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
    valor >= 0 &&
    valor <= IMPORTE_MAXIMO_CENTIMOS
  );
}

export function eurosACentimos(
  valor: string | number,
): number | null {
  const texto = String(valor)
    .trim()
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    return null;
  }

  const [parteEntera, parteDecimal = ""] =
    texto.split(".");

  const euros = Number(parteEntera);

  const centimos = Number(
    parteDecimal.padEnd(2, "0"),
  );

  const importe = euros * 100 + centimos;

  return esImporteValido(importe)
    ? importe
    : null;
}

export function centimosAEuros(
  centimos: number,
): number {
  return centimos / 100;
}

export function formatearImporte(
  centimos: number,
): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(
    centimosAEuros(centimos),
  );
}

export function formatearTarifa(
  centimos: number | null,
): string {
  if (centimos === null) {
    return "";
  }

  return centimosAEuros(centimos).toFixed(2);
}

// ======================================================
// NORMALIZACIÓN DE TARIFAS
// ======================================================

export function normalizarTarifas(
  datos: unknown,
): TarifasLiquidaciones {
  const tarifas = crearTarifasIniciales();

  if (
    typeof datos !== "object" ||
    datos === null ||
    Array.isArray(datos)
  ) {
    return tarifas;
  }

  const registro = datos as Record<string, unknown>;

  for (const codigo of CODIGOS_FUNCIONES_LIQUIDACION) {
    const importe = registro[codigo];

    tarifas[codigo] = esImporteValido(importe)
      ? importe
      : null;
  }

  return tarifas;
}

// ======================================================
// COMPROBACIÓN DE TARIFAS
// ======================================================

export function obtenerFuncionesSinTarifa(
  tarifas: TarifasLiquidaciones,
): FuncionLiquidacion[] {
  return CODIGOS_FUNCIONES_LIQUIDACION.filter(
    (codigo) => !esImporteValido(tarifas[codigo]),
  );
}

export function tarifasCompletas(
  tarifas: TarifasLiquidaciones,
): boolean {
  return (
    obtenerFuncionesSinTarifa(tarifas).length === 0
  );
}

export function obtenerTarifaFuncion(
  tarifas: TarifasLiquidaciones,
  funcion: FuncionLiquidacion,
): number | null {
  const tarifa = tarifas[funcion];

  return esImporteValido(tarifa)
    ? tarifa
    : null;
}

// ======================================================
// ACTUALIZACIÓN DE TARIFAS
// ======================================================

export function actualizarTarifa(
  tarifas: TarifasLiquidaciones,
  funcion: FuncionLiquidacion,
  importe: number | null,
): TarifasLiquidaciones {
  if (!esFuncionLiquidacion(funcion)) {
    throw new Error(
      "La función de arbitraje no es válida.",
    );
  }

  if (
    importe !== null &&
    !esImporteValido(importe)
  ) {
    throw new Error(
      "El importe de la tarifa no es válido.",
    );
  }

  return {
    ...tarifas,
    [funcion]: importe,
  };
}

// ======================================================
// ALMACENAMIENTO LOCAL
// ======================================================

function obtenerAlmacenamiento():
  Storage | null {
  // Astro también ejecuta código en el servidor.

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// ======================================================
// CARGAR TARIFAS
// ======================================================

export function cargarTarifas():
  TarifasLiquidaciones {
  const almacenamiento = obtenerAlmacenamiento();

  if (!almacenamiento) {
    return crearTarifasIniciales();
  }

  try {
    const contenido = almacenamiento.getItem(
      CLAVE_ALMACENAMIENTO,
    );

    if (!contenido) {
      return crearTarifasIniciales();
    }

    const datos = JSON.parse(contenido);

    if (
      typeof datos !== "object" ||
      datos === null ||
      datos.version !== VERSION_TARIFAS
    ) {
      return crearTarifasIniciales();
    }

    return normalizarTarifas(datos.tarifas);
  } catch (error) {
    console.error(
      "[LIQUIDACIONES] Error cargando las tarifas:",
      error,
    );

    return crearTarifasIniciales();
  }
}

// ======================================================
// GUARDAR TARIFAS
// ======================================================

export function guardarTarifas(
  tarifas: TarifasLiquidaciones,
): boolean {
  const almacenamiento = obtenerAlmacenamiento();

  if (!almacenamiento) {
    return false;
  }

  for (const codigo of CODIGOS_FUNCIONES_LIQUIDACION) {
    const importe = tarifas[codigo];

    if (
      importe !== null &&
      !esImporteValido(importe)
    ) {
      return false;
    }
  }

  const datos: TarifasAlmacenadas = {
    version: VERSION_TARIFAS,
    tarifas: normalizarTarifas(tarifas),
  };

  try {
    almacenamiento.setItem(
      CLAVE_ALMACENAMIENTO,
      JSON.stringify(datos),
    );

    return true;
  } catch (error) {
    console.error(
      "[LIQUIDACIONES] Error guardando las tarifas:",
      error,
    );

    return false;
  }
}

// ======================================================
// RESTABLECER TARIFAS
// ======================================================

export function restablecerTarifas():
  TarifasLiquidaciones {
  const tarifas = crearTarifasIniciales();

  if (!guardarTarifas(tarifas)) {
    throw new Error(
      "No se han podido restablecer las tarifas.",
    );
  }

  return tarifas;
}
