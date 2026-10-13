
import type {
  APIRoute,
} from "astro";

import {
  randomUUID,
} from "node:crypto";

import {
  createClient,
} from "@supabase/supabase-js";

import type {
  ArticuloCodigosPanel,
} from "@tipos/CodigosPanel";

import {
  obtenerAccesoCodigos,
  PERMISOS_CODIGOS,
  respuestaCorrectaCodigos,
  respuestaErrorCodigos,
} from "@servicios/backend/codigos/seguridadCodigos";

import {
  esUuidCodigos,
  validarActualizacionArticuloCodigos,
} from "@servicios/backend/codigos/validarDatosCodigos";

/*
 * C.B. ANDRATX
 * API de detalle de artículos.
 *
 * GET:
 * Consultar artículo.
 *
 * PATCH:
 * Editar artículo.
 *
 * DELETE:
 * Eliminar artículo lógicamente.
 *
 * Permisos independientes:
 *
 * codigos.ver
 * codigos.editar
 * codigos.eliminar
 *
 * La eliminación no borra registros
 * ni altera los premios ya generados.
 */

export const prerender = false;

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_MAXIMO_SOLICITUD =
  16_384;

const COLUMNAS_ARTICULO = `
  id,
  nombre,
  descripcion,
  imagen_url,
  activo,
  creado_por,
  created_at,
  updated_at
`;

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

// ================================================
// ERRORES
// ================================================

class ErrorArticuloCodigos
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorArticuloCodigos";

    this.status = status;
  }
}

// ================================================
// CLIENTE PRIVADO DE SUPABASE
// ================================================

function obtenerClientePrivado() {
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
    throw new ErrorArticuloCodigos(
      "No se ha configurado correctamente el acceso privado a Supabase.",
      500,
    );
  }

  /*
   * Este cliente nunca debe
   * ejecutarse en el navegador.
   *
   * El acceso se autoriza primero
   * mediante la sesión del panel.
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

type ClientePrivado =
  ReturnType<
    typeof obtenerClientePrivado
  >;

// ================================================
// VALIDAR IDENTIFICADOR
// ================================================

function obtenerArticuloId(
  id: string | undefined,
): string {
  if (
    !id ||
    !esUuidCodigos(id)
  ) {
    throw new ErrorArticuloCodigos(
      "El identificador del artículo no es válido.",
      400,
    );
  }

  return id.toLowerCase();
}

// ================================================
// CONVERTIR FILA DE SUPABASE
// ================================================

function convertirArticulo(
  fila: FilaArticulo,
): ArticuloCodigosPanel {
  return {
    id: fila.id,

    nombre:
      fila.nombre,

    descripcion:
      fila.descripcion,

    imagenUrl:
      fila.imagen_url,

    activo:
      fila.activo === true,

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
// CONSULTAR ARTÍCULO
// ================================================

async function obtenerArticulo(
  cliente: ClientePrivado,
  articuloId: string,
): Promise<FilaArticulo | null> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_articulos")
    .select(
      COLUMNAS_ARTICULO,
    )
    .eq(
      "id",
      articuloId,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorArticuloCodigos(
      "No se ha podido consultar el artículo.",
      500,
    );
  }

  return data as FilaArticulo | null;
}

// ================================================
// COMPROBAR ELIMINACIÓN LÓGICA
// ================================================

async function articuloEstaEliminado(
  cliente: ClientePrivado,
  articuloId: string,
): Promise<boolean> {
  /*
   * La tabla codigos_articulos
   * todavía no dispone de una
   * columna eliminado_at.
   *
   * Distinguimos una eliminación
   * lógica de una desactivación
   * normal utilizando el historial.
   *
   * Un artículo eliminado no puede
   * reactivarse simplemente mediante
   * el permiso codigos.editar.
   */

  const {
    data,
    error,
  } = await cliente
    .from("codigos_movimientos")
    .select("id")
    .eq(
      "accion",
      "articulo_eliminado",
    )
    .contains(
      "detalles",
      {
        articuloId,
      },
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorArticuloCodigos(
      "No se ha podido comprobar el historial del artículo.",
      500,
    );
  }

  return data !== null;
}

// ================================================
// REGISTRAR MOVIMIENTO
// ================================================

async function registrarMovimientoArticulo(
  cliente: ClientePrivado,
  articuloId: string,
  usuarioId: string,
  accion: string,
  detalles: Record<string, unknown>,
): Promise<void> {
  /*
   * El identificador del artículo
   * se guarda dentro de detalles.
   *
   * codigos_movimientos no tiene
   * columna articulo_id.
   *
   * No se almacenan tokens QR
   * ni resultados protegidos.
   */

  const {
    error,
  } = await cliente
    .from("codigos_movimientos")
    .insert({
      codigo_id: null,
      campana_id: null,

      operacion_id:
        randomUUID(),

      accion,

      usuario_id:
        usuarioId,

      detalles: {
        articuloId,
        ...detalles,
      },
    });

  if (error) {
    console.error(
      "Error registrando movimiento de artículo:",
      {
        articuloId,
        accion,
        codigoError:
          error.code,
      },
    );

    throw new ErrorArticuloCodigos(
      "El artículo se ha modificado, pero no se ha podido completar el registro de auditoría. Comprueba su estado antes de repetir la operación.",
      500,
    );
  }
}

// ================================================
// LEER JSON DE ACTUALIZACIÓN
// ================================================

async function leerContenidoJson(
  request: Request,
): Promise<unknown> {
  const tipoContenido =
    request.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();

  if (
    tipoContenido !==
    "application/json"
  ) {
    throw new ErrorArticuloCodigos(
      "El contenido debe enviarse en formato JSON.",
      415,
    );
  }

  const longitudDeclarada =
    request.headers.get(
      "content-length",
    );

  if (
    longitudDeclarada !== null
  ) {
    const longitud =
      Number(
        longitudDeclarada,
      );

    if (
      !Number.isSafeInteger(longitud) ||
      longitud < 0
    ) {
      throw new ErrorArticuloCodigos(
        "El tamaño de la solicitud no es válido.",
        400,
      );
    }

    if (
      longitud >
      TAMANO_MAXIMO_SOLICITUD
    ) {
      throw new ErrorArticuloCodigos(
        "La solicitud es demasiado grande.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorArticuloCodigos(
      "No se han enviado datos para actualizar el artículo.",
      400,
    );
  }

  const lector =
    request.body.getReader();

  const decodificador =
    new TextDecoder(
      "utf-8",
      {
        fatal: true,
      },
    );

  let contenido = "";
  let bytesRecibidos = 0;

  try {
    while (true) {
      const {
        done,
        value,
      } = await lector.read();

      if (done) {
        break;
      }

      bytesRecibidos +=
        value.byteLength;

      if (
        bytesRecibidos >
        TAMANO_MAXIMO_SOLICITUD
      ) {
        await lector.cancel();

        throw new ErrorArticuloCodigos(
          "La solicitud supera el tamaño máximo permitido.",
          413,
        );
      }

      contenido +=
        decodificador.decode(
          value,
          {
            stream: true,
          },
        );
    }

    contenido +=
      decodificador.decode();
  } catch (error) {
    if (
      error instanceof
      ErrorArticuloCodigos
    ) {
      throw error;
    }

    throw new ErrorArticuloCodigos(
      "No se ha podido leer la solicitud.",
      400,
    );
  } finally {
    lector.releaseLock();
  }

  if (!contenido.trim()) {
    throw new ErrorArticuloCodigos(
      "Debes indicar los datos que deseas modificar.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorArticuloCodigos(
      "El contenido JSON no es válido.",
      400,
    );
  }
}

// ================================================
// GESTIÓN DE ERRORES
// ================================================

function gestionarError(
  error: unknown,
  operacion: string,
): Response {
  if (
    error instanceof
    ErrorArticuloCodigos
  ) {
    if (
      error.status >= 500
    ) {
      console.error(
        `Error interno en ${operacion}:`,
        error,
      );
    }

    return respuestaErrorCodigos(
      error.status >= 500 &&
      !error.message.includes(
        "se ha modificado",
      )
        ? "No se ha podido completar la operación solicitada."
        : error.message,
      error.status,
    );
  }

  console.error(
    `Error inesperado en ${operacion}:`,
    error,
  );

  return respuestaErrorCodigos(
    "Se ha producido un error al procesar el artículo.",
    500,
  );
}

// ================================================
// GET - CONSULTAR ARTÍCULO
// ================================================

export const GET: APIRoute =
  async (contexto) => {
    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.ver,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    try {
      const articuloId =
        obtenerArticuloId(
          contexto.params.id,
        );

      const cliente =
        obtenerClientePrivado();

      const articulo =
        await obtenerArticulo(
          cliente,
          articuloId,
        );

      if (!articulo) {
        return respuestaErrorCodigos(
          "El artículo solicitado no existe.",
          404,
        );
      }

      const eliminado =
        await articuloEstaEliminado(
          cliente,
          articuloId,
        );

      return respuestaCorrectaCodigos(
        {
          articulo:
            convertirArticulo(
              articulo,
            ),

          eliminado,
        },
        200,
      );
    } catch (error) {
      return gestionarError(
        error,
        "GET /api/panel/codigos/articulos/[id]",
      );
    }
  };

// ================================================
// PATCH - ACTUALIZAR ARTÍCULO
// ================================================

export const PATCH: APIRoute =
  async (contexto) => {
    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.editar,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    try {
      const articuloId =
        obtenerArticuloId(
          contexto.params.id,
        );

      const contenido =
        await leerContenidoJson(
          contexto.request,
        );

      const validacion =
        validarActualizacionArticuloCodigos(
          contenido,
        );

      if (
        !validacion.valido ||
        !validacion.datos
      ) {
        return respuestaErrorCodigos(
          "Revisa los datos del artículo.",
          400,
          validacion.errores,
        );
      }

      const datos =
        validacion.datos;

      const cliente =
        obtenerClientePrivado();

      const articuloActual =
        await obtenerArticulo(
          cliente,
          articuloId,
        );

      if (!articuloActual) {
        return respuestaErrorCodigos(
          "El artículo que intentas modificar no existe.",
          404,
        );
      }

      /*
       * Impedir modificar artículos
       * eliminados lógicamente.
       *
       * Desactivado y eliminado no
       * son la misma operación.
       */

      const eliminado =
        await articuloEstaEliminado(
          cliente,
          articuloId,
        );

      if (eliminado) {
        return respuestaErrorCodigos(
          "Este artículo ha sido eliminado y no se puede modificar.",
          409,
        );
      }

      /*
       * Solo se actualizan campos
       * expresamente indicados
       * y validados.
       *
       * No se permite modificar:
       *
       * - id
       * - creado_por
       * - created_at
       */

      const cambios:
        Record<string, unknown> = {
          updated_at:
            new Date().toISOString(),
        };

      if (
        datos.nombre !== undefined
      ) {
        cambios.nombre =
          datos.nombre;
      }

      if (
        datos.descripcion !==
        undefined
      ) {
        cambios.descripcion =
          datos.descripcion;
      }

      if (
        datos.imagenUrl !==
        undefined
      ) {
        cambios.imagen_url =
          datos.imagenUrl;
      }

      if (
        datos.activo !== undefined
      ) {
        cambios.activo =
          datos.activo;
      }

      /*
       * Comprobación optimista.
       *
       * Si el estado o la fecha
       * cambiaron entre la lectura
       * y la actualización,
       * no sobrescribimos el registro.
       */

      let consulta =
        cliente
          .from("codigos_articulos")
          .update(
            cambios,
          )
          .eq(
            "id",
            articuloId,
          );

      if (
        articuloActual.activo === null
      ) {
        consulta =
          consulta.is(
            "activo",
            null,
          );
      } else {
        consulta =
          consulta.eq(
            "activo",
            articuloActual.activo,
          );
      }

      if (
        articuloActual.updated_at ===
        null
      ) {
        consulta =
          consulta.is(
            "updated_at",
            null,
          );
      } else {
        consulta =
          consulta.eq(
            "updated_at",
            articuloActual.updated_at,
          );
      }

      const {
        data: articuloActualizado,
        error,
      } = await consulta
        .select(
          COLUMNAS_ARTICULO,
        )
        .maybeSingle();

      if (error) {
        throw new ErrorArticuloCodigos(
          "No se han podido guardar los cambios del artículo.",
          500,
        );
      }

      if (!articuloActualizado) {
        return respuestaErrorCodigos(
          "El artículo ha cambiado durante la edición. Actualiza la página e inténtalo de nuevo.",
          409,
        );
      }

      /*
       * Auditoría de la edición.
       *
       * Se registran los nombres
       * de los campos modificados,
       * no información protegida.
       */

      await registrarMovimientoArticulo(
        cliente,
        articuloId,
        acceso.sesion.usuario.id,
        "articulo_actualizado",
        {
          camposModificados:
            Object.keys(
              datos,
            ),

          activoAnterior:
            articuloActual.activo,

          activoActual:
            articuloActualizado.activo,
        },
      );

      return respuestaCorrectaCodigos(
        {
          articulo:
            convertirArticulo(
              articuloActualizado as
                FilaArticulo,
            ),
        },
        200,
      );
    } catch (error) {
      return gestionarError(
        error,
        "PATCH /api/panel/codigos/articulos/[id]",
      );
    }
  };

// ================================================
// DELETE - ELIMINACIÓN LÓGICA
// ================================================

export const DELETE: APIRoute =
  async (contexto) => {
    /*
     * Eliminar es un permiso
     * independiente de editar.
     */

    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.eliminar,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    try {
      const articuloId =
        obtenerArticuloId(
          contexto.params.id,
        );

      const cliente =
        obtenerClientePrivado();

      const articulo =
        await obtenerArticulo(
          cliente,
          articuloId,
        );

      if (!articulo) {
        return respuestaErrorCodigos(
          "El artículo que intentas eliminar no existe.",
          404,
        );
      }

      /*
       * La eliminación es idempotente.
       *
       * Si ya se eliminó antes,
       * no duplicamos la operación
       * ni modificamos su historial.
       */

      const yaEliminado =
        await articuloEstaEliminado(
          cliente,
          articuloId,
        );

      if (yaEliminado) {
        return respuestaCorrectaCodigos(
          {
            id: articuloId,

            eliminado: true,

            articulo:
              convertirArticulo(
                articulo,
              ),
          },
          200,
        );
      }

      /*
       * ELIMINACIÓN LÓGICA
       *
       * La tabla actual no dispone
       * de eliminado_at.
       *
       * Por tanto:
       *
       * - activo pasa a false.
       * - El registro permanece.
       * - Los códigos no se alteran.
       * - Los premios conservan
       *   su información cifrada.
       * - Se registra la eliminación
       *   en codigos_movimientos.
       *
       * No utilizamos DELETE real
       * sobre codigos_articulos.
       */

      let consulta =
        cliente
          .from("codigos_articulos")
          .update({
            activo: false,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            articuloId,
          );

      if (
        articulo.activo === null
      ) {
        consulta =
          consulta.is(
            "activo",
            null,
          );
      } else {
        consulta =
          consulta.eq(
            "activo",
            articulo.activo,
          );
      }

      if (
        articulo.updated_at === null
      ) {
        consulta =
          consulta.is(
            "updated_at",
            null,
          );
      } else {
        consulta =
          consulta.eq(
            "updated_at",
            articulo.updated_at,
          );
      }

      const {
        data: articuloEliminado,
        error,
      } = await consulta
        .select(
          COLUMNAS_ARTICULO,
        )
        .maybeSingle();

      if (error) {
        throw new ErrorArticuloCodigos(
          "No se ha podido eliminar el artículo.",
          500,
        );
      }

      if (!articuloEliminado) {
        return respuestaErrorCodigos(
          "El artículo ha cambiado durante la operación. Actualiza la página y vuelve a intentarlo.",
          409,
        );
      }

      /*
       * Registrar la eliminación.
       *
       * El movimiento permite
       * distinguir un artículo
       * eliminado de uno solamente
       * desactivado.
       */

      await registrarMovimientoArticulo(
        cliente,
        articuloId,
        acceso.sesion.usuario.id,
        "articulo_eliminado",
        {
          nombre:
            articulo.nombre,

          activoAnterior:
            articulo.activo,

          activoActual:
            false,

          tipo:
            "eliminacion_logica",
        },
      );

      return respuestaCorrectaCodigos(
        {
          id: articuloId,

          eliminado: true,

          articulo:
            convertirArticulo(
              articuloEliminado as
                FilaArticulo,
            ),
        },
        200,
      );
    } catch (error) {
      return gestionarError(
        error,
        "DELETE /api/panel/codigos/articulos/[id]",
      );
    }
  };

// ================================================
// MÉTODOS NO PERMITIDOS
// ================================================

export const ALL: APIRoute =
  async () => {
    return Response.json(
      {
        ok: false,

        data: null,

        error:
          "Método no permitido.",

        errores: [],
      },
      {
        status: 405,

        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",

          "Content-Type":
            "application/json; charset=utf-8",

          "X-Content-Type-Options":
            "nosniff",

          Allow:
            "GET, HEAD, PATCH, DELETE",
        },
      },
    );
  };

// ================================================
// FIN DEL ARCHIVO
// ================================================
