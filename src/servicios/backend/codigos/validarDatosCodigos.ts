
import type {
  AccionMasivaCodigos,
  ActualizarArticuloCodigos,
  ArticuloGeneracionLote,
  CrearArticuloCodigos,
  CrearCampanaCodigos,
  CrearLoteCodigos,
  ErrorCampoCodigos,
  EstadoRegistroCodigo,
  EstadoVentaCodigo,
  FiltrosCodigosPanel,
  MetodoCanjeCodigo,
  ModoEscanerCodigos,
  RegistrarCanjeCodigo,
  SolicitudAccionMasivaCodigos,
  SolicitudEscaneoCodigo,
  SolicitudReactivarVenta,
  TipoResultadoCodigo,
} from "@tipos/CodigosPanel";

/*
 * C.B. ANDRATX
 * Validación de datos del módulo de códigos.
 *
 * Todas las entradas externas se reciben
 * como unknown y se validan antes de
 * utilizarlas en los servicios backend.
 *
 * Este archivo no realiza consultas ni
 * modificaciones en Supabase.
 */

// ================================================
// CONFIGURACIÓN DE VALIDACIONES
// ================================================

export const LIMITES_CODIGOS = {
  nombreArticulo: 120,
  descripcionArticulo: 2000,

  nombreCampana: 150,
  descripcionCampana: 2000,

  nombreLote: 120,
  descripcionLote: 1000,

  articulosPorLote: 100,
  cantidadPorDetalle: 5000,
  boletosPorLote: 5000,

  codigosPorOperacion: 250,

  longitudCodigoEscaneo: 2048,
  longitudCodigoVisible: 100,

  longitudMotivo: 500,
  longitudObservaciones: 500,

  resultadosPorPagina: 100,
} as const;

const EXPRESION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXPRESION_CODIGO_VISIBLE =
  /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

const TIPOS_RESULTADO:
  readonly TipoResultadoCodigo[] = [
    "premio",
    "sin_premio",
  ];

const ACCIONES_MASIVAS:
  readonly AccionMasivaCodigos[] = [
    "marcar_vendido",
    "marcar_no_vendido",
    "volver_pendiente",
    "anular",
    "eliminar",
  ];

const MODOS_ESCANER:
  readonly ModoEscanerCodigos[] = [
    "consulta",
    "venta",
    "no_vendidos",
    "premios",
  ];

const METODOS_CANJE:
  readonly MetodoCanjeCodigo[] = [
    "qr",
    "manual",
  ];

const ESTADOS_VENTA:
  readonly EstadoVentaCodigo[] = [
    "pendiente",
    "vendido",
    "no_vendido",
  ];

const ESTADOS_REGISTRO:
  readonly EstadoRegistroCodigo[] = [
    "activo",
    "anulado",
    "eliminado",
  ];

// ================================================
// RESULTADO GENERAL
// ================================================

export interface ResultadoValidacionCodigos<T> {
  valido: boolean;

  datos: T | null;

  errores: ErrorCampoCodigos[];
}

// ================================================
// FUNCIONES AUXILIARES
// ================================================

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirTexto(
  valor: unknown,
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function convertirTextoNullable(
  valor: unknown,
): string | null {
  return convertirTexto(valor) || null;
}

function esOpcion<T extends string>(
  valor: string,
  opciones: readonly T[],
): valor is T {
  return opciones.some(
    (opcion) => opcion === valor,
  );
}

export function esUuidCodigos(
  valor: unknown,
): valor is string {
  return (
    typeof valor === "string" &&
    EXPRESION_UUID.test(valor)
  );
}

function agregarError(
  errores: ErrorCampoCodigos[],
  campo: string,
  mensaje: string,
): void {
  errores.push({
    campo,
    mensaje,
  });
}

function resultadoInvalido<T>(
  campo: string,
  mensaje: string,
): ResultadoValidacionCodigos<T> {
  return {
    valido: false,
    datos: null,
    errores: [
      {
        campo,
        mensaje,
      },
    ],
  };
}

function finalizarValidacion<T>(
  datos: T,
  errores: ErrorCampoCodigos[],
): ResultadoValidacionCodigos<T> {
  return {
    valido: errores.length === 0,

    datos:
      errores.length === 0
        ? datos
        : null,

    errores,
  };
}

function validarTextoObligatorio(
  valor: unknown,
  campo: string,
  nombre: string,
  maximo: number,
  errores: ErrorCampoCodigos[],
): string {
  const texto = convertirTexto(valor);

  if (!texto) {
    agregarError(
      errores,
      campo,
      `${nombre} es obligatorio.`,
    );
  } else if (texto.length > maximo) {
    agregarError(
      errores,
      campo,
      `${nombre} no puede superar los ${maximo} caracteres.`,
    );
  }

  return texto;
}

function validarTextoOpcional(
  valor: unknown,
  campo: string,
  nombre: string,
  maximo: number,
  errores: ErrorCampoCodigos[],
): string | null {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  if (typeof valor !== "string") {
    agregarError(
      errores,
      campo,
      `${nombre} no tiene un formato válido.`,
    );

    return null;
  }

  const texto = valor.trim();

  if (texto.length > maximo) {
    agregarError(
      errores,
      campo,
      `${nombre} no puede superar los ${maximo} caracteres.`,
    );
  }

  return texto || null;
}

function validarIdentificador(
  valor: unknown,
  campo: string,
  errores: ErrorCampoCodigos[],
  obligatorio = true,
): string | null {
  const id = convertirTextoNullable(valor);

  if (!id) {
    if (obligatorio) {
      agregarError(
        errores,
        campo,
        "Debes indicar un identificador.",
      );
    }

    return null;
  }

  if (!esUuidCodigos(id)) {
    agregarError(
      errores,
      campo,
      "El identificador no tiene un formato válido.",
    );
  }

  return id;
}

function validarRecursoImagen(
  valor: string | null,
  errores: ErrorCampoCodigos[],
): void {
  if (!valor) {
    return;
  }

  if (valor.length > 2000) {
    agregarError(
      errores,
      "imagenUrl",
      "La dirección de la imagen es demasiado larga.",
    );

    return;
  }

  if (
    valor.startsWith("/") &&
    !valor.startsWith("//")
  ) {
    return;
  }

  try {
    const url = new URL(valor);

    if (
      url.protocol === "https:" ||
      url.protocol === "http:"
    ) {
      return;
    }
  } catch {
    // La dirección no es válida.
  }

  agregarError(
    errores,
    "imagenUrl",
    "La dirección de la imagen no es válida.",
  );
}

function validarFechaOpcional(
  valor: unknown,
  campo: string,
  errores: ErrorCampoCodigos[],
): string | null {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  if (typeof valor !== "string") {
    agregarError(
      errores,
      campo,
      "La fecha no tiene un formato válido.",
    );

    return null;
  }

  const texto = valor.trim();

  const expresionFecha =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

  if (
    !expresionFecha.test(texto) ||
    !Number.isFinite(Date.parse(texto))
  ) {
    agregarError(
      errores,
      campo,
      "La fecha debe incluir hora y zona horaria válidas.",
    );

    return null;
  }

  return new Date(texto).toISOString();
}

// ================================================
// VALIDACIÓN DE ARTÍCULOS
// ================================================

export function validarCreacionArticuloCodigos(
  contenido: unknown,
): ResultadoValidacionCodigos<CrearArticuloCodigos> {
  if (!esObjeto(contenido)) {
    return resultadoInvalido(
      "datos",
      "Los datos del artículo no son válidos.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const nombre = validarTextoObligatorio(
    contenido.nombre,
    "nombre",
    "El nombre del artículo",
    LIMITES_CODIGOS.nombreArticulo,
    errores,
  );

  const descripcion = validarTextoOpcional(
    contenido.descripcion,
    "descripcion",
    "La descripción",
    LIMITES_CODIGOS.descripcionArticulo,
    errores,
  );

  const imagenUrl = validarTextoOpcional(
    contenido.imagenUrl,
    "imagenUrl",
    "La dirección de la imagen",
    2000,
    errores,
  );

  validarRecursoImagen(
    imagenUrl,
    errores,
  );

  if (
    contenido.activo !== undefined &&
    typeof contenido.activo !== "boolean"
  ) {
    agregarError(
      errores,
      "activo",
      "El estado del artículo debe ser verdadero o falso.",
    );
  }

  const activo =
    typeof contenido.activo === "boolean"
      ? contenido.activo
      : true;

  return finalizarValidacion(
    {
      nombre,
      descripcion,
      imagenUrl,
      activo,
    },
    errores,
  );
}

export function validarActualizacionArticuloCodigos(
  contenido: unknown,
): ResultadoValidacionCodigos<ActualizarArticuloCodigos> {
  if (!esObjeto(contenido)) {
    return resultadoInvalido(
      "datos",
      "Los datos del artículo no son válidos.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const datos: ActualizarArticuloCodigos = {};

  if (contenido.nombre !== undefined) {
    datos.nombre = validarTextoObligatorio(
      contenido.nombre,
      "nombre",
      "El nombre del artículo",
      LIMITES_CODIGOS.nombreArticulo,
      errores,
    );
  }

  if (contenido.descripcion !== undefined) {
    datos.descripcion = validarTextoOpcional(
      contenido.descripcion,
      "descripcion",
      "La descripción",
      LIMITES_CODIGOS.descripcionArticulo,
      errores,
    );
  }

  if (contenido.imagenUrl !== undefined) {
    datos.imagenUrl = validarTextoOpcional(
      contenido.imagenUrl,
      "imagenUrl",
      "La dirección de la imagen",
      2000,
      errores,
    );

    validarRecursoImagen(
      datos.imagenUrl,
      errores,
    );
  }

  if (contenido.activo !== undefined) {
    if (typeof contenido.activo === "boolean") {
      datos.activo = contenido.activo;
    } else {
      agregarError(
        errores,
        "activo",
        "El estado del artículo no es válido.",
      );
    }
  }

  if (Object.keys(datos).length === 0) {
    agregarError(
      errores,
      "datos",
      "No se han indicado cambios para el artículo.",
    );
  }

  return finalizarValidacion(
    datos,
    errores,
  );
}

// ================================================
// VALIDACIÓN DE CAMPAÑAS
// ================================================

export function validarCreacionCampanaCodigos(
  contenido: unknown,
): ResultadoValidacionCodigos<CrearCampanaCodigos> {
  if (!esObjeto(contenido)) {
    return resultadoInvalido(
      "datos",
      "Los datos de la campaña no son válidos.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const nombre = validarTextoObligatorio(
    contenido.nombre,
    "nombre",
    "El nombre de la campaña",
    LIMITES_CODIGOS.nombreCampana,
    errores,
  );

  const descripcion = validarTextoOpcional(
    contenido.descripcion,
    "descripcion",
    "La descripción",
    LIMITES_CODIGOS.descripcionCampana,
    errores,
  );

  const fechaInicio = validarFechaOpcional(
    contenido.fechaInicio,
    "fechaInicio",
    errores,
  );

  const fechaFin = validarFechaOpcional(
    contenido.fechaFin,
    "fechaFin",
    errores,
  );

  if (
    fechaInicio &&
    fechaFin &&
    fechaFin < fechaInicio
  ) {
    agregarError(
      errores,
      "fechaFin",
      "La fecha de finalización no puede ser anterior a la de inicio.",
    );
  }

  return finalizarValidacion(
    {
      nombre,
      descripcion,
      fechaInicio,
      fechaFin,
    },
    errores,
  );
}

// ================================================
// VALIDACIÓN DE LOTES
// ================================================

export function validarCreacionLoteCodigos(
  contenido: unknown,
): ResultadoValidacionCodigos<CrearLoteCodigos> {
  if (!esObjeto(contenido)) {
    return resultadoInvalido(
      "datos",
      "Los datos del lote no son válidos.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const campanaId = validarIdentificador(
    contenido.campanaId,
    "campanaId",
    errores,
  );

  const plantillaId = validarIdentificador(
    contenido.plantillaId,
    "plantillaId",
    errores,
    false,
  );

  const claveOperacion = validarIdentificador(
    contenido.claveOperacion,
    "claveOperacion",
    errores,
  );

  const nombre = validarTextoObligatorio(
    contenido.nombre,
    "nombre",
    "El nombre del lote",
    LIMITES_CODIGOS.nombreLote,
    errores,
  );

  const descripcion = validarTextoOpcional(
    contenido.descripcion,
    "descripcion",
    "La descripción",
    LIMITES_CODIGOS.descripcionLote,
    errores,
  );

  const articulos: ArticuloGeneracionLote[] = [];

  if (
    !Array.isArray(contenido.articulos) ||
    contenido.articulos.length === 0
  ) {
    agregarError(
      errores,
      "articulos",
      "Debes indicar al menos un artículo o boletos sin premio.",
    );
  } else if (
    contenido.articulos.length >
    LIMITES_CODIGOS.articulosPorLote
  ) {
    agregarError(
      errores,
      "articulos",
      "El lote contiene demasiados artículos diferentes.",
    );
  } else {
    const articulosUtilizados =
      new Set<string>();

    let cantidadTotal = 0;

    contenido.articulos.forEach(
      (elemento: unknown, indice: number) => {
        const campo =
          `articulos.${indice}`;

        if (!esObjeto(elemento)) {
          agregarError(
            errores,
            campo,
            "El artículo del lote no es válido.",
          );

          return;
        }

        const tipoTexto = convertirTexto(
          elemento.tipoResultado,
        );

        if (
          !esOpcion(
            tipoTexto,
            TIPOS_RESULTADO,
          )
        ) {
          agregarError(
            errores,
            `${campo}.tipoResultado`,
            "El tipo de resultado no es válido.",
          );

          return;
        }

        const tipoResultado = tipoTexto;

        const articuloId = validarIdentificador(
          elemento.articuloId,
          `${campo}.articuloId`,
          errores,
          tipoResultado === "premio",
        );

        if (
          tipoResultado === "sin_premio" &&
          articuloId !== null
        ) {
          agregarError(
            errores,
            `${campo}.articuloId`,
            "Los boletos sin premio no deben tener un artículo asignado.",
          );
        }

        const cantidad = elemento.cantidad;

        if (
          typeof cantidad !== "number" ||
          !Number.isSafeInteger(cantidad) ||
          cantidad < 1 ||
          cantidad > LIMITES_CODIGOS.cantidadPorDetalle
        ) {
          agregarError(
            errores,
            `${campo}.cantidad`,
            "La cantidad del artículo no es válida.",
          );

          return;
        }

        cantidadTotal += cantidad;

        const identificadorDetalle =
          tipoResultado === "sin_premio"
            ? "sin_premio"
            : articuloId ?? "invalido";

        if (
          articulosUtilizados.has(
            identificadorDetalle,
          )
        ) {
          agregarError(
            errores,
            campo,
            "Este artículo está repetido en el lote.",
          );
        }

        articulosUtilizados.add(
          identificadorDetalle,
        );

        articulos.push({
          articuloId:
            tipoResultado === "premio"
              ? articuloId
              : null,

          tipoResultado,
          cantidad,
        });
      },
    );

    if (
      cantidadTotal >
      LIMITES_CODIGOS.boletosPorLote
    ) {
      agregarError(
        errores,
        "articulos",
        `Un lote no puede superar los ${LIMITES_CODIGOS.boletosPorLote} boletos.`,
      );
    }
  }

  return finalizarValidacion(
    {
      campanaId: campanaId ?? "",
      plantillaId,

      nombre,
      descripcion,

      claveOperacion:
        claveOperacion ?? "",

      articulos,
    },
    errores,
  );
}

// ================================================
// VALIDACIÓN DE ESCANEOS
// ================================================

export function validarEscaneoCodigo(
  contenido: unknown,
): ResultadoValidacionCodigos<SolicitudEscaneoCodigo> {
  if (!esObjeto(contenido)) {
    return resultadoInvalido(
      "datos",
      "Los datos del escaneo no son válidos.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const codigo = convertirTexto(
    contenido.codigo,
  );

  if (
    codigo.length === 0 ||
    codigo.length >
      LIMITES_CODIGOS.longitudCodigoEscaneo
  ) {
    agregarError(
      errores,
      "codigo",
      "El código escaneado no es válido.",
    );
  }

  const modoTexto = convertirTexto(
    contenido.modo,
  );

  if (
    !esOpcion(
      modoTexto,
      MODOS_ESCANER,
    )
  ) {
    agregarError(
      errores,
      "modo",
      "El modo de escaneo seleccionado no es válido.",
    );
  }

  const requiereCampana =
    modoTexto === "venta" ||
    modoTexto === "no_vendidos";

  const campanaId = validarIdentificador(
    contenido.campanaId,
    "campanaId",
    errores,
    requiereCampana,
  );

  return finalizarValidacion(
    {
      codigo,
      campanaId:
        campanaId ?? undefined,

      modo:
        modoTexto as ModoEscanerCodigos,
    },
    errores,
  );
}

// ================================================
// VALIDACIÓN DE CANJES
// ================================================

export function validarRegistroCanjeCodigo(
  contenido: unknown,
): ResultadoValidacionCodigos<RegistrarCanjeCodigo> {
  if (!esObjeto(contenido)) {
    return resultadoInvalido(
      "datos",
      "Los datos del canje no son válidos.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const codigoVisible =
    convertirTexto(
      contenido.codigoVisible,
    ).toUpperCase();

  if (
    codigoVisible.length < 8 ||
    codigoVisible.length >
      LIMITES_CODIGOS.longitudCodigoVisible ||
    !EXPRESION_CODIGO_VISIBLE.test(
      codigoVisible,
    )
  ) {
    agregarError(
      errores,
      "codigoVisible",
      "El identificador impreso en el boleto no es válido.",
    );
  }

  const metodoTexto = convertirTexto(
    contenido.metodo,
  );

  if (
    !esOpcion(
      metodoTexto,
      METODOS_CANJE,
    )
  ) {
    agregarError(
      errores,
      "metodo",
      "El método de entrega no es válido.",
    );
  }

  const observaciones = validarTextoOpcional(
    contenido.observaciones,
    "observaciones",
    "Las observaciones",
    LIMITES_CODIGOS.longitudObservaciones,
    errores,
  );

  return finalizarValidacion(
    {
      codigoVisible,

      metodo:
        metodoTexto as MetodoCanjeCodigo,

      observaciones,
    },
    errores,
  );
}

// ================================================
// VALIDACIÓN DE ACCIONES MASIVAS
// ================================================

export function validarAccionMasivaCodigos(
  contenido: unknown,
): ResultadoValidacionCodigos<SolicitudAccionMasivaCodigos> {
  if (!esObjeto(contenido)) {
    return resultadoInvalido(
      "datos",
      "La operación solicitada no es válida.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const campanaId = validarIdentificador(
    contenido.campanaId,
    "campanaId",
    errores,
  );

  const accionTexto = convertirTexto(
    contenido.accion,
  );

  if (
    !esOpcion(
      accionTexto,
      ACCIONES_MASIVAS,
    )
  ) {
    agregarError(
      errores,
      "accion",
      "La acción seleccionada no está permitida.",
    );
  }

  const codigosIds: string[] = [];

  if (
    !Array.isArray(contenido.codigosIds) ||
    contenido.codigosIds.length === 0
  ) {
    agregarError(
      errores,
      "codigosIds",
      "Debes seleccionar al menos un boleto.",
    );
  } else if (
    contenido.codigosIds.length >
    LIMITES_CODIGOS.codigosPorOperacion
  ) {
    agregarError(
      errores,
      "codigosIds",
      `Puedes seleccionar un máximo de ${LIMITES_CODIGOS.codigosPorOperacion} códigos por operación.`,
    );
  } else {
    const identificadores =
      new Set<string>();

    contenido.codigosIds.forEach(
      (valor: unknown, indice: number) => {
        const id = convertirTexto(
          valor,
        ).toLowerCase();

        if (!esUuidCodigos(id)) {
          agregarError(
            errores,
            `codigosIds.${indice}`,
            "El identificador del boleto no es válido.",
          );

          return;
        }

        identificadores.add(id);
      },
    );

    codigosIds.push(
      ...identificadores,
    );
  }

  const motivo = validarTextoOpcional(
    contenido.motivo,
    "motivo",
    "El motivo",
    LIMITES_CODIGOS.longitudMotivo,
    errores,
  );

  if (
    (
      accionTexto === "eliminar" ||
      accionTexto === "anular"
    ) &&
    (!motivo || motivo.length < 5)
  ) {
    agregarError(
      errores,
      "motivo",
      "Para anular o eliminar códigos debes indicar un motivo de al menos 5 caracteres.",
    );
  }

  return finalizarValidacion(
    {
      campanaId:
        campanaId ?? "",

      codigosIds,

      accion:
        accionTexto as AccionMasivaCodigos,

      motivo,
    },
    errores,
  );
}

// ================================================
// VALIDACIÓN DE REACTIVACIÓN DE VENTA
// ================================================

export function validarReactivarVentaCodigos(
  contenido: unknown,
): ResultadoValidacionCodigos<SolicitudReactivarVenta> {
  if (!esObjeto(contenido)) {
    return resultadoInvalido(
      "datos",
      "Los datos de reactivación no son válidos.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const campanaId = validarIdentificador(
    contenido.campanaId,
    "campanaId",
    errores,
  );

  return finalizarValidacion(
    {
      campanaId:
        campanaId ?? "",
    },
    errores,
  );
}

// ================================================
// VALIDACIÓN DE FILTROS DEL LISTADO
// ================================================

export function validarFiltrosCodigos(
  contenido: unknown,
): ResultadoValidacionCodigos<FiltrosCodigosPanel> {
  const valores =
    contenido instanceof URLSearchParams
      ? Object.fromEntries(
          contenido.entries(),
        )
      : contenido;

  if (!esObjeto(valores)) {
    return resultadoInvalido(
      "filtros",
      "Los filtros de búsqueda no son válidos.",
    );
  }

  const errores: ErrorCampoCodigos[] = [];

  const campanaId = validarIdentificador(
    valores.campanaId,
    "campanaId",
    errores,
    false,
  );

  const loteId = validarIdentificador(
    valores.loteId,
    "loteId",
    errores,
    false,
  );

  const articuloId = validarIdentificador(
    valores.articuloId,
    "articuloId",
    errores,
    false,
  );

  const busqueda = convertirTexto(
    valores.busqueda,
  );

  if (busqueda.length > 150) {
    agregarError(
      errores,
      "busqueda",
      "El texto de búsqueda es demasiado largo.",
    );
  }

  const estadoVentaTexto =
    convertirTexto(
      valores.estadoVenta,
    ) || "todos";

  if (
    estadoVentaTexto !== "todos" &&
    !esOpcion(
      estadoVentaTexto,
      ESTADOS_VENTA,
    )
  ) {
    agregarError(
      errores,
      "estadoVenta",
      "El filtro de ventas no es válido.",
    );
  }

  const estadoRegistroTexto =
    convertirTexto(
      valores.estadoRegistro,
    ) || "activo";

  if (
    estadoRegistroTexto !== "todos" &&
    !esOpcion(
      estadoRegistroTexto,
      ESTADOS_REGISTRO,
    )
  ) {
    agregarError(
      errores,
      "estadoRegistro",
      "El filtro de registro no es válido.",
    );
  }

  const paginaTexto =
    valores.pagina ?? 1;

  const limiteTexto =
    valores.limite ?? 25;

  const pagina = Number(
    paginaTexto,
  );

  const limite = Number(
    limiteTexto,
  );

  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1
  ) {
    agregarError(
      errores,
      "pagina",
      "El número de página no es válido.",
    );
  }

  if (
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite >
      LIMITES_CODIGOS.resultadosPorPagina
  ) {
    agregarError(
      errores,
      "limite",
      `El límite debe estar entre 1 y ${LIMITES_CODIGOS.resultadosPorPagina}.`,
    );
  }

  return finalizarValidacion(
    {
      campanaId:
        campanaId ?? undefined,

      loteId:
        loteId ?? undefined,

      articuloId:
        articuloId ?? undefined,

      busqueda,

      estadoVenta:
        estadoVentaTexto as
          FiltrosCodigosPanel["estadoVenta"],

      estadoRegistro:
        estadoRegistroTexto as
          FiltrosCodigosPanel["estadoRegistro"],

      pagina,
      limite,
    },
    errores,
  );
}

// ================================================
// FIN DEL ARCHIVO
// ================================================
