
/*
 * C.B. ANDRATX
 * Sistema de códigos y boletos.
 *
 * Tipos compartidos por el panel,
 * los servicios backend y las API.
 *
 * Los tokens secretos y las claves
 * de cifrado nunca se incluyen en
 * las respuestas públicas.
 */

// ================================================
// ESTADOS Y TIPOS GENERALES
// ================================================

export type TipoCodigoPanel =
  | "general"
  | "rasca_gana";

export type FormatoCodigoPanel =
  | "qr"
  | "barras"
  | "ambos";

export type AccesoCodigoPanel =
  | "publico"
  | "protegido";

export type EstadoVentaCodigo =
  | "pendiente"
  | "vendido"
  | "no_vendido";

export type EstadoRegistroCodigo =
  | "activo"
  | "anulado"
  | "eliminado";

export type EstadoCampanaCodigos =
  | "borrador"
  | "activa"
  | "finalizada";

export type EstadoVentasCampana =
  | "abiertas"
  | "cerradas";

export type EstadoCanjesCampana =
  | "abiertos"
  | "cerrados";

export type EstadoLoteCodigos =
  | "pendiente"
  | "generando"
  | "generado"
  | "error";

export type TipoResultadoCodigo =
  | "premio"
  | "sin_premio";

export type MetodoCanjeCodigo =
  | "qr"
  | "manual";

export type ModoEscanerCodigos =
  | "consulta"
  | "venta"
  | "no_vendidos"
  | "premios";

// ================================================
// ARTÍCULOS
// ================================================

export interface ArticuloCodigosPanel {
  id: string;

  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;

  activo: boolean;

  creadoPor: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CrearArticuloCodigos {
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  activo?: boolean;
}

export interface ActualizarArticuloCodigos {
  nombre?: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  activo?: boolean;
}

export interface EstadisticasArticuloCodigos {
  generados: number;

  pendientes: number;
  vendidos: number;
  noVendidos: number;

  entregados: number;
  vendidosSinCanjear: number;

  anulados: number;
  eliminados: number;
}

// ================================================
// CAMPAÑAS
// ================================================

export interface CampanaCodigosPanel {
  id: string;

  nombre: string;
  descripcion: string | null;

  estado: EstadoCampanaCodigos;
  estadoVentas: EstadoVentasCampana;
  estadoCanjes: EstadoCanjesCampana;

  fechaInicio: string | null;
  fechaFin: string | null;

  ventasCerradasAt: string | null;
  ventasCerradasPor: string | null;

  canjesCerradosAt: string | null;
  canjesCerradosPor: string | null;

  creadoPor: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CrearCampanaCodigos {
  nombre: string;
  descripcion?: string | null;

  fechaInicio?: string | null;
  fechaFin?: string | null;
}

export interface EstadisticasCampanaCodigos {
  totalGenerados: number;

  pendientes: number;
  vendidos: number;
  noVendidos: number;

  premiosGenerados: number;
  premiosVendidos: number;
  premiosEntregados: number;
  premiosVendidosSinCanjear: number;

  anulados: number;
  eliminados: number;
}

// ================================================
// PLANTILLAS DE IMPRESIÓN
// ================================================

export interface PlantillaCodigosPanel {
  id: string;
  familiaId: string | null;

  version: number;

  nombre: string;
  tipo: string;

  imagenBaseUrl: string | null;

  configuracion:
    Record<string, unknown> | null;

  activo: boolean;

  creadoPor: string | null;

  createdAt: string;
  updatedAt: string;
}

// ================================================
// LOTES Y GENERACIÓN MASIVA
// ================================================

export interface DetalleLoteCodigos {
  id: string;

  loteId: string;
  articuloId: string | null;

  tipoResultado: TipoResultadoCodigo;

  cantidad: number;

  createdAt: string;
}

export interface LoteCodigosPanel {
  id: string;

  campanaId: string;
  plantillaId: string | null;

  nombre: string;
  descripcion: string | null;

  cantidadTotal: number;
  estado: EstadoLoteCodigos;

  claveOperacion: string | null;

  generadoPor: string | null;
  generadoAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ArticuloGeneracionLote {
  articuloId: string | null;

  tipoResultado: TipoResultadoCodigo;

  cantidad: number;
}

export interface CrearLoteCodigos {
  campanaId: string;
  plantillaId?: string | null;

  nombre: string;
  descripcion?: string | null;

  /*
   * UUID generado por el cliente para
   * evitar duplicar lotes al reintentar.
   */
  claveOperacion: string;

  articulos: ArticuloGeneracionLote[];
}

export interface ResultadoGeneracionLote {
  lote: LoteCodigosPanel;

  cantidadGenerada: number;

  /*
   * No se devuelve la distribución
   * de premios salvo en operaciones
   * expresamente autorizadas.
   */
  codigosVisibles: string[];
}

// ================================================
// CÓDIGOS Y BOLETOS INDIVIDUALES
// ================================================

export interface CodigoPanel {
  id: string;

  loteId: string | null;

  tipo: TipoCodigoPanel;
  formato: FormatoCodigoPanel;
  acceso: AccesoCodigoPanel;

  codigoVisible: string;

  contenidoPublico: string | null;

  estadoVenta: EstadoVentaCodigo;
  estadoRegistro: EstadoRegistroCodigo;

  estadoVentaAt: string | null;
  actualizadoPor: string | null;

  impresoAt: string | null;
  impresoPor: string | null;

  eliminadoAt: string | null;
  eliminadoPor: string | null;

  motivoEliminacion: string | null;

  creadoPor: string | null;

  createdAt: string;
  updatedAt: string;

  /*
   * Los siguientes datos NO forman
   * parte de esta interfaz:
   *
   * - Token secreto del QR
   * - Hash del token
   * - Contenido cifrado
   * - Clave de cifrado
   * - Premio protegido
   */
}

export interface PremioCodigoPanel {
  tipoResultado: TipoResultadoCodigo;

  articuloId: string | null;

  nombreArticulo: string | null;
  descripcionArticulo: string | null;
}

export interface CodigoConPremioPanel {
  codigo: CodigoPanel;

  /*
   * Solo se utiliza cuando el usuario
   * tiene permiso codigos.premios.
   */
  premio: PremioCodigoPanel;
}

// ================================================
// CANJES Y ENTREGAS
// ================================================

export interface CanjeCodigoPanel {
  id: string;

  codigoId: string;

  entregadoPor: string;
  metodo: MetodoCanjeCodigo;

  observaciones: string | null;

  entregadoAt: string;

  revocadoAt: string | null;
  revocadoPor: string | null;
  motivoRevocacion: string | null;

  createdAt: string;
}

export interface RegistrarCanjeCodigo {
  codigoVisible: string;

  metodo: MetodoCanjeCodigo;

  observaciones?: string | null;
}

export interface ResultadoCanjeCodigo {
  codigo: CodigoPanel;

  canje: CanjeCodigoPanel;

  premio: PremioCodigoPanel;
}

// ================================================
// ESCÁNERES
// ================================================

export type MotivoEscaneoCodigo =
  | "valido"
  | "formato_invalido"
  | "no_encontrado"
  | "otra_campana"
  | "no_vendido"
  | "ya_registrado"
  | "ya_entregado"
  | "anulado"
  | "eliminado"
  | "ventas_cerradas"
  | "canjes_cerrados"
  | "sin_permiso";

export interface SolicitudEscaneoCodigo {
  codigo: string;

  campanaId?: string;

  modo: ModoEscanerCodigos;
}

export interface ResultadoEscaneoCodigo {
  encontrado: boolean;
  valido: boolean;

  motivo: MotivoEscaneoCodigo;
  mensaje: string;

  codigo: CodigoPanel | null;

  estadoAnterior:
    EstadoVentaCodigo | null;

  estadoActual:
    EstadoVentaCodigo | null;

  /*
   * Solo en los modos autorizados
   * de consulta de premios.
   */
  premio?: PremioCodigoPanel | null;

  requiereConfirmacion: boolean;
}

// ================================================
// OPERACIONES INDIVIDUALES Y MASIVAS
// ================================================

export type AccionMasivaCodigos =
  | "marcar_vendido"
  | "marcar_no_vendido"
  | "volver_pendiente"
  | "anular"
  | "eliminar";

export interface SolicitudAccionMasivaCodigos {
  campanaId: string;

  codigosIds: string[];

  accion: AccionMasivaCodigos;

  motivo?: string | null;
}

export interface ResultadoAccionMasivaCodigos {
  accion: AccionMasivaCodigos;

  operacionId: string;

  solicitados: number;
  actualizados: number;
  omitidos: number;

  errores: Array<{
    codigoId: string;
    mensaje: string;
  }>;
}

export interface SolicitudReactivarVenta {
  campanaId: string;
}

export interface ResultadoReactivarVenta {
  campanaId: string;

  operacionId: string;

  reactivados: number;
}

// ================================================
// HISTORIAL Y AUDITORÍA
// ================================================

export interface MovimientoCodigoPanel {
  id: string;

  codigoId: string | null;
  campanaId: string | null;

  operacionId: string | null;

  accion: string;
  usuarioId: string | null;

  detalles:
    Record<string, unknown> | null;

  createdAt: string;
}

// ================================================
// FILTROS Y PAGINACIÓN
// ================================================

export interface FiltrosCodigosPanel {
  campanaId?: string;
  loteId?: string;
  articuloId?: string;

  busqueda?: string;

  estadoVenta?:
    EstadoVentaCodigo | "todos";

  estadoRegistro?:
    EstadoRegistroCodigo | "todos";

  pagina?: number;
  limite?: number;
}

export interface ResultadoListadoCodigos {
  codigos: CodigoPanel[];

  total: number;

  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ================================================
// RESPUESTAS GENERALES DE API
// ================================================

export interface ErrorCampoCodigos {
  campo: string;
  mensaje: string;
}

export interface RespuestaApiCodigos<T> {
  ok: boolean;

  data: T | null;

  error: string | null;

  errores?: ErrorCampoCodigos[];
}
