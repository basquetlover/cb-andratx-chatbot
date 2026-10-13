
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  UsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisosCodigos,
  PERMISOS_CODIGOS,
  type PermisoCodigos,
} from "./seguridadCodigos";

import {
  validarFiltrosCodigos,
  esUuidCodigos,
} from "./validarDatosCodigos";

import {
  generarIndiceArticuloSeguro,
} from "./cifradoCodigos";

import type {
  ArticuloCodigosPanel,
  CodigoPanel,
  EstadisticasArticuloCodigos,
  EstadisticasCampanaCodigos,
  FiltrosCodigosPanel,
  ResultadoListadoCodigos,
} from "@tipos/CodigosPanel";

/*
 * C.B. ANDRATX
 * Consultas del sistema de códigos y boletos.
 *
 * Funcionalidades:
 *
 * - Consultar artículos.
 * - Consultar códigos con filtros.
 * - Buscar códigos de un artículo.
 * - Consultar estadísticas de artículos.
 * - Consultar estadísticas de campañas.
 * - Comprobar entregas y canjes.
 *
 * El servicio nunca devuelve:
 *
 * - Tokens QR.
 * - Hashes de tokens.
 * - Contenidos cifrados.
 * - Claves privadas.
 * - Índices HMAC.
 *
 * Las consultas relacionadas con premios
 * requieren autorización específica.
 */

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_BLOQUE_CONSULTA = 400;

const TAMANO_BLOQUE_RELACIONES = 100;

const MAXIMO_FILTRO_DIRECTO = 100;

const MAXIMO_RESULTADOS_PAGINA = 100;

// ================================================
// TIPOS INTERNOS
// ================================================

interface FilaArticulo {
  id: string;

  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;

  activo: boolean | null;

  creado_por: string | null;

  created_at: string;
  updated_at: string | null;
}

interface FilaCodigo {
  id: string;

  lote_id: string | null;

  tipo: string;
  formato: string;
  acceso: string;

  codigo_visible: string;

  contenido_publico: string | null;

  estado_venta: string;
  estado_registro: string;

  estado_venta_at: string | null;
  actualizado_por: string | null;

  impreso_at: string | null;
  impreso_por: string | null;

  eliminado_at: string | null;
  eliminado_por: string | null;

  motivo_eliminacion: string | null;

  creado_por: string | null;

  created_at: string;
  updated_at: string | null;
}

interface FilaIdentificador {
  id: string;
}

interface FilaResultado {
  codigo_id: string;
}

interface FilaCanje {
  codigo_id: string;
}

export interface CodigoListadoPanel
  extends CodigoPanel {
  /*
   * Solo se informa de la entrega
   * en los listados protegidos
   * asociados a un artículo.
   *
   * En el listado general no
   * aparece esta propiedad.
   */
  entregado?: boolean;
}

export interface ResultadoListadoCodigosPanel
  extends Omit<
    ResultadoListadoCodigos,
    "codigos"
  > {
  codigos: CodigoListadoPanel[];
}

interface OpcionesConsultaCodigos {
  campanaId?: string | null;
  articuloId?: string | null;

  busqueda?: string;

  estadoVenta?: string;
  estadoRegistro?: string;
}

// ================================================
// ERRORES
// ================================================

export class ErrorConsultarCodigosPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorConsultarCodigosPanel";

    this.status = status;
  }
}

// ================================================
// CLIENTE PRIVADO DE SUPABASE
// ================================================

function obtenerClienteCodigos():
  SupabaseClient {
  const supabaseUrl:
    string | undefined =
    import.meta.env.SUPABASE_URL;

  const clavePrivada:
    string | undefined =
    import.meta.env
      .SUPABASE_SERVICE_ROLE_KEY;

  const clavePublica:
    string | undefined =
    import.meta.env
      .SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !clavePrivada ||
    clavePrivada === clavePublica
  ) {
    throw new ErrorConsultarCodigosPanel(
      "No se ha configurado correctamente el acceso privado de Supabase.",
    );
  }

  /*
   * Este cliente solamente puede
   * utilizarse desde el servidor.
   *
   * Nunca debe importarse en
   * componentes React del navegador.
   */

  return createClient(
    supabaseUrl,
    clavePrivada,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

// ================================================
// COMPROBACIÓN DE AUTORIZACIÓN
// ================================================

async function comprobarAccesoConsulta(
  sesion: UsuarioSesion,
  permisos: readonly PermisoCodigos[],
): Promise<void> {
  if (
    !sesion?.usuario?.id ||
    !sesion.acceso?.panel
  ) {
    throw new ErrorConsultarCodigosPanel(
      "Debes iniciar sesión para consultar los códigos.",
      401,
    );
  }

  let autorizado = false;

  try {
    autorizado =
      await comprobarPermisosCodigos(
        sesion,
        permisos,
      );
  } catch {
    throw new ErrorConsultarCodigosPanel(
      "No se han podido comprobar los permisos del usuario.",
      500,
    );
  }

  if (!autorizado) {
    throw new ErrorConsultarCodigosPanel(
      "No tienes permisos suficientes para realizar esta consulta.",
      403,
    );
  }
}

// ================================================
// CONVERSORES DE DATOS
// ================================================

function convertirArticulo(
  fila: FilaArticulo,
): ArticuloCodigosPanel {
  return {
    id: fila.id,

    nombre: fila.nombre,
    descripcion: fila.descripcion,
    imagenUrl: fila.imagen_url,

    activo: fila.activo === true,

    creadoPor: fila.creado_por,

    createdAt: fila.created_at,

    updatedAt:
      fila.updated_at ??
      fila.created_at,
  };
}

function convertirCodigo(
  fila: FilaCodigo,
): CodigoPanel {
  return {
    id: fila.id,

    loteId: fila.lote_id,

    tipo:
      fila.tipo as CodigoPanel["tipo"],

    formato:
      fila.formato as CodigoPanel["formato"],

    acceso:
      fila.acceso as CodigoPanel["acceso"],

    codigoVisible:
      fila.codigo_visible,

    contenidoPublico:
      fila.contenido_publico,

    estadoVenta:
      fila.estado_venta as
        CodigoPanel["estadoVenta"],

    estadoRegistro:
      fila.estado_registro as
        CodigoPanel["estadoRegistro"],

    estadoVentaAt:
      fila.estado_venta_at,

    actualizadoPor:
      fila.actualizado_por,

    impresoAt:
      fila.impreso_at,

    impresoPor:
      fila.impreso_por,

    eliminadoAt:
      fila.eliminado_at,

    eliminadoPor:
      fila.eliminado_por,

    motivoEliminacion:
      fila.motivo_eliminacion,

    creadoPor:
      fila.creado_por,

    createdAt:
      fila.created_at,

    updatedAt:
      fila.updated_at ??
      fila.created_at,
  };
}

// ================================================
// VALIDAR IDENTIFICADORES
// ================================================

function comprobarUuid(
  valor: string,
  nombre: string,
): string {
  if (!esUuidCodigos(valor)) {
    throw new ErrorConsultarCodigosPanel(
      `El identificador de ${nombre} no es válido.`,
      400,
    );
  }

  return valor.toLowerCase();
}

// ================================================
// COMPROBAR EXISTENCIA DE CAMPAÑA
// ================================================

async function comprobarCampana(
  cliente: SupabaseClient,
  campanaId: string,
): Promise<void> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_campanas")
    .select("id")
    .eq("id", campanaId)
    .maybeSingle();

  if (error) {
    throw new ErrorConsultarCodigosPanel(
      "No se ha podido consultar la campaña.",
    );
  }

  if (!data) {
    throw new ErrorConsultarCodigosPanel(
      "La campaña seleccionada no existe.",
      404,
    );
  }
}

// ================================================
// COMPROBAR EXISTENCIA DE ARTÍCULO
// ================================================

async function comprobarArticulo(
  cliente: SupabaseClient,
  articuloId: string,
): Promise<void> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_articulos")
    .select("id")
    .eq("id", articuloId)
    .maybeSingle();

  if (error) {
    throw new ErrorConsultarCodigosPanel(
      "No se ha podido consultar el artículo.",
    );
  }

  if (!data) {
    throw new ErrorConsultarCodigosPanel(
      "El artículo seleccionado no existe.",
      404,
    );
  }
}

// ================================================
// OBTENER LOTES GENERADOS
// ================================================

async function obtenerIdsLotesGenerados(
  cliente: SupabaseClient,
  campanaId?: string | null,
): Promise<Set<string>> {
  const ids =
    new Set<string>();

  if (campanaId) {
    await comprobarCampana(
      cliente,
      campanaId,
    );
  }

  /*
   * Solo se tienen en cuenta lotes
   * completamente generados.
   *
   * Se excluyen:
   *
   * - pendiente
   * - generando
   * - error
   */

  let desde = 0;

  while (true) {
    let consulta =
      cliente
        .from("codigos_lotes")
        .select("id")
        .eq(
          "estado",
          "generado",
        );

    if (campanaId) {
      consulta = consulta.eq(
        "campana_id",
        campanaId,
      );
    }

    const {
      data,
      error,
    } = await consulta
      .order(
        "id",
        {
          ascending: true,
        },
      )
      .range(
        desde,
        desde +
          TAMANO_BLOQUE_CONSULTA -
          1,
      );

    if (error) {
      throw new ErrorConsultarCodigosPanel(
        "No se han podido obtener los lotes de códigos.",
      );
    }

    const filas =
      (data ?? []) as FilaIdentificador[];

    filas.forEach(
      (fila) => {
        ids.add(
          fila.id,
        );
      },
    );

    if (
      filas.length <
      TAMANO_BLOQUE_CONSULTA
    ) {
      break;
    }

    desde +=
      TAMANO_BLOQUE_CONSULTA;
  }

  return ids;
}

// ================================================
// OBTENER IDENTIFICADORES DE UN ARTÍCULO
// ================================================

async function obtenerIdsCodigosArticulo(
  cliente: SupabaseClient,
  articuloId: string,
): Promise<Set<string>> {
  await comprobarArticulo(
    cliente,
    articuloId,
  );

  /*
   * No buscamos directamente por
   * articulo_id dentro de codigos.
   *
   * La relación con el premio
   * está protegida mediante HMAC
   * en codigos_resultados.
   */

  const indiceArticulo =
    generarIndiceArticuloSeguro(
      articuloId,
    );

  const ids =
    new Set<string>();

  let desde = 0;

  while (true) {
    const {
      data,
      error,
    } = await cliente
      .from(
        "codigos_resultados",
      )
      .select(
        "codigo_id",
      )
      .eq(
        "indice_articulo",
        indiceArticulo,
      )
      .order(
        "codigo_id",
        {
          ascending: true,
        },
      )
      .range(
        desde,
        desde +
          TAMANO_BLOQUE_CONSULTA -
          1,
      );

    if (error) {
      throw new ErrorConsultarCodigosPanel(
        "No se han podido consultar los códigos del artículo.",
      );
    }

    const filas =
      (data ?? []) as FilaResultado[];

    filas.forEach(
      (fila) => {
        ids.add(
          fila.codigo_id,
        );
      },
    );

    if (
      filas.length <
      TAMANO_BLOQUE_CONSULTA
    ) {
      break;
    }

    desde +=
      TAMANO_BLOQUE_CONSULTA;
  }

  return ids;
}

// ================================================
// RECUPERAR CÓDIGOS FILTRADOS
// ================================================

async function obtenerFilasCodigos(
  cliente: SupabaseClient,
  opciones: OpcionesConsultaCodigos,
): Promise<FilaCodigo[]> {
  const campanaId =
    opciones.campanaId ?? null;

  const articuloId =
    opciones.articuloId ?? null;

  const lotesGenerados =
    await obtenerIdsLotesGenerados(
      cliente,
      campanaId,
    );

  /*
   * Si la campaña no tiene lotes
   * finalizados no existen códigos
   * disponibles para esta consulta.
   */

  if (
    campanaId &&
    lotesGenerados.size === 0
  ) {
    return [];
  }

  let codigosArticulo:
    Set<string> | null = null;

  if (articuloId) {
    codigosArticulo =
      await obtenerIdsCodigosArticulo(
        cliente,
        articuloId,
      );

    if (
      codigosArticulo.size === 0
    ) {
      return [];
    }
  }

  const busqueda =
    opciones.busqueda
      ?.trim()
      .toUpperCase() ?? "";

  /*
   * Solo se admiten caracteres
   * propios de identificadores.
   *
   * Evitamos tratar caracteres de
   * búsqueda como operadores
   * especiales de PostgREST.
   */

  if (
    busqueda &&
    !/^[A-Z0-9 -]{1,150}$/.test(
      busqueda,
    )
  ) {
    throw new ErrorConsultarCodigosPanel(
      "El texto de búsqueda contiene caracteres no permitidos.",
      400,
    );
  }

  const encontrados:
    FilaCodigo[] = [];

  let desde = 0;

  /*
   * Las tablas originales se crearon
   * sin claves foráneas.
   *
   * Para garantizar una consulta
   * correcta, se comprueban los
   * identificadores de lote y premio
   * sin depender de joins implícitos.
   *
   * Los filtros pequeños se aplican
   * directamente en PostgreSQL.
   */

  while (true) {
    let consulta =
      cliente
        .from("codigos")
        .select(`
          id,
          lote_id,
          tipo,
          formato,
          acceso,
          codigo_visible,
          contenido_publico,
          estado_venta,
          estado_registro,
          estado_venta_at,
          actualizado_por,
          impreso_at,
          impreso_por,
          eliminado_at,
          eliminado_por,
          motivo_eliminacion,
          creado_por,
          created_at,
          updated_at
        `);

    if (
      opciones.estadoVenta &&
      opciones.estadoVenta !== "todos"
    ) {
      consulta = consulta.eq(
        "estado_venta",
        opciones.estadoVenta,
      );
    }

    if (
      opciones.estadoRegistro &&
      opciones.estadoRegistro !== "todos"
    ) {
      consulta = consulta.eq(
        "estado_registro",
        opciones.estadoRegistro,
      );
    }

    if (busqueda) {
      consulta = consulta.ilike(
        "codigo_visible",
        `%${busqueda}%`,
      );
    }

    if (
      campanaId &&
      lotesGenerados.size <=
        MAXIMO_FILTRO_DIRECTO
    ) {
      consulta = consulta.in(
        "lote_id",
        Array.from(
          lotesGenerados,
        ),
      );
    }

    if (
      codigosArticulo &&
      codigosArticulo.size <=
        MAXIMO_FILTRO_DIRECTO
    ) {
      consulta = consulta.in(
        "id",
        Array.from(
          codigosArticulo,
        ),
      );
    }

    const {
      data,
      error,
    } = await consulta
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .order(
        "id",
        {
          ascending: false,
        },
      )
      .range(
        desde,
        desde +
          TAMANO_BLOQUE_CONSULTA -
          1,
      );

    if (error) {
      throw new ErrorConsultarCodigosPanel(
        "No se ha podido consultar el listado de códigos.",
      );
    }

    const filas =
      (data ?? []) as FilaCodigo[];

    filas.forEach(
      (fila) => {
        /*
         * Un código de lote solo se
         * muestra si el lote está
         * completamente generado.
         *
         * Los códigos generales sin
         * lote se admiten únicamente
         * fuera del filtro de campaña.
         */

        const loteValido =
          fila.lote_id === null
            ? campanaId === null
            : lotesGenerados.has(
                fila.lote_id,
              );

        if (!loteValido) {
          return;
        }

        if (
          codigosArticulo &&
          !codigosArticulo.has(
            fila.id,
          )
        ) {
          return;
        }

        encontrados.push(
          fila,
        );
      },
    );

    if (
      filas.length <
      TAMANO_BLOQUE_CONSULTA
    ) {
      break;
    }

    desde +=
      TAMANO_BLOQUE_CONSULTA;
  }

  return encontrados;
}

// ================================================
// CONSULTAR CANJES ACTIVOS
// ================================================

async function obtenerIdsCanjeados(
  cliente: SupabaseClient,
  codigosIds: string[],
): Promise<Set<string>> {
  const entregados =
    new Set<string>();

  for (
    let indice = 0;
    indice < codigosIds.length;
    indice += TAMANO_BLOQUE_RELACIONES
  ) {
    const bloque =
      codigosIds.slice(
        indice,
        indice +
          TAMANO_BLOQUE_RELACIONES,
      );

    const {
      data,
      error,
    } = await cliente
      .from("codigos_canjes")
      .select(
        "codigo_id",
      )
      .in(
        "codigo_id",
        bloque,
      )
      .is(
        "revocado_at",
        null,
      );

    if (error) {
      throw new ErrorConsultarCodigosPanel(
        "No se ha podido comprobar el estado de entrega de los premios.",
      );
    }

    const filas =
      (data ?? []) as FilaCanje[];

    filas.forEach(
      (fila) => {
        entregados.add(
          fila.codigo_id,
        );
      },
    );
  }

  return entregados;
}

// ================================================
// CONSULTAR CÓDIGOS PREMIADOS
// ================================================

async function obtenerIdsPremiados(
  cliente: SupabaseClient,
  codigosIds: string[],
): Promise<Set<string>> {
  const premiados =
    new Set<string>();

  /*
   * Esta función solo se invoca
   * después de comprobar el permiso
   * codigos.premios.
   *
   * No se descifra ni devuelve el
   * contenido de los premios.
   */

  for (
    let indice = 0;
    indice < codigosIds.length;
    indice += TAMANO_BLOQUE_RELACIONES
  ) {
    const bloque =
      codigosIds.slice(
        indice,
        indice +
          TAMANO_BLOQUE_RELACIONES,
      );

    const {
      data,
      error,
    } = await cliente
      .from(
        "codigos_resultados",
      )
      .select(
        "codigo_id",
      )
      .in(
        "codigo_id",
        bloque,
      )
      .not(
        "indice_articulo",
        "is",
        null,
      );

    if (error) {
      throw new ErrorConsultarCodigosPanel(
        "No se han podido consultar las estadísticas de premios.",
      );
    }

    const filas =
      (data ?? []) as FilaResultado[];

    filas.forEach(
      (fila) => {
        premiados.add(
          fila.codigo_id,
        );
      },
    );
  }

  return premiados;
}

// ================================================
// LISTAR ARTÍCULOS
// ================================================

export async function obtenerArticulosCodigosPanel(
  sesion: UsuarioSesion,
  soloActivos = false,
): Promise<ArticuloCodigosPanel[]> {
  await comprobarAccesoConsulta(
    sesion,
    [
      PERMISOS_CODIGOS.ver,
    ],
  );

  const cliente =
    obtenerClienteCodigos();

  const articulos:
    ArticuloCodigosPanel[] = [];

  let desde = 0;

  while (true) {
    let consulta =
      cliente
        .from("codigos_articulos")
        .select(`
          id,
          nombre,
          descripcion,
          imagen_url,
          activo,
          creado_por,
          created_at,
          updated_at
        `);

    if (soloActivos) {
      consulta = consulta.eq(
        "activo",
        true,
      );
    }

    const {
      data,
      error,
    } = await consulta
      .order(
        "nombre",
        {
          ascending: true,
        },
      )
      .order(
        "id",
        {
          ascending: true,
        },
      )
      .range(
        desde,
        desde +
          TAMANO_BLOQUE_CONSULTA -
          1,
      );

    if (error) {
      throw new ErrorConsultarCodigosPanel(
        "No se ha podido obtener el catálogo de artículos.",
      );
    }

    const filas =
      (data ?? []) as FilaArticulo[];

    articulos.push(
      ...filas.map(
        convertirArticulo,
      ),
    );

    if (
      filas.length <
      TAMANO_BLOQUE_CONSULTA
    ) {
      break;
    }

    desde +=
      TAMANO_BLOQUE_CONSULTA;
  }

  return articulos;
}

// ================================================
// LISTADO DE CÓDIGOS
// ================================================

export async function obtenerListadoCodigosPanel(
  sesion: UsuarioSesion,
  filtrosEntrada: unknown = {},
): Promise<ResultadoListadoCodigosPanel> {
  const validacion =
    validarFiltrosCodigos(
      filtrosEntrada,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorConsultarCodigosPanel(
      validacion.errores[0]
        ?.mensaje ??
        "Los filtros de códigos no son válidos.",
      400,
    );
  }

  const filtros:
    FiltrosCodigosPanel =
    validacion.datos;

  /*
   * Consultar los códigos de un
   * artículo revela qué boletos
   * contienen ese premio.
   *
   * Por tanto, requiere un permiso
   * adicional al de simple lectura.
   */

  const permisos:
    PermisoCodigos[] = [
      PERMISOS_CODIGOS.ver,
    ];

  if (filtros.articuloId) {
    permisos.push(
      PERMISOS_CODIGOS.premios,
    );
  }

  await comprobarAccesoConsulta(
    sesion,
    permisos,
  );

  const cliente =
    obtenerClienteCodigos();

  const filas =
    await obtenerFilasCodigos(
      cliente,
      {
        campanaId:
          filtros.campanaId,

        articuloId:
          filtros.articuloId,

        busqueda:
          filtros.busqueda,

        estadoVenta:
          filtros.estadoVenta,

        estadoRegistro:
          filtros.estadoRegistro,
      },
    );

  const pagina =
    filtros.pagina ?? 1;

  const limite =
    Math.min(
      filtros.limite ?? 25,
      MAXIMO_RESULTADOS_PAGINA,
    );

  const total =
    filas.length;

  const desde =
    (pagina - 1) * limite;

  const filasPagina =
    filas.slice(
      desde,
      desde + limite,
    );

  let entregados =
    new Set<string>();

  /*
   * Solo se consulta el estado
   * de canje cuando existe un
   * filtro protegido por artículo.
   *
   * El listado general no revela
   * indirectamente qué códigos
   * son boletos premiados.
   */

  if (
    filtros.articuloId &&
    filasPagina.length > 0
  ) {
    entregados =
      await obtenerIdsCanjeados(
        cliente,
        filasPagina.map(
          (fila) => fila.id,
        ),
      );
  }

  const codigos:
    CodigoListadoPanel[] =
    filasPagina.map(
      (fila) => {
        const codigo =
          convertirCodigo(
            fila,
          );

        if (!filtros.articuloId) {
          return codigo;
        }

        return {
          ...codigo,

          entregado:
            entregados.has(
              fila.id,
            ),
        };
      },
    );

  return {
    codigos,

    total,
    pagina,
    limite,

    totalPaginas:
      total === 0
        ? 0
        : Math.ceil(
            total / limite,
          ),
  };
}

// ================================================
// ESTADÍSTICAS POR ARTÍCULO
// ================================================

export async function obtenerEstadisticasArticuloCodigos(
  sesion: UsuarioSesion,
  articuloId: string,
  campanaId?: string,
): Promise<EstadisticasArticuloCodigos> {
  await comprobarAccesoConsulta(
    sesion,
    [
      PERMISOS_CODIGOS.ver,
      PERMISOS_CODIGOS.premios,
    ],
  );

  const articuloIdValido =
    comprobarUuid(
      articuloId,
      "artículo",
    );

  const campanaIdValida =
    campanaId
      ? comprobarUuid(
          campanaId,
          "campaña",
        )
      : null;

  const cliente =
    obtenerClienteCodigos();

  const filas =
    await obtenerFilasCodigos(
      cliente,
      {
        articuloId:
          articuloIdValido,

        campanaId:
          campanaIdValida,

        estadoRegistro:
          "todos",

        estadoVenta:
          "todos",
      },
    );

  const entregados =
    await obtenerIdsCanjeados(
      cliente,
      filas.map(
        (fila) => fila.id,
      ),
    );

  const estadisticas:
    EstadisticasArticuloCodigos = {
      generados: filas.length,

      pendientes: 0,
      vendidos: 0,
      noVendidos: 0,

      entregados: 0,
      vendidosSinCanjear: 0,

      anulados: 0,
      eliminados: 0,
    };

  filas.forEach(
    (fila) => {
      if (
        fila.estado_registro ===
        "eliminado"
      ) {
        estadisticas.eliminados += 1;
        return;
      }

      if (
        fila.estado_registro ===
        "anulado"
      ) {
        estadisticas.anulados += 1;
        return;
      }

      if (
        fila.estado_registro !==
        "activo"
      ) {
        return;
      }

      switch (
        fila.estado_venta
      ) {
        case "pendiente":
          estadisticas.pendientes += 1;
          break;

        case "vendido":
          estadisticas.vendidos += 1;
          break;

        case "no_vendido":
          estadisticas.noVendidos += 1;
          break;
      }

      const entregado =
        entregados.has(
          fila.id,
        );

      if (entregado) {
        estadisticas.entregados += 1;
      }

      if (
        fila.estado_venta ===
          "vendido" &&
        !entregado
      ) {
        estadisticas
          .vendidosSinCanjear += 1;
      }
    },
  );

  return estadisticas;
}

// ================================================
// ESTADÍSTICAS POR CAMPAÑA
// ================================================

export async function obtenerEstadisticasCampanaCodigos(
  sesion: UsuarioSesion,
  campanaId: string,
): Promise<EstadisticasCampanaCodigos> {
  /*
   * Estos resultados contienen
   * información sobre cuántos
   * boletos tienen premio.
   *
   * No se facilitan a usuarios
   * que solo tengan codigos.ver.
   */

  await comprobarAccesoConsulta(
    sesion,
    [
      PERMISOS_CODIGOS.ver,
      PERMISOS_CODIGOS.premios,
    ],
  );

  const campanaIdValida =
    comprobarUuid(
      campanaId,
      "campaña",
    );

  const cliente =
    obtenerClienteCodigos();

  const filas =
    await obtenerFilasCodigos(
      cliente,
      {
        campanaId:
          campanaIdValida,

        estadoRegistro:
          "todos",

        estadoVenta:
          "todos",
      },
    );

  const codigosIds =
    filas.map(
      (fila) => fila.id,
    );

  const [
    premiados,
    entregados,
  ] = await Promise.all([
    obtenerIdsPremiados(
      cliente,
      codigosIds,
    ),

    obtenerIdsCanjeados(
      cliente,
      codigosIds,
    ),
  ]);

  const estadisticas:
    EstadisticasCampanaCodigos = {
      totalGenerados:
        filas.length,

      pendientes: 0,
      vendidos: 0,
      noVendidos: 0,

      premiosGenerados:
        premiados.size,

      premiosVendidos: 0,
      premiosEntregados: 0,
      premiosVendidosSinCanjear: 0,

      anulados: 0,
      eliminados: 0,
    };

  filas.forEach(
    (fila) => {
      if (
        fila.estado_registro ===
        "eliminado"
      ) {
        estadisticas.eliminados += 1;
        return;
      }

      if (
        fila.estado_registro ===
        "anulado"
      ) {
        estadisticas.anulados += 1;
        return;
      }

      if (
        fila.estado_registro !==
        "activo"
      ) {
        return;
      }

      switch (
        fila.estado_venta
      ) {
        case "pendiente":
          estadisticas.pendientes += 1;
          break;

        case "vendido":
          estadisticas.vendidos += 1;
          break;

        case "no_vendido":
          estadisticas.noVendidos += 1;
          break;
      }

      /*
       * Los boletos sin premio no
       * entran en las estadísticas
       * de entregas de artículos.
       */

      if (
        !premiados.has(
          fila.id,
        )
      ) {
        return;
      }

      const entregado =
        entregados.has(
          fila.id,
        );

      if (
        fila.estado_venta ===
        "vendido"
      ) {
        estadisticas
          .premiosVendidos += 1;
      }

      if (entregado) {
        estadisticas
          .premiosEntregados += 1;
      }

      if (
        fila.estado_venta ===
          "vendido" &&
        !entregado
      ) {
        estadisticas
          .premiosVendidosSinCanjear += 1;
      }
    },
  );

  return estadisticas;
}

// ================================================
// FIN DEL ARCHIVO
// ================================================
