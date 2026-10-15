
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { UsuarioSesion } from "@servicios/backend/sesiones/obtenerUsuarioSesion";
import {
  comprobarPermisosCodigos,
  PERMISOS_CODIGOS,
  type PermisoCodigos,
} from "./seguridadCodigos";
import { esUuidCodigos } from "./validarDatosCodigos";
import {
  generarTokenQr,
  calcularHashTokenQr,
  construirContenidoQr,
  extraerTokenQr,
} from "./generarCodigoSeguro";
import { cifrarTokenQr, descifrarTokenQr } from "./cifradoCodigos";
import type { TipoResultadoCodigo } from "@tipos/CodigosPanel";

/*
 * C.B. ANDRATX — Gestión simplificada de premios por campaña.
 *
 * Requiere la migración:
 * supabase/migrations/20261014_codigos_campana_articulos.sql
 *
 * Un QR por pareja campaña-artículo, compartido por sus copias.
 * Las copias NO son individualmente identificables.
 * Se contabilizan canjes y no vendidos por cantidades.
 *
 * Exclusivo del servidor. NO importar desde componentes del navegador.
 */

const MAXIMO_CANTIDAD = 1_000_000;
const LIMITE_ARTICULOS_CAMPANA = 500;

const COLUMNAS_ARTICULO_CAMPANA = `
  id, campana_id, articulo_id, tipo_resultado, numero_rasca,
  cantidad_inicial, cantidad_canjeada, cantidad_no_vendida,
  created_at, updated_at
`;

interface FilaCampana {
  id: string;
  estado: string;
  estado_ventas: string;
  estado_canjes: string;
}

interface FilaArticuloCatalogo {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  activo: boolean;
}

interface FilaArticuloCampana {
  id: string;
  campana_id: string;
  articulo_id: string | null;
  tipo_resultado: TipoResultadoCodigo;
  numero_rasca: string | null;
  cantidad_inicial: number;
  cantidad_canjeada: number;
  cantidad_no_vendida: number;
  created_at: string;
  updated_at: string;
}

export interface ArticuloCampanaResumen {
  id: string;
  campanaId: string;
  articuloId: string | null;
  tipoResultado: TipoResultadoCodigo;
  numeroRasca: string | null;
  nombreArticulo: string;
  descripcionArticulo: string | null;
  imagenUrl: string | null;
  cantidadInicial: number;
  canjeados: number;
  noVendidos: number;
  vendidosEstimados: number;
  pendientesCanjeEstimados: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrearArticuloCampana {
  campanaId: string;
  articuloId: string | null;
  tipoResultado: TipoResultadoCodigo;
  numeroRasca: string | null;
  cantidadInicial: number;
}

export type AccionMovimientoArticuloCampana = "canjeado" | "no_vendido";

export interface RegistrarMovimientoArticuloCampana {
  campanaId: string;
  lectura: string;
  accion: AccionMovimientoArticuloCampana;
  operacionId: string;
}

export interface ResultadoMovimientoArticuloCampana {
  ok: boolean;
  repetida: boolean;
  articuloId: string;
  cantidadInicial: number;
  canjeados: number;
  noVendidos: number;
  vendidosEstimados: number;
  pendientesCanje: number;
}

export interface QrArticuloCampanaImpresion {
  articulo: ArticuloCampanaResumen;
  contenidoQr: string;
}

export class ErrorArticulosCampana extends Error {
  constructor(mensaje: string, public status = 400) {
    super(mensaje);
    this.name = "ErrorArticulosCampana";
  }
}

function uuid(valor: unknown, nombre: string): string {
  if (typeof valor !== "string" || !esUuidCodigos(valor)) {
    throw new ErrorArticulosCampana(`El identificador de ${nombre} no es válido.`, 400);
  }
  return valor.toLowerCase();
}

function cantidadValida(valor: unknown): number {
  if (!Number.isSafeInteger(valor) || (valor as number) < 0 || (valor as number) > MAXIMO_CANTIDAD) {
    throw new ErrorArticulosCampana(`La cantidad debe ser un entero entre 0 y ${MAXIMO_CANTIDAD}.`);
  }
  return valor as number;
}

function numeroRascaValido(valor: unknown): string {
  if (typeof valor !== "string" || !/^0*[1-9][0-9]*$/.test(valor.trim()) || valor.trim().length > 6) {
    throw new ErrorArticulosCampana("El número de rasca debe contener de 1 a 6 cifras y ser mayor que cero.");
  }
  // Los números 7, 07 y 007 deben identificar al mismo premio.
  const numero = Number(valor.trim());
  return String(numero).padStart(2, "0");
}

function obtenerClientePrivado(): SupabaseClient {
  const url: string | undefined = import.meta.env.SUPABASE_URL;
  const privada: string | undefined = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const publica: string | undefined = import.meta.env.SUPABASE_ANON_KEY;

  if (!url || !privada || privada === publica) {
    throw new ErrorArticulosCampana("No se ha configurado el acceso privado a Supabase.", 500);
  }

  return createClient(url, privada, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function exigirPermisos(sesion: UsuarioSesion, permisos: readonly PermisoCodigos[]): Promise<void> {
  if (!sesion?.usuario?.id || !sesion.acceso?.panel) {
    throw new ErrorArticulosCampana("Debes iniciar sesión en el panel.", 401);
  }

  let autorizado: boolean;
  try {
    autorizado = await comprobarPermisosCodigos(sesion, permisos);
  } catch {
    throw new ErrorArticulosCampana("No se han podido comprobar los permisos.", 500);
  }
  if (!autorizado) {
    throw new ErrorArticulosCampana("No tienes permisos suficientes.", 403);
  }
}

async function obtenerCampana(cliente: SupabaseClient, id: string): Promise<FilaCampana> {
  const { data, error } = await cliente
    .from("codigos_campanas")
    .select("id, estado, estado_ventas, estado_canjes")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ErrorArticulosCampana("No se ha podido consultar la campaña.", 500);
  if (!data) throw new ErrorArticulosCampana("La campaña no existe.", 404);
  return data as FilaCampana;
}

function exigirCampanaEditable(campana: FilaCampana): void {
  if (!["borrador", "activa"].includes(campana.estado) || campana.estado_ventas !== "abiertas") {
    throw new ErrorArticulosCampana("La campaña está finalizada o tiene las ventas cerradas.", 409);
  }
}

async function obtenerFila(cliente: SupabaseClient, campanaId: string, id: string): Promise<FilaArticuloCampana> {
  const { data, error } = await cliente
    .from("codigos_campana_articulos")
    .select(COLUMNAS_ARTICULO_CAMPANA)
    .eq("campana_id", campanaId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ErrorArticulosCampana("No se ha podido consultar el artículo de la campaña.", 500);
  if (!data) throw new ErrorArticulosCampana("El artículo no pertenece a esta campaña.", 404);
  return data as FilaArticuloCampana;
}

async function catalogoPorIds(cliente: SupabaseClient, ids: string[]): Promise<Map<string, FilaArticuloCatalogo>> {
  const mapa = new Map<string, FilaArticuloCatalogo>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await cliente
      .from("codigos_articulos")
      .select("id, nombre, descripcion, imagen_url, activo")
      .in("id", ids.slice(i, i + 100));

    if (error) throw new ErrorArticulosCampana("No se ha podido consultar el catálogo de artículos.", 500);
    for (const articulo of (data ?? []) as FilaArticuloCatalogo[]) {
      mapa.set(articulo.id, articulo);
    }
  }
  return mapa;
}

function presentar(fila: FilaArticuloCampana, articulo?: FilaArticuloCatalogo): ArticuloCampanaResumen {
  const vendidosEstimados = fila.cantidad_inicial - fila.cantidad_no_vendida;
  return {
    id: fila.id,
    campanaId: fila.campana_id,
    articuloId: fila.articulo_id,
    tipoResultado: fila.tipo_resultado,
    numeroRasca: fila.numero_rasca,
    nombreArticulo: fila.tipo_resultado === "sin_premio" ? "Sin premio" : (articulo?.nombre ?? "Artículo no disponible"),
    descripcionArticulo: articulo?.descripcion ?? null,
    imagenUrl: articulo?.imagen_url ?? null,
    cantidadInicial: fila.cantidad_inicial,
    canjeados: fila.cantidad_canjeada,
    noVendidos: fila.cantidad_no_vendida,
    vendidosEstimados,
    pendientesCanjeEstimados: vendidosEstimados - fila.cantidad_canjeada,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
  };
}

async function presentarConCatalogo(cliente: SupabaseClient, fila: FilaArticuloCampana): Promise<ArticuloCampanaResumen> {
  const mapa = fila.articulo_id ? await catalogoPorIds(cliente, [fila.articulo_id]) : new Map<string, FilaArticuloCatalogo>();
  return presentar(fila, fila.articulo_id ? mapa.get(fila.articulo_id) : undefined);
}

/** Listado protegido: no devuelve hashes, tokens ni contenido cifrado. */
export async function listarArticulosCampana(
  sesion: UsuarioSesion,
  campanaId: string,
): Promise<ArticuloCampanaResumen[]> {
  await exigirPermisos(sesion, [PERMISOS_CODIGOS.ver, PERMISOS_CODIGOS.premios]);
  const cliente = obtenerClientePrivado();
  const id = uuid(campanaId, "campaña");
  await obtenerCampana(cliente, id);

  const { data, count, error } = await cliente
    .from("codigos_campana_articulos")
    .select(COLUMNAS_ARTICULO_CAMPANA, { count: "exact" })
    .eq("campana_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(LIMITE_ARTICULOS_CAMPANA);

  if (error) throw new ErrorArticulosCampana("No se han podido consultar los artículos de la campaña.", 500);
  if ((count ?? 0) > LIMITE_ARTICULOS_CAMPANA) {
    throw new ErrorArticulosCampana("La campaña supera el límite de artículos consultables.", 409);
  }
  const filas = (data ?? []) as FilaArticuloCampana[];
  const ids = [...new Set(filas.map(f => f.articulo_id).filter((v): v is string => v !== null))];
  const mapa = await catalogoPorIds(cliente, ids);
  return filas.map(f => presentar(f, f.articulo_id ? mapa.get(f.articulo_id) : undefined));
}

/** Crea una entrada y su QR opaco compartido. No devuelve el token. */
export async function crearArticuloCampana(
  sesion: UsuarioSesion,
  entrada: CrearArticuloCampana,
): Promise<ArticuloCampanaResumen> {
  await exigirPermisos(sesion, [PERMISOS_CODIGOS.ver, PERMISOS_CODIGOS.crear, PERMISOS_CODIGOS.premios]);
  if (!entrada || typeof entrada !== "object") throw new ErrorArticulosCampana("La solicitud no es válida.");
  const campanaId = uuid(entrada.campanaId, "campaña");
  const cantidadInicial = cantidadValida(entrada.cantidadInicial);
  if (entrada.tipoResultado !== "premio" && entrada.tipoResultado !== "sin_premio") {
    throw new ErrorArticulosCampana("El tipo de resultado no es válido.");
  }

  const articuloId = entrada.tipoResultado === "premio"
    ? uuid(entrada.articuloId, "artículo")
    : null;
  const numeroRasca = entrada.tipoResultado === "premio"
    ? numeroRascaValido(entrada.numeroRasca)
    : null;

  if (entrada.tipoResultado === "sin_premio" && (entrada.articuloId != null || entrada.numeroRasca != null)) {
    throw new ErrorArticulosCampana("Una entrada sin premio no puede indicar un artículo ni un número de rasca.");
  }

  const cliente = obtenerClientePrivado();
  const campana = await obtenerCampana(cliente, campanaId);
  exigirCampanaEditable(campana);

  if (articuloId) {
    const articulos = await catalogoPorIds(cliente, [articuloId]);
    if (!articulos.get(articuloId)?.activo) {
      throw new ErrorArticulosCampana("El artículo seleccionado no está activo en el catálogo.", 409);
    }
  }

  const id = randomUUID();
  const token = generarTokenQr();
  const hash = await calcularHashTokenQr(token);
  const cifrado = await cifrarTokenQr(id, token);

  const { data, error } = await cliente
    .from("codigos_campana_articulos")
    .insert({
      id,
      campana_id: campanaId,
      articulo_id: articuloId,
      tipo_resultado: entrada.tipoResultado,
      numero_rasca: numeroRasca,
      cantidad_inicial: cantidadInicial,
      qr_token_hash: hash,
      qr_token_cifrado: cifrado,
    })
    .select(COLUMNAS_ARTICULO_CAMPANA)
    .single();

  if (error) {
    if (error.code === "23505") throw new ErrorArticulosCampana("Ese artículo o número de rasca ya está asignado a la campaña.", 409);
    throw new ErrorArticulosCampana("No se ha podido asignar el artículo a la campaña.", 500);
  }

  return presentarConCatalogo(cliente, data as FilaArticuloCampana);
}

/** Solo aumenta la cantidad inicial: no invalida boletos ya impresos. */
export async function ampliarCantidadArticuloCampana(
  sesion: UsuarioSesion,
  campanaId: string,
  articuloCampanaId: string,
  nuevaCantidadInicial: number,
): Promise<ArticuloCampanaResumen> {
  await exigirPermisos(sesion, [PERMISOS_CODIGOS.ver, PERMISOS_CODIGOS.editar, PERMISOS_CODIGOS.premios]);
  const cliente = obtenerClientePrivado();
  const idCampana = uuid(campanaId, "campaña");
  const idArticulo = uuid(articuloCampanaId, "artículo de campaña");
  const cantidad = cantidadValida(nuevaCantidadInicial);
  exigirCampanaEditable(await obtenerCampana(cliente, idCampana));
  const fila = await obtenerFila(cliente, idCampana, idArticulo);
  if (cantidad <= fila.cantidad_inicial) {
    throw new ErrorArticulosCampana("La nueva cantidad debe ser mayor que la cantidad inicial actual.", 409);
  }

  // Actualización optimista: evita sobrescribir otro aumento concurrente.
  const { data, error } = await cliente
    .from("codigos_campana_articulos")
    .update({ cantidad_inicial: cantidad, updated_at: new Date().toISOString() })
    .eq("id", idArticulo)
    .eq("campana_id", idCampana)
    .eq("cantidad_inicial", fila.cantidad_inicial)
    .select(COLUMNAS_ARTICULO_CAMPANA)
    .maybeSingle();

  if (error) throw new ErrorArticulosCampana("No se ha podido ampliar la cantidad.", 500);
  if (!data) throw new ErrorArticulosCampana("La cantidad ha cambiado. Actualiza la página antes de intentarlo de nuevo.", 409);
  return presentarConCatalogo(cliente, data as FilaArticuloCampana);
}

/** Solo para impresión autorizada. La URL no se incluye en listados normales. */
export async function obtenerQrArticuloCampanaParaImpresion(
  sesion: UsuarioSesion,
  campanaId: string,
  articuloCampanaId: string,
): Promise<QrArticuloCampanaImpresion> {
  await exigirPermisos(sesion, [PERMISOS_CODIGOS.ver, PERMISOS_CODIGOS.premios, PERMISOS_CODIGOS.imprimir]);
  const cliente = obtenerClientePrivado();
  const idCampana = uuid(campanaId, "campaña");
  const idArticulo = uuid(articuloCampanaId, "artículo de campaña");
  await obtenerCampana(cliente, idCampana);

  const { data, error } = await cliente
    .from("codigos_campana_articulos")
    .select(`${COLUMNAS_ARTICULO_CAMPANA}, qr_token_cifrado, qr_token_hash`)
    .eq("id", idArticulo)
    .eq("campana_id", idCampana)
    .maybeSingle();

  if (error) throw new ErrorArticulosCampana("No se ha podido consultar el QR del artículo.", 500);
  if (!data) throw new ErrorArticulosCampana("No existe el artículo en esta campaña.", 404);

  const fila = data as FilaArticuloCampana & { qr_token_cifrado: string | null; qr_token_hash: string | null };
  if (!fila.qr_token_cifrado || !fila.qr_token_hash) {
    throw new ErrorArticulosCampana("Este artículo no tiene un QR generado.", 409);
  }

  const token = await descifrarTokenQr(fila.id, fila.qr_token_cifrado);
  if (await calcularHashTokenQr(token) !== fila.qr_token_hash) {
    throw new ErrorArticulosCampana("No se ha podido verificar el QR almacenado.", 500);
  }

  return {
    articulo: await presentarConCatalogo(cliente, fila),
    contenidoQr: construirContenidoQr(token),
  };
}

/**
 * Registra una unidad, no un boleto individual.
 * lectura: QR oficial o número de rasca (p. ej. "07").
 * Los dos modos tienen permisos independientes.
 */
export async function registrarMovimientoArticuloCampana(
  sesion: UsuarioSesion,
  entrada: RegistrarMovimientoArticuloCampana,
): Promise<ResultadoMovimientoArticuloCampana> {
  if (!entrada || typeof entrada !== "object") throw new ErrorArticulosCampana("La solicitud no es válida.");
  if (entrada.accion !== "canjeado" && entrada.accion !== "no_vendido") {
    throw new ErrorArticulosCampana("La operación no es válida.");
  }
  const permisos: PermisoCodigos[] = [PERMISOS_CODIGOS.ver, PERMISOS_CODIGOS.escanear];
  if (entrada.accion === "canjeado") permisos.push(PERMISOS_CODIGOS.canjear);
  else permisos.push(PERMISOS_CODIGOS.editar);
  await exigirPermisos(sesion, permisos);

  const campanaId = uuid(entrada.campanaId, "campaña");
  const operacionId = uuid(entrada.operacionId, "operación");
  if (typeof entrada.lectura !== "string" || !entrada.lectura.trim() || entrada.lectura.length > 2048) {
    throw new ErrorArticulosCampana("La lectura del escáner no es válida.");
  }
  const lectura = entrada.lectura.trim();
  const token = extraerTokenQr(lectura);
  const numero = !token && /^0*[1-9][0-9]*$/.test(lectura)
    ? numeroRascaValido(lectura)
    : null;
  if (!token && !numero) {
    throw new ErrorArticulosCampana("Introduce el número de rasca o escanea un QR del club.");
  }

  const cliente = obtenerClientePrivado();
  await obtenerCampana(cliente, campanaId);
  let consulta = cliente
    .from("codigos_campana_articulos")
    .select("id")
    .eq("campana_id", campanaId);

  consulta = token
    ? consulta.eq("qr_token_hash", await calcularHashTokenQr(token))
    : consulta.eq("numero_rasca", numero!);

  const { data, error } = await consulta.maybeSingle();
  if (error) throw new ErrorArticulosCampana("No se ha podido identificar el premio.", 500);
  if (!data) throw new ErrorArticulosCampana("No hay un artículo de esta campaña asociado a la lectura.", 404);

  const { data: movimiento, error: errorMovimiento } = await cliente.rpc(
    "registrar_movimiento_articulo_campana",
    {
      p_campana_articulo_id: data.id,
      p_accion: entrada.accion,
      p_operacion_id: operacionId,
      p_usuario_id: sesion.usuario.id,
    },
  );

  if (errorMovimiento) {
    // No asumir éxito cuando la transacción se rechaza o falla.
    if (errorMovimiento.code === "P0001" || errorMovimiento.code === "23514") {
      throw new ErrorArticulosCampana("No se ha registrado la operación. Comprueba el estado y las cantidades disponibles.", 409);
    }
    throw new ErrorArticulosCampana("No se ha podido registrar el movimiento.", 500);
  }

  if (typeof movimiento !== "object" || movimiento === null || Array.isArray(movimiento)) {
    throw new ErrorArticulosCampana("El servidor no ha confirmado el movimiento.", 500);
  }
  const resultado = movimiento as Record<string, unknown>;
  if (resultado.ok !== true || resultado.articuloId !== data.id) {
    throw new ErrorArticulosCampana("La confirmación del movimiento no es válida.", 500);
  }

  return {
    ok: true,
    repetida: resultado.repetida === true,
    articuloId: data.id,
    cantidadInicial: resultado.cantidadInicial as number,
    canjeados: resultado.canjeados as number,
    noVendidos: resultado.noVendidos as number,
    vendidosEstimados: resultado.vendidosEstimados as number,
    pendientesCanje: resultado.pendientesCanje as number,
  };
}
