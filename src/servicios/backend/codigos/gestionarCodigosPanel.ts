
import {
  randomUUID,
} from "node:crypto";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  UsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import type {
  AccionMasivaCodigos,
  CodigoPanel,
  ResultadoAccionMasivaCodigos,
  ResultadoCanjeCodigo,
  ResultadoEscaneoCodigo,
  ResultadoReactivarVenta,
  EstadoVentaCodigo,
} from "@tipos/CodigosPanel";

import {
  comprobarPermisosCodigos,
  PERMISOS_CODIGOS,
  type PermisoCodigos,
} from "./seguridadCodigos";

import {
  esUuidCodigos,
  validarAccionMasivaCodigos,
  validarEscaneoCodigo,
  validarReactivarVentaCodigos,
  validarRegistroCanjeCodigo,
} from "./validarDatosCodigos";

import {
  calcularHashTokenQr,
  esCodigoVisibleValido,
  extraerTokenQr,
  normalizarCodigoVisible,
} from "./generarCodigoSeguro";

import {
  descifrarResultadoCodigo,
} from "./cifradoCodigos";

/*
 * C.B. ANDRATX
 * Gestión de ventas, canjes y estados.
 *
 * Operaciones:
 *
 * - Acciones individuales y masivas.
 * - Registrar ventas mediante escáner.
 * - Marcar boletos no vendidos.
 * - Reactivar boletos no vendidos.
 * - Cerrar y reabrir ventas.
 * - Registrar entregas de premios.
 * - Anular y eliminar lógicamente.
 *
 * Todas las funciones reciben la sesión
 * del usuario y comprueban los permisos.
 *
 * Nunca se devuelven tokens secretos
 * ni resultados cifrados.
 */

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_BLOQUE = 75;

const COLUMNAS_CODIGO = `
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
`;

// ================================================
// TIPOS INTERNOS
// ================================================

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

interface FilaCampana {
  id: string;
  estado: string;
  estado_ventas: string;
  estado_canjes: string;
}

interface FilaLote {
  id: string;
  campana_id: string;
  estado: string;
}

interface FilaCanje {
  id: string;
  codigo_id: string;

  entregado_por: string;
  metodo: "qr" | "manual";

  observaciones: string | null;
  entregado_at: string;

  revocado_at: string | null;
  revocado_por: string | null;
  motivo_revocacion: string | null;

  created_at: string;
}

export interface ResultadoCambioVentasCampana {
  campanaId: string;
  estadoVentas: "abiertas" | "cerradas";

  operacionId: string;
  boletosActualizados: number;
}

// ================================================
// ERRORES
// ================================================

export class ErrorGestionCodigos
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name = "ErrorGestionCodigos";
    this.status = status;
  }
}

// ================================================
// CLIENTE SUPABASE
// ================================================

function obtenerCliente():
  SupabaseClient {
  const url: string | undefined =
    import.meta.env.SUPABASE_URL;

  const clave: string | undefined =
    import.meta.env
      .SUPABASE_SERVICE_ROLE_KEY;

  const clavePublica: string | undefined =
    import.meta.env
      .SUPABASE_ANON_KEY;

  if (
    !url ||
    !clave ||
    clave === clavePublica
  ) {
    throw new ErrorGestionCodigos(
      "No se ha configurado el acceso privado a Supabase.",
      500,
    );
  }

  return createClient(
    url,
    clave,
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
// PERMISOS
// ================================================

async function exigirPermisos(
  sesion: UsuarioSesion,
  permisos: readonly PermisoCodigos[],
): Promise<void> {
  if (
    !sesion?.usuario?.id ||
    !sesion.acceso?.panel
  ) {
    throw new ErrorGestionCodigos(
      "Debes iniciar sesión.",
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
    throw new ErrorGestionCodigos(
      "No se han podido comprobar los permisos.",
      500,
    );
  }

  if (!autorizado) {
    throw new ErrorGestionCodigos(
      "No tienes permiso para realizar esta operación.",
      403,
    );
  }
}

// ================================================
// CONVERSIÓN DE CÓDIGOS
// ================================================

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
// CONSULTAR CAMPAÑA
// ================================================

async function obtenerCampana(
  cliente: SupabaseClient,
  campanaId: string,
): Promise<FilaCampana> {
  if (!esUuidCodigos(campanaId)) {
    throw new ErrorGestionCodigos(
      "La campaña seleccionada no es válida.",
      400,
    );
  }

  const {
    data,
    error,
  } = await cliente
    .from("codigos_campanas")
    .select(
      "id, estado, estado_ventas, estado_canjes",
    )
    .eq("id", campanaId)
    .maybeSingle();

  if (error) {
    throw new ErrorGestionCodigos(
      "No se ha podido consultar la campaña.",
      500,
    );
  }

  if (!data) {
    throw new ErrorGestionCodigos(
      "La campaña no existe.",
      404,
    );
  }

  return data as FilaCampana;
}

// ================================================
// COMPROBAR APERTURA DE VENTAS
// ================================================

function comprobarVentasAbiertas(
  campana: FilaCampana,
): void {
  if (
    campana.estado !== "activa"
  ) {
    throw new ErrorGestionCodigos(
      "La campaña no está activa.",
      409,
    );
  }

  if (
    campana.estado_ventas !==
    "abiertas"
  ) {
    throw new ErrorGestionCodigos(
      "Las ventas de esta campaña están cerradas.",
      409,
    );
  }
}

// ================================================
// CONSULTAR LOTE
// ================================================

async function obtenerLote(
  cliente: SupabaseClient,
  loteId: string,
): Promise<FilaLote> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_lotes")
    .select(
      "id, campana_id, estado",
    )
    .eq("id", loteId)
    .maybeSingle();

  if (error) {
    throw new ErrorGestionCodigos(
      "No se ha podido comprobar el lote.",
      500,
    );
  }

  if (!data) {
    throw new ErrorGestionCodigos(
      "El lote del boleto no existe.",
      404,
    );
  }

  return data as FilaLote;
}

// ================================================
// COMPROBAR CÓDIGO Y CAMPAÑA
// ================================================

async function comprobarCodigoCampana(
  cliente: SupabaseClient,
  codigo: FilaCodigo,
  campanaId?: string,
): Promise<FilaCampana> {
  if (!codigo.lote_id) {
    throw new ErrorGestionCodigos(
      "Este código no pertenece a un lote de boletos.",
      409,
    );
  }

  const lote =
    await obtenerLote(
      cliente,
      codigo.lote_id,
    );

  if (
    lote.estado !== "generado"
  ) {
    throw new ErrorGestionCodigos(
      "Este lote todavía no está disponible.",
      409,
    );
  }

  if (
    campanaId &&
    lote.campana_id !== campanaId
  ) {
    throw new ErrorGestionCodigos(
      "El boleto pertenece a otra campaña.",
      409,
    );
  }

  return obtenerCampana(
    cliente,
    lote.campana_id,
  );
}

// ================================================
// CONSULTAR BOLETO INDIVIDUAL
// ================================================

async function obtenerCodigoVisible(
  cliente: SupabaseClient,
  codigoVisible: string,
): Promise<FilaCodigo | null> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos")
    .select(COLUMNAS_CODIGO)
    .eq(
      "codigo_visible",
      codigoVisible,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorGestionCodigos(
      "No se ha podido consultar el boleto.",
      500,
    );
  }

  return data as FilaCodigo | null;
}

// ================================================
// CONSULTAR CANJES EXISTENTES
// ================================================

async function obtenerIdsCanjeados(
  cliente: SupabaseClient,
  ids: string[],
): Promise<Set<string>> {
  const resultado =
    new Set<string>();

  for (
    let indice = 0;
    indice < ids.length;
    indice += TAMANO_BLOQUE
  ) {
    const bloque =
      ids.slice(
        indice,
        indice + TAMANO_BLOQUE,
      );

    if (bloque.length === 0) {
      continue;
    }

    const {
      data,
      error,
    } = await cliente
      .from("codigos_canjes")
      .select("codigo_id")
      .in("codigo_id", bloque);

    if (error) {
      throw new ErrorGestionCodigos(
        "No se han podido comprobar los canjes existentes.",
        500,
      );
    }

    /*
     * Una fila de canje, incluso
     * revocada, bloquea una segunda
     * entrega automática.
     *
     * Las incidencias requieren
     * intervención administrativa.
     */

    (data ?? []).forEach(
      (fila) => {
        resultado.add(
          fila.codigo_id,
        );
      },
    );
  }

  return resultado;
}

// ================================================
// REGISTRAR AUDITORÍA
// ================================================

async function registrarMovimiento(
  cliente: SupabaseClient,
  datos: {
    codigoId?: string | null;
    campanaId: string;
    operacionId: string;
    accion: string;
    usuarioId: string;
    detalles?: Record<string, unknown>;
  },
): Promise<void> {
  const {
    error,
  } = await cliente
    .from("codigos_movimientos")
    .insert({
      codigo_id:
        datos.codigoId ?? null,

      campana_id:
        datos.campanaId,

      operacion_id:
        datos.operacionId,

      accion:
        datos.accion,

      usuario_id:
        datos.usuarioId,

      detalles:
        datos.detalles ?? {},
    });

  if (error) {
    /*
     * No se incluyen tokens ni
     * premios en los registros.
     *
     * Como no existe una transacción
     * común, el movimiento puede
     * haber cambiado antes de fallar
     * la escritura de auditoría.
     */

    console.error(
      "Error registrando movimiento de códigos:",
      {
        operacionId:
          datos.operacionId,

        codigoError:
          error.code,
      },
    );

    throw new ErrorGestionCodigos(
      "La operación requiere revisar su registro de auditoría.",
      500,
    );
  }
}

// ================================================
// DETERMINAR CAMBIO DE ESTADO
// ================================================

function obtenerCambioPermitido(
  codigo: FilaCodigo,
  accion: AccionMasivaCodigos,
  canjeado: boolean,
): Record<string, unknown> | null {
  const estado =
    codigo.estado_registro;

  const venta =
    codigo.estado_venta;

  if (
    estado === "eliminado" ||
    canjeado
  ) {
    return null;
  }

  switch (accion) {
    case "marcar_vendido":
      if (
        estado !== "activo" ||
        (
          venta !== "pendiente" &&
          venta !== "no_vendido"
        )
      ) {
        return null;
      }

      return {
        estado_venta: "vendido",
      };

    case "marcar_no_vendido":
      if (
        estado !== "activo" ||
        venta !== "pendiente"
      ) {
        return null;
      }

      return {
        estado_venta: "no_vendido",
      };

    case "volver_pendiente":
      if (
        estado !== "activo" ||
        venta !== "no_vendido"
      ) {
        return null;
      }

      return {
        estado_venta: "pendiente",
      };

    case "anular":
      if (estado !== "activo") {
        return null;
      }

      return {
        estado_registro: "anulado",
      };

    case "eliminar":
      if (
        ![
          "activo",
          "anulado",
        ].includes(estado) ||
        venta === "vendido"
      ) {
        return null;
      }

      return {
        estado_registro: "eliminado",
      };

    default:
      return null;
  }
}

// ================================================
// ACTUALIZAR CÓDIGO CON CONDICIONES
// ================================================

async function actualizarCodigo(
  cliente: SupabaseClient,
  codigo: FilaCodigo,
  cambios: Record<string, unknown>,
  usuarioId: string,
  motivo?: string | null,
): Promise<FilaCodigo | null> {
  const ahora =
    new Date().toISOString();

  const cambiaVenta =
    Object.hasOwn(
      cambios,
      "estado_venta",
    );

  const elimina =
    cambios.estado_registro ===
    "eliminado";

  /*
   * Solo se modifica si siguen
   * coincidiendo los estados
   * que habíamos consultado.
   *
   * Así evitamos sobrescribir
   * un cambio realizado entre
   * dos solicitudes.
   */

  const {
    data,
    error,
  } = await cliente
    .from("codigos")
    .update({
      ...cambios,

      actualizado_por:
        usuarioId,

      ...(cambiaVenta
        ? {
            estado_venta_at:
              ahora,
          }
        : {}),

      ...(elimina
        ? {
            eliminado_at:
              ahora,

            eliminado_por:
              usuarioId,

            motivo_eliminacion:
              motivo ?? null,
          }
        : {}),

      updated_at:
        ahora,
    })
    .eq("id", codigo.id)
    .eq(
      "estado_venta",
      codigo.estado_venta,
    )
    .eq(
      "estado_registro",
      codigo.estado_registro,
    )
    .select(COLUMNAS_CODIGO)
    .maybeSingle();

  if (error) {
    throw new ErrorGestionCodigos(
      "No se ha podido actualizar el boleto.",
      500,
    );
  }

  return data as FilaCodigo | null;
}

// ================================================
// ACCIONES MASIVAS
// ================================================

export async function aplicarAccionMasivaCodigos(
  sesion: UsuarioSesion,
  contenido: unknown,
): Promise<ResultadoAccionMasivaCodigos> {
  const validacion =
    validarAccionMasivaCodigos(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorGestionCodigos(
      validacion.errores[0]
        ?.mensaje ??
        "La operación no es válida.",
      400,
    );
  }

  const datos =
    validacion.datos;

  const permisos:
    PermisoCodigos[] = [
      PERMISOS_CODIGOS.ver,

      datos.accion === "eliminar"
        ? PERMISOS_CODIGOS.eliminar
        : PERMISOS_CODIGOS.editar,
    ];

  await exigirPermisos(
    sesion,
    permisos,
  );

  const cliente =
    obtenerCliente();

  const campana =
    await obtenerCampana(
      cliente,
      datos.campanaId,
    );

  const accionDeVenta =
    [
      "marcar_vendido",
      "marcar_no_vendido",
      "volver_pendiente",
    ].includes(datos.accion);

  if (accionDeVenta) {
    comprobarVentasAbiertas(
      campana,
    );
  }

  const {
    data,
    error,
  } = await cliente
    .from("codigos")
    .select(COLUMNAS_CODIGO)
    .in(
      "id",
      datos.codigosIds,
    );

  if (error) {
    throw new ErrorGestionCodigos(
      "No se han podido consultar los códigos seleccionados.",
      500,
    );
  }

  const codigos =
    (data ?? []) as FilaCodigo[];

  /*
   * Se comprueba el lote de TODOS
   * los códigos antes de modificar
   * cualquiera de ellos.
   */

  const lotesIds =
    Array.from(
      new Set(
        codigos
          .map(
            (codigo) =>
              codigo.lote_id,
          )
          .filter(
            (id): id is string =>
              id !== null,
          ),
      ),
    );

  const {
    data: lotes,
    error: errorLotes,
  } = lotesIds.length > 0
    ? await cliente
        .from("codigos_lotes")
        .select(
          "id, campana_id, estado",
        )
        .in(
          "id",
          lotesIds,
        )
    : {
        data: [],
        error: null,
      };

  if (errorLotes) {
    throw new ErrorGestionCodigos(
      "No se han podido comprobar los lotes.",
      500,
    );
  }

  const lotesPorId =
    new Map<string, FilaLote>(
      ((lotes ?? []) as FilaLote[])
        .map(
          (lote) => [
            lote.id,
            lote,
          ],
        ),
    );

  const incorrectos =
    codigos.some(
      (codigo) => {
        const lote =
          codigo.lote_id
            ? lotesPorId.get(
                codigo.lote_id,
              )
            : null;

        return (
          !lote ||
          lote.estado !==
            "generado" ||
          lote.campana_id !==
            datos.campanaId
        );
      },
    );

  if (incorrectos) {
    throw new ErrorGestionCodigos(
      "Uno o varios códigos no pertenecen a esta campaña o no están disponibles.",
      409,
    );
  }

  const canjeados =
    await obtenerIdsCanjeados(
      cliente,
      codigos.map(
        (codigo) =>
          codigo.id,
      ),
    );

  const operacionId =
    randomUUID();

  let actualizados = 0;

  const errores:
    ResultadoAccionMasivaCodigos["errores"] = [];

  const encontrados =
    new Set(
      codigos.map(
        (codigo) =>
          codigo.id,
      ),
    );

  datos.codigosIds.forEach(
    (id) => {
      if (!encontrados.has(id)) {
        errores.push({
          codigoId: id,

          mensaje:
            "El código no existe.",
        });
      }
    },
  );

  for (const codigo of codigos) {
    const cambios =
      obtenerCambioPermitido(
        codigo,
        datos.accion,
        canjeados.has(
          codigo.id,
        ),
      );

    if (!cambios) {
      errores.push({
        codigoId:
          codigo.id,

        mensaje:
          "El estado actual del boleto no permite esta operación.",
      });

      continue;
    }

    try {
      const actualizado =
        await actualizarCodigo(
          cliente,
          codigo,
          cambios,
          sesion.usuario.id,
          datos.motivo,
        );

      if (!actualizado) {
        errores.push({
          codigoId:
            codigo.id,

          mensaje:
            "El boleto ha cambiado durante la operación.",
        });

        continue;
      }

      actualizados += 1;

      await registrarMovimiento(
        cliente,
        {
          codigoId:
            codigo.id,

          campanaId:
            datos.campanaId,

          operacionId,

          accion:
            datos.accion,

          usuarioId:
            sesion.usuario.id,

          detalles: {
            estadoAnterior:
              codigo.estado_registro,

            ventaAnterior:
              codigo.estado_venta,

            motivo:
              datos.motivo ?? null,
          },
        },
      );
    } catch (error) {
      errores.push({
        codigoId:
          codigo.id,

        mensaje:
          error instanceof Error
            ? error.message
            : "No se ha podido completar la operación.",
      });
    }
  }

  return {
    accion:
      datos.accion,

    operacionId,

    solicitados:
      datos.codigosIds.length,

    actualizados,

    omitidos:
      datos.codigosIds.length -
      actualizados,

    errores,
  };
}

// ================================================
// OBTENER LOTES DE UNA CAMPAÑA
// ================================================

async function obtenerLotesCampana(
  cliente: SupabaseClient,
  campanaId: string,
): Promise<string[]> {
  const ids: string[] = [];

  let desde = 0;

  while (true) {
    const {
      data,
      error,
    } = await cliente
      .from("codigos_lotes")
      .select("id")
      .eq(
        "campana_id",
        campanaId,
      )
      .eq(
        "estado",
        "generado",
      )
      .order(
        "id",
        {
          ascending: true,
        },
      )
      .range(
        desde,
        desde + 399,
      );

    if (error) {
      throw new ErrorGestionCodigos(
        "No se han podido obtener los lotes de la campaña.",
        500,
      );
    }

    const filas =
      data ?? [];

    ids.push(
      ...filas.map(
        (fila) =>
          fila.id,
      ),
    );

    if (filas.length < 400) {
      break;
    }

    desde += 400;
  }

  return ids;
}

// ================================================
// CAMBIOS MASIVOS POR ESTADO
// ================================================

async function cambiarEstadoCampanaBoletos(
  cliente: SupabaseClient,
  campanaId: string,
  usuarioId: string,
  estadoOrigen: EstadoVentaCodigo,
  estadoDestino: EstadoVentaCodigo,
): Promise<number> {
  const lotesIds =
    await obtenerLotesCampana(
      cliente,
      campanaId,
    );

  let total = 0;

  for (const loteId of lotesIds) {
    /*
     * Seleccionamos siempre el primer
     * bloque pendiente de actualizar.
     *
     * De este modo, no saltamos filas
     * al cambiar su estado.
     */

    while (true) {
      const {
        data,
        error,
      } = await cliente
        .from("codigos")
        .select("id")
        .eq(
          "lote_id",
          loteId,
        )
        .eq(
          "estado_registro",
          "activo",
        )
        .eq(
          "estado_venta",
          estadoOrigen,
        )
        .order(
          "id",
          {
            ascending: true,
          },
        )
        .limit(
          TAMANO_BLOQUE,
        );

      if (error) {
        throw new ErrorGestionCodigos(
          "No se han podido consultar los boletos pendientes de actualizar.",
          500,
        );
      }

      const ids =
        (data ?? []).map(
          (fila) =>
            fila.id,
        );

      if (ids.length === 0) {
        break;
      }

      /*
       * Al reactivar boletos no vendidos,
       * no permitimos modificar ninguno
       * con historial de canje.
       */

      if (
        estadoDestino ===
        "pendiente"
      ) {
        const canjeados =
          await obtenerIdsCanjeados(
            cliente,
            ids,
          );

        if (
          canjeados.size > 0
        ) {
          throw new ErrorGestionCodigos(
            "Se han encontrado boletos no vendidos con historial de canje. Es necesario revisarlos.",
            409,
          );
        }
      }

      const ahora =
        new Date().toISOString();

      const {
        data: actualizados,
        error: errorActualizar,
      } = await cliente
        .from("codigos")
        .update({
          estado_venta:
            estadoDestino,

          estado_venta_at:
            ahora,

          actualizado_por:
            usuarioId,

          updated_at:
            ahora,
        })
        .in(
          "id",
          ids,
        )
        .eq(
          "estado_registro",
          "activo",
        )
        .eq(
          "estado_venta",
          estadoOrigen,
        )
        .select("id");

      if (errorActualizar) {
        throw new ErrorGestionCodigos(
          "No se ha podido actualizar el estado de los boletos.",
          500,
        );
      }

      const cantidad =
        actualizados?.length ?? 0;

      if (cantidad === 0) {
        throw new ErrorGestionCodigos(
          "Los boletos han cambiado durante la operación. Reinténtalo.",
          409,
        );
      }

      total += cantidad;
    }
  }

  return total;
}

// ================================================
// CERRAR VENTAS
// ================================================

export async function cerrarVentasCampanaCodigos(
  sesion: UsuarioSesion,
  campanaId: string,
): Promise<ResultadoCambioVentasCampana> {
  await exigirPermisos(
    sesion,
    [
      PERMISOS_CODIGOS.editar,
    ],
  );

  const cliente =
    obtenerCliente();

  const campana =
    await obtenerCampana(
      cliente,
      campanaId,
    );

  if (
    campana.estado !== "activa"
  ) {
    throw new ErrorGestionCodigos(
      "La campaña no está activa.",
      409,
    );
  }

  const operacionId =
    randomUUID();

  /*
   * Primero cerramos las ventas.
   *
   * Así, los siguientes escaneos
   * de venta serán rechazados por
   * las API que comprueben el
   * estado de campaña.
   *
   * Si el proceso se interrumpe,
   * una nueva llamada continuará
   * clasificando los pendientes.
   */

  if (
    campana.estado_ventas ===
    "abiertas"
  ) {
    const {
      data,
      error,
    } = await cliente
      .from("codigos_campanas")
      .update({
        estado_ventas:
          "cerradas",

        ventas_cerradas_at:
          new Date().toISOString(),

        ventas_cerradas_por:
          sesion.usuario.id,
      })
      .eq("id", campanaId)
      .eq(
        "estado_ventas",
        "abiertas",
      )
      .select("id")
      .maybeSingle();

    if (error || !data) {
      throw new ErrorGestionCodigos(
        "No se ha podido cerrar la venta de la campaña.",
        409,
      );
    }
  }

  /*
   * Los pendientes restantes pasan
   * a vendidos, tal como se acordó
   * en el cierre de ventas.
   */

  const actualizados =
    await cambiarEstadoCampanaBoletos(
      cliente,
      campanaId,
      sesion.usuario.id,
      "pendiente",
      "vendido",
    );

  await registrarMovimiento(
    cliente,
    {
      campanaId,
      operacionId,

      accion:
        "cerrar_ventas",

      usuarioId:
        sesion.usuario.id,

      detalles: {
        boletosActualizados:
          actualizados,
      },
    },
  );

  return {
    campanaId,

    estadoVentas:
      "cerradas",

    operacionId,

    boletosActualizados:
      actualizados,
  };
}

// ================================================
// REABRIR VENTAS
// ================================================

export async function abrirVentasCampanaCodigos(
  sesion: UsuarioSesion,
  campanaId: string,
): Promise<ResultadoCambioVentasCampana> {
  await exigirPermisos(
    sesion,
    [
      PERMISOS_CODIGOS.editar,
    ],
  );

  const cliente =
    obtenerCliente();

  const campana =
    await obtenerCampana(
      cliente,
      campanaId,
    );

  if (
    campana.estado !== "activa"
  ) {
    throw new ErrorGestionCodigos(
      "La campaña no está activa.",
      409,
    );
  }

  if (
    campana.estado_ventas !==
    "cerradas"
  ) {
    throw new ErrorGestionCodigos(
      "Las ventas ya están abiertas.",
      409,
    );
  }

  const {
    data,
    error,
  } = await cliente
    .from("codigos_campanas")
    .update({
      estado_ventas:
        "abiertas",

      ventas_cerradas_at:
        null,

      ventas_cerradas_por:
        null,
    })
    .eq(
      "id",
      campanaId,
    )
    .eq(
      "estado_ventas",
      "cerradas",
    )
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new ErrorGestionCodigos(
      "No se han podido reabrir las ventas.",
      409,
    );
  }

  const operacionId =
    randomUUID();

  await registrarMovimiento(
    cliente,
    {
      campanaId,
      operacionId,

      accion:
        "abrir_ventas",

      usuarioId:
        sesion.usuario.id,
    },
  );

  return {
    campanaId,

    estadoVentas:
      "abiertas",

    operacionId,

    boletosActualizados: 0,
  };
}

// ================================================
// REACTIVAR BOLETOS NO VENDIDOS
// ================================================

export async function reactivarVentaCodigos(
  sesion: UsuarioSesion,
  contenido: unknown,
): Promise<ResultadoReactivarVenta> {
  await exigirPermisos(
    sesion,
    [
      PERMISOS_CODIGOS.editar,
    ],
  );

  const validacion =
    validarReactivarVentaCodigos(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorGestionCodigos(
      validacion.errores[0]
        ?.mensaje ??
        "La solicitud de reactivación no es válida.",
      400,
    );
  }

  const campanaId =
    validacion.datos.campanaId;

  const cliente =
    obtenerCliente();

  const campana =
    await obtenerCampana(
      cliente,
      campanaId,
    );

  comprobarVentasAbiertas(
    campana,
  );

  /*
   * Solo cambia:
   *
   * no_vendido -> pendiente
   *
   * No modifica vendidos,
   * entregados, anulados
   * ni eliminados.
   */

  const reactivados =
    await cambiarEstadoCampanaBoletos(
      cliente,
      campanaId,
      sesion.usuario.id,
      "no_vendido",
      "pendiente",
    );

  const operacionId =
    randomUUID();

  await registrarMovimiento(
    cliente,
    {
      campanaId,
      operacionId,

      accion:
        "reactivar_venta",

      usuarioId:
        sesion.usuario.id,

      detalles: {
        reactivados,
      },
    },
  );

  return {
    campanaId,
    operacionId,
    reactivados,
  };
}

// ================================================
// ESCÁNER RÁPIDO DE VENTAS
// ================================================

export async function registrarEscaneoVentaCodigos(
  sesion: UsuarioSesion,
  contenido: unknown,
): Promise<ResultadoEscaneoCodigo> {
  await exigirPermisos(
    sesion,
    [
      PERMISOS_CODIGOS.escanear,
      PERMISOS_CODIGOS.editar,
    ],
  );

  const validacion =
    validarEscaneoCodigo(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorGestionCodigos(
      validacion.errores[0]
        ?.mensaje ??
        "El código escaneado no es válido.",
      400,
    );
  }

  const datos =
    validacion.datos;

  if (
    datos.modo !== "venta" &&
    datos.modo !== "no_vendidos"
  ) {
    throw new ErrorGestionCodigos(
      "Este escáner solo permite operaciones de venta.",
      400,
    );
  }

  if (!datos.campanaId) {
    throw new ErrorGestionCodigos(
      "Debes seleccionar una campaña.",
      400,
    );
  }

  const cliente =
    obtenerCliente();

  const campana =
    await obtenerCampana(
      cliente,
      datos.campanaId,
    );

  comprobarVentasAbiertas(
    campana,
  );

  /*
   * Se admite:
   *
   * - URL QR con token.
   * - Token QR válido.
   * - Código visible impreso.
   *
   * En todos los casos se realiza
   * una consulta privada.
   */

  const token =
    extraerTokenQr(
      datos.codigo,
    );

  let consulta =
    cliente
      .from("codigos")
      .select(COLUMNAS_CODIGO);

  if (token) {
    const hash =
      await calcularHashTokenQr(
        token,
      );

    consulta = consulta.eq(
      "qr_token_hash",
      hash,
    );
  } else {
    const codigoVisible =
      normalizarCodigoVisible(
        datos.codigo,
      );

    if (
      !esCodigoVisibleValido(
        codigoVisible,
      )
    ) {
      throw new ErrorGestionCodigos(
        "El formato del código no es válido.",
        400,
      );
    }

    consulta = consulta.eq(
      "codigo_visible",
      codigoVisible,
    );
  }

  const {
    data,
    error,
  } = await consulta
    .maybeSingle();

  if (error) {
    throw new ErrorGestionCodigos(
      "No se ha podido consultar el código escaneado.",
      500,
    );
  }

  const codigo =
    data as FilaCodigo | null;

  if (!codigo) {
    return {
      encontrado: false,
      valido: false,

      motivo:
        "no_encontrado",

      mensaje:
        "Código no encontrado.",

      codigo: null,

      estadoAnterior: null,
      estadoActual: null,

      requiereConfirmacion: false,
    };
  }

  /*
   * No permitimos modificar códigos
   * de otra campaña ni de lotes
   * incompletos.
   */

  await comprobarCodigoCampana(
    cliente,
    codigo,
    datos.campanaId,
  );

  const codigoSeguro =
    convertirCodigo(
      codigo,
    );

  if (
    codigo.estado_registro !==
    "activo"
  ) {
    return {
      encontrado: true,
      valido: false,

      motivo:
        codigo.estado_registro ===
        "eliminado"
          ? "eliminado"
          : "anulado",

      mensaje:
        "Este código no está activo.",

      codigo:
        codigoSeguro,

      estadoAnterior:
        codigoSeguro.estadoVenta,

      estadoActual:
        codigoSeguro.estadoVenta,

      requiereConfirmacion: false,
    };
  }

  const destino:
    EstadoVentaCodigo =
    datos.modo === "venta"
      ? "vendido"
      : "no_vendido";

  /*
   * Ambos escáneres rápidos
   * solamente cambian códigos
   * actualmente pendientes.
   */

  if (
    codigo.estado_venta !==
    "pendiente"
  ) {
    return {
      encontrado: true,
      valido: false,

      motivo:
        "ya_registrado",

      mensaje:
        "El boleto ya tiene un estado de venta registrado.",

      codigo:
        codigoSeguro,

      estadoAnterior:
        codigoSeguro.estadoVenta,

      estadoActual:
        codigoSeguro.estadoVenta,

      requiereConfirmacion: false,
    };
  }

  const canjeados =
    await obtenerIdsCanjeados(
      cliente,
      [codigo.id],
    );

  if (
    canjeados.has(
      codigo.id,
    )
  ) {
    return {
      encontrado: true,
      valido: false,

      motivo:
        "ya_entregado",

      mensaje:
        "Este boleto ya tiene un canje registrado.",

      codigo:
        codigoSeguro,

      estadoAnterior:
        codigoSeguro.estadoVenta,

      estadoActual:
        codigoSeguro.estadoVenta,

      requiereConfirmacion: false,
    };
  }

  const actualizado =
    await actualizarCodigo(
      cliente,
      codigo,
      {
        estado_venta:
          destino,
      },
      sesion.usuario.id,
    );

  if (!actualizado) {
    throw new ErrorGestionCodigos(
      "El estado del boleto ha cambiado durante el escaneo.",
      409,
    );
  }

  await registrarMovimiento(
    cliente,
    {
      codigoId:
        codigo.id,

      campanaId:
        datos.campanaId,

      operacionId:
        randomUUID(),

      accion:
        datos.modo === "venta"
          ? "escaner_venta"
          : "escaner_no_vendidos",

      usuarioId:
        sesion.usuario.id,

      detalles: {
        estadoAnterior:
          "pendiente",

        estadoActual:
          destino,
      },
    },
  );

  return {
    encontrado: true,
    valido: true,

    motivo:
      "valido",

    mensaje:
      destino === "vendido"
        ? "Boleto registrado como vendido."
        : "Boleto registrado como no vendido.",

    codigo:
      convertirCodigo(
        actualizado,
      ),

    estadoAnterior:
      "pendiente",

    estadoActual:
      destino,

    requiereConfirmacion: false,
  };
}

// ================================================
// REGISTRAR ENTREGA DE PREMIO
// ================================================

export async function registrarCanjeCodigo(
  sesion: UsuarioSesion,
  contenido: unknown,
): Promise<ResultadoCanjeCodigo> {
  await exigirPermisos(
    sesion,
    [
      PERMISOS_CODIGOS.canjear,
      PERMISOS_CODIGOS.premios,
    ],
  );

  const validacion =
    validarRegistroCanjeCodigo(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorGestionCodigos(
      validacion.errores[0]
        ?.mensaje ??
        "Los datos del canje no son válidos.",
      400,
    );
  }

  const datos =
    validacion.datos;

  const cliente =
    obtenerCliente();

  const codigo =
    await obtenerCodigoVisible(
      cliente,
      datos.codigoVisible,
    );

  if (!codigo) {
    throw new ErrorGestionCodigos(
      "No se ha encontrado el boleto.",
      404,
    );
  }

  const campana =
    await comprobarCodigoCampana(
      cliente,
      codigo,
    );

  if (
    campana.estado_canjes !==
    "abiertos"
  ) {
    throw new ErrorGestionCodigos(
      "El periodo de entrega de premios está cerrado.",
      409,
    );
  }

  if (
    codigo.estado_registro !==
    "activo"
  ) {
    throw new ErrorGestionCodigos(
      "Este boleto está anulado o eliminado.",
      409,
    );
  }

  if (
    codigo.estado_venta ===
    "no_vendido"
  ) {
    throw new ErrorGestionCodigos(
      "No se puede entregar el premio de un boleto marcado como no vendido.",
      409,
    );
  }

  /*
   * Comprobación previa de canje.
   */

  const anteriores =
    await obtenerIdsCanjeados(
      cliente,
      [codigo.id],
    );

  if (
    anteriores.has(
      codigo.id,
    )
  ) {
    throw new ErrorGestionCodigos(
      "Este premio ya tiene una entrega registrada.",
      409,
    );
  }

  /*
   * Recuperamos el resultado
   * únicamente después de
   * autorizar el canje.
   */

  const {
    data: filaResultado,
    error: errorResultado,
  } = await cliente
    .from("codigos_resultados")
    .select(
      "codigo_id, resultado_cifrado",
    )
    .eq(
      "codigo_id",
      codigo.id,
    )
    .maybeSingle();

  if (
    errorResultado ||
    !filaResultado?.resultado_cifrado
  ) {
    throw new ErrorGestionCodigos(
      "No se ha podido recuperar el resultado protegido del boleto.",
      500,
    );
  }

  const premio =
    await descifrarResultadoCodigo(
      codigo.id,
      filaResultado.resultado_cifrado,
    );

  if (
    premio.tipoResultado !==
    "premio"
  ) {
    throw new ErrorGestionCodigos(
      "Este boleto no contiene un premio para entregar.",
      409,
    );
  }

  /*
   * Si estaba pendiente, lo
   * clasificamos como vendido.
   *
   * Los boletos no vendidos no
   * pueden canjearse directamente.
   */

  let codigoActual =
    codigo;

  if (
    codigoActual.estado_venta ===
    "pendiente"
  ) {
    const actualizado =
      await actualizarCodigo(
        cliente,
        codigoActual,
        {
          estado_venta:
            "vendido",
        },
        sesion.usuario.id,
      );

    if (!actualizado) {
      throw new ErrorGestionCodigos(
        "El estado del boleto ha cambiado. Vuelve a comprobarlo.",
        409,
      );
    }

    codigoActual =
      actualizado;
  }

  if (
    codigoActual.estado_venta !==
    "vendido"
  ) {
    throw new ErrorGestionCodigos(
      "El boleto no está en un estado válido para el canje.",
      409,
    );
  }

  /*
   * El identificador del canje
   * será el mismo UUID del código.
   *
   * codigos_canjes.id es PRIMARY KEY.
   *
   * Así, dos peticiones que intenten
   * entregar el mismo boleto mediante
   * este servicio no podrán insertar
   * dos entregas.
   */

  const ahora =
    new Date().toISOString();

  const {
    data: canjeCreado,
    error: errorCanje,
  } = await cliente
    .from("codigos_canjes")
    .insert({
      id:
        codigo.id,

      codigo_id:
        codigo.id,

      entregado_por:
        sesion.usuario.id,

      metodo:
        datos.metodo,

      observaciones:
        datos.observaciones ?? null,

      entregado_at:
        ahora,

      revocado_at:
        null,

      revocado_por:
        null,

      motivo_revocacion:
        null,
    })
    .select(`
      id,
      codigo_id,
      entregado_por,
      metodo,
      observaciones,
      entregado_at,
      revocado_at,
      revocado_por,
      motivo_revocacion,
      created_at
    `)
    .single();

  if (errorCanje) {
    if (
      errorCanje.code ===
      "23505"
    ) {
      throw new ErrorGestionCodigos(
        "Este premio ya tiene un canje registrado.",
        409,
      );
    }

    throw new ErrorGestionCodigos(
      "No se ha podido registrar la entrega del premio. Comprueba su estado antes de reintentarlo.",
      500,
    );
  }

  if (!canjeCreado) {
    throw new ErrorGestionCodigos(
      "No se ha podido confirmar la entrega del premio.",
      500,
    );
  }

  await registrarMovimiento(
    cliente,
    {
      codigoId:
        codigo.id,

      campanaId:
        campana.id,

      operacionId:
        randomUUID(),

      accion:
        "premio_entregado",

      usuarioId:
        sesion.usuario.id,

      detalles: {
        metodo:
          datos.metodo,
      },
    },
  );

  const fila =
    canjeCreado as FilaCanje;

  return {
    codigo:
      convertirCodigo(
        codigoActual,
      ),

    canje: {
      id:
        fila.id,

      codigoId:
        fila.codigo_id,

      entregadoPor:
        fila.entregado_por,

      metodo:
        fila.metodo,

      observaciones:
        fila.observaciones,

      entregadoAt:
        fila.entregado_at,

      revocadoAt:
        fila.revocado_at,

      revocadoPor:
        fila.revocado_por,

      motivoRevocacion:
        fila.motivo_revocacion,

      createdAt:
        fila.created_at,
    },

    premio: {
      tipoResultado:
        premio.tipoResultado,

      articuloId:
        premio.articuloId,

      nombreArticulo:
        premio.nombreArticulo,

      descripcionArticulo:
        premio.descripcionArticulo,
    },
  };
}

// ================================================
// FIN DEL ARCHIVO
// ================================================
