
import {
  esFuncionLiquidacion,
  obtenerTarifaFuncion,
  obtenerNombreFuncion,
  CODIGOS_FUNCIONES_LIQUIDACION,
  type FuncionLiquidacion,
  type TarifasLiquidaciones,
} from "@servicios/backend/designaciones/tarifasLiquidaciones";

import type {
  PeriodoLiquidacion,
  ResultadoDatosLiquidaciones,
} from "@servicios/backend/designaciones/obtenerLiquidacionesDesignaciones";

// ======================================================
// TIPOS PÚBLICOS
// ======================================================

export interface LineaLiquidacion {
  id: string;

  partidoId: string;
  numeroPartido: string;

  categoria: string;

  fecha: string;
  hora: string | null;

  funcion: FuncionLiquidacion;
  nombreFuncion: string;

  importe: number | null;
}

export interface LiquidacionPersona {
  id: string;

  codigo: string;
  nombreCompleto: string;

  activo: boolean;

  actuaciones: LineaLiquidacion[];

  totalPartidos: number;
  totalActuaciones: number;

  totalImporte: number | null;

  actuacionesSinTarifa: number;
}

export interface ResumenLiquidaciones {
  totalPersonas: number;
  totalPartidos: number;
  totalActuaciones: number;

  totalImporte: number | null;

  actuacionesSinTarifa: number;
}

export interface ResumenFuncionLiquidacion {
  codigo: FuncionLiquidacion;
  nombre: string;

  tarifa: number | null;

  totalActuaciones: number;
  totalImporte: number | null;
}

export interface ResultadoLiquidaciones {
  periodo: PeriodoLiquidacion;

  tarifas: TarifasLiquidaciones;

  liquidaciones: LiquidacionPersona[];

  resumen: ResumenLiquidaciones;

  porFuncion: ResumenFuncionLiquidacion[];

  funcionesSinTarifa: FuncionLiquidacion[];

  completa: boolean;

  avisos: string[];
}

// ======================================================
// TIPOS INTERNOS
// ======================================================

interface LiquidacionTemporal {
  id: string;

  codigo: string;
  nombreCompleto: string;

  activo: boolean;

  actuaciones: LineaLiquidacion[];

  partidos: Set<string>;

  totalImporte: number;

  actuacionesSinTarifa: number;
}

interface ContadorFuncion {
  totalActuaciones: number;
  totalImporte: number;
  actuacionesSinTarifa: number;
}

// ======================================================
// CONFIGURACIÓN
// ======================================================

const ORDENADOR_TEXTO = new Intl.Collator(
  "es",
  {
    numeric: true,
    sensitivity: "base",
  },
);

// ======================================================
// UTILIDADES DE ORDENACIÓN
// ======================================================

function obtenerNumeroLicencia(
  codigo: string,
): number | null {
  const resultado = codigo
    .trim()
    .match(/^CBA-(\d+)$/i);

  if (!resultado) {
    return null;
  }

  const numero = Number(resultado[1]);

  return Number.isSafeInteger(numero)
    ? numero
    : null;
}

function compararPersonas(
  a: LiquidacionPersona,
  b: LiquidacionPersona,
): number {
  const numeroA =
    obtenerNumeroLicencia(a.codigo);

  const numeroB =
    obtenerNumeroLicencia(b.codigo);

  // Las licencias válidas se ordenan
  // de menor a mayor.

  if (
    numeroA !== null &&
    numeroB !== null &&
    numeroA !== numeroB
  ) {
    return numeroA - numeroB;
  }

  // Las personas sin licencia válida
  // aparecen al final del listado.

  if (
    numeroA !== null &&
    numeroB === null
  ) {
    return -1;
  }

  if (
    numeroA === null &&
    numeroB !== null
  ) {
    return 1;
  }

  return (
    ORDENADOR_TEXTO.compare(
      a.codigo,
      b.codigo,
    ) ||
    ORDENADOR_TEXTO.compare(
      a.nombreCompleto,
      b.nombreCompleto,
    ) ||
    a.id.localeCompare(b.id)
  );
}

function compararActuaciones(
  a: LineaLiquidacion,
  b: LineaLiquidacion,
): number {
  // Primero por fecha y después por hora.
  // Los partidos sin hora aparecen al final
  // de su día correspondiente.

  const horaA =
    a.hora ?? "99:99";

  const horaB =
    b.hora ?? "99:99";

  return (
    a.fecha.localeCompare(b.fecha) ||

    horaA.localeCompare(horaB) ||

    ORDENADOR_TEXTO.compare(
      a.numeroPartido,
      b.numeroPartido,
    ) ||

    CODIGOS_FUNCIONES_LIQUIDACION.indexOf(
      a.funcion,
    ) -
      CODIGOS_FUNCIONES_LIQUIDACION.indexOf(
        b.funcion,
      ) ||

    a.id.localeCompare(b.id)
  );
}

// ======================================================
// FORMATO DE FECHAS
// ======================================================

export function formatearFechaLiquidacion(
  fecha: string,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return "—";
  }

  const fechaValidada =
    new Date(`${fecha}T12:00:00Z`);

  if (
    Number.isNaN(fechaValidada.getTime()) ||
    fechaValidada.toISOString().slice(0, 10) !== fecha
  ) {
    return "—";
  }

  const [anio, mes, dia] =
    fecha.split("-");

  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaHoraLiquidacion(
  fecha: string,
  hora: string | null,
): string {
  const fechaFormateada =
    formatearFechaLiquidacion(fecha);

  if (!hora) {
    return fechaFormateada;
  }

  return (
    `${fechaFormateada} · ` +
    `${hora.slice(0, 5)} h`
  );
}

export function formatearPeriodoLiquidacion(
  periodo: PeriodoLiquidacion,
): string {
  const inicio =
    formatearFechaLiquidacion(
      periodo.fechaInicio,
    );

  const fin =
    formatearFechaLiquidacion(
      periodo.fechaFin,
    );

  return `${inicio} - ${fin}`;
}

// ======================================================
// CONTADORES POR FUNCIÓN
// ======================================================

function crearContadoresFunciones():
  Record<FuncionLiquidacion, ContadorFuncion> {
  return {
    AP: {
      totalActuaciones: 0,
      totalImporte: 0,
      actuacionesSinTarifa: 0,
    },

    AX: {
      totalActuaciones: 0,
      totalImporte: 0,
      actuacionesSinTarifa: 0,
    },

    AN: {
      totalActuaciones: 0,
      totalImporte: 0,
      actuacionesSinTarifa: 0,
    },

    CR: {
      totalActuaciones: 0,
      totalImporte: 0,
      actuacionesSinTarifa: 0,
    },

    OP: {
      totalActuaciones: 0,
      totalImporte: 0,
      actuacionesSinTarifa: 0,
    },

    AY: {
      totalActuaciones: 0,
      totalImporte: 0,
      actuacionesSinTarifa: 0,
    },
  };
}

// ======================================================
// CÁLCULO PRINCIPAL DE LIQUIDACIONES
// ======================================================

export function calcularLiquidaciones(
  datos: ResultadoDatosLiquidaciones,
  tarifas: TarifasLiquidaciones,
): ResultadoLiquidaciones {
  const avisos = [
    ...datos.avisos,
  ];

  // ----------------------------------------------------
  // 1. PREPARAR MAPAS DE DATOS
  // ----------------------------------------------------

  const mapaPersonas = new Map(
    datos.personas.map(
      (persona) => [
        persona.id,
        persona,
      ],
    ),
  );

  const mapaPartidos = new Map(
    datos.partidos.map(
      (partido) => [
        partido.id,
        partido,
      ],
    ),
  );

  const mapaLiquidaciones = new Map<
    string,
    LiquidacionTemporal
  >();

  const contadoresFunciones =
    crearContadoresFunciones();

  const partidosRealizados =
    new Set<string>();

  const actuacionesProcesadas =
    new Set<string>();

  const funcionesSinTarifa =
    new Set<FuncionLiquidacion>();

  // ----------------------------------------------------
  // 2. CONTADORES GENERALES
  // ----------------------------------------------------

  let totalActuaciones = 0;

  let totalImporte = 0;

  let actuacionesSinTarifa = 0;

  let actuacionesInvalidas = 0;

  let actuacionesDuplicadas = 0;

  // ----------------------------------------------------
  // 3. PROCESAR ACTUACIONES
  // ----------------------------------------------------

  for (const actuacion of datos.actuaciones) {
    if (!actuacion.id) {
      actuacionesInvalidas++;

      continue;
    }

    // Evitar contabilizar dos veces
    // una misma asignación.

    if (
      actuacionesProcesadas.has(
        actuacion.id,
      )
    ) {
      actuacionesDuplicadas++;

      continue;
    }

    actuacionesProcesadas.add(
      actuacion.id,
    );

    const persona = mapaPersonas.get(
      actuacion.personaId,
    );

    const partido = mapaPartidos.get(
      actuacion.partidoId,
    );

    const funcion =
      actuacion.funcionRealizada;

    // Comprobar que los datos necesarios
    // están disponibles.

    if (
      !persona ||
      !partido ||
      !esFuncionLiquidacion(funcion)
    ) {
      actuacionesInvalidas++;

      continue;
    }

    // Comprobación adicional del periodo.

    if (
      partido.fecha < datos.periodo.fechaInicio ||
      partido.fecha > datos.periodo.fechaFin
    ) {
      actuacionesInvalidas++;

      continue;
    }

    // --------------------------------------------------
    // 4. OBTENER TARIFA
    // --------------------------------------------------

    const importe = obtenerTarifaFuncion(
      tarifas,
      funcion,
    );

    // --------------------------------------------------
    // 5. CREAR LIQUIDACIÓN DE LA PERSONA
    // --------------------------------------------------

    let liquidacion =
      mapaLiquidaciones.get(
        persona.id,
      );

    if (!liquidacion) {
      liquidacion = {
        id: persona.id,

        codigo: persona.codigo,

        nombreCompleto:
          persona.nombreCompleto,

        activo: persona.activo,

        actuaciones: [],

        partidos: new Set<string>(),

        totalImporte: 0,

        actuacionesSinTarifa: 0,
      };

      mapaLiquidaciones.set(
        persona.id,
        liquidacion,
      );
    }

    // --------------------------------------------------
    // 6. AÑADIR LÍNEA DE LIQUIDACIÓN
    // --------------------------------------------------

    const linea: LineaLiquidacion = {
      id: actuacion.id,

      partidoId: partido.id,

      numeroPartido:
        partido.numeroPartido,

      categoria:
        partido.categoria,

      fecha:
        partido.fecha,

      hora:
        partido.hora,

      funcion,

      nombreFuncion:
        obtenerNombreFuncion(funcion),

      importe,
    };

    liquidacion.actuaciones.push(
      linea,
    );

    // Un partido puede contener varias funciones
    // realizadas por una misma persona.

    liquidacion.partidos.add(
      partido.id,
    );

    partidosRealizados.add(
      partido.id,
    );

    totalActuaciones++;

    contadoresFunciones[
      funcion
    ].totalActuaciones++;

    // --------------------------------------------------
    // 7. COMPROBAR TARIFAS PENDIENTES
    // --------------------------------------------------

    if (importe === null) {
      funcionesSinTarifa.add(
        funcion,
      );

      liquidacion.actuacionesSinTarifa++;

      actuacionesSinTarifa++;

      contadoresFunciones[
        funcion
      ].actuacionesSinTarifa++;

      continue;
    }

    // --------------------------------------------------
    // 8. ACUMULAR IMPORTES
    // --------------------------------------------------

    liquidacion.totalImporte += importe;

    totalImporte += importe;

    contadoresFunciones[
      funcion
    ].totalImporte += importe;
  }

  // ----------------------------------------------------
  // 9. PREPARAR LIQUIDACIONES INDIVIDUALES
  // ----------------------------------------------------

  const liquidaciones:
    LiquidacionPersona[] = Array.from(
      mapaLiquidaciones.values(),
    ).map(
      (liquidacion) => ({
        id:
          liquidacion.id,

        codigo:
          liquidacion.codigo,

        nombreCompleto:
          liquidacion.nombreCompleto,

        activo:
          liquidacion.activo,

        actuaciones:
          [...liquidacion.actuaciones].sort(
            compararActuaciones,
          ),

        totalPartidos:
          liquidacion.partidos.size,

        totalActuaciones:
          liquidacion.actuaciones.length,

        totalImporte:
          liquidacion.actuacionesSinTarifa > 0
            ? null
            : liquidacion.totalImporte,

        actuacionesSinTarifa:
          liquidacion.actuacionesSinTarifa,
      }),
    ).sort(
      compararPersonas,
    );

  // ----------------------------------------------------
  // 10. PREPARAR RESUMEN POR FUNCIÓN
  // ----------------------------------------------------

  const porFuncion:
    ResumenFuncionLiquidacion[] =
      CODIGOS_FUNCIONES_LIQUIDACION.map(
        (codigo) => {
          const contador =
            contadoresFunciones[codigo];

          return {
            codigo,

            nombre:
              obtenerNombreFuncion(codigo),

            tarifa:
              obtenerTarifaFuncion(
                tarifas,
                codigo,
              ),

            totalActuaciones:
              contador.totalActuaciones,

            totalImporte:
              contador.actuacionesSinTarifa > 0
                ? null
                : contador.totalImporte,
          };
        },
      );

  // ----------------------------------------------------
  // 11. PREPARAR AVISOS
  // ----------------------------------------------------

  if (actuacionesInvalidas > 0) {
    avisos.push(
      `${actuacionesInvalidas} actuaciones contienen datos incorrectos y no se han incluido en la liquidación.`,
    );
  }

  if (actuacionesDuplicadas > 0) {
    avisos.push(
      `${actuacionesDuplicadas} registros duplicados no se han contabilizado nuevamente.`,
    );
  }

  if (actuacionesSinTarifa > 0) {
    avisos.push(
      `${actuacionesSinTarifa} actuaciones tienen una tarifa pendiente de configurar.`,
    );
  }

  const funcionesPendientes =
    CODIGOS_FUNCIONES_LIQUIDACION.filter(
      (codigo) =>
        funcionesSinTarifa.has(codigo),
    );

  if (funcionesPendientes.length > 0) {
    avisos.push(
      `Funciones sin tarifa: ${funcionesPendientes.join(", ")}.`,
    );
  }

  // ----------------------------------------------------
  // 12. COMPROBAR LIQUIDACIÓN
  // ----------------------------------------------------

  const completa =
    actuacionesSinTarifa === 0 &&
    actuacionesInvalidas === 0 &&
    datos.avisos.length === 0;

  // ----------------------------------------------------
  // 13. DEVOLVER RESULTADO FINAL
  // ----------------------------------------------------

  return {
    periodo: {
      ...datos.periodo,
    },

    tarifas: {
      ...tarifas,
    },

    liquidaciones,

    resumen: {
      totalPersonas:
        liquidaciones.length,

      totalPartidos:
        partidosRealizados.size,

      totalActuaciones,

      totalImporte:
        actuacionesSinTarifa > 0 ||
        actuacionesInvalidas > 0 ||
        datos.avisos.length > 0
          ? null
          : totalImporte,

      actuacionesSinTarifa,
    },

    porFuncion,

    funcionesSinTarifa:
      funcionesPendientes,

    completa,

    avisos: Array.from(
      new Set(avisos),
    ),
  };
}

// ======================================================
// COMPROBAR EXPORTACIÓN
// ======================================================

export function puedeExportarLiquidaciones(
  resultado: ResultadoLiquidaciones,
): boolean {
  return (
    resultado.completa &&
    resultado.liquidaciones.length > 0 &&
    resultado.resumen.totalActuaciones > 0 &&
    resultado.resumen.totalImporte !== null
  );
}

// ======================================================
// NOMBRE DEL ARCHIVO PDF
// ======================================================

export function obtenerNombrePdfLiquidaciones(
  periodo: PeriodoLiquidacion,
): string {
  return (
    `CBA-Liquidaciones-` +
    `${periodo.fechaInicio}-` +
    `${periodo.fechaFin}.pdf`
  );
}
