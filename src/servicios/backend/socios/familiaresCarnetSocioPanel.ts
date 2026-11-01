
import {
  obtenerSupabasePrivilegiado,
} from "../../supabase/privilegiado";

import type {
  FamiliarCarnetSocio,
} from "@tipos/FamiliaresCarnetSocio";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_FAMILIARES = 30;
const MAX_NOMBRE = 120;

interface FilaFamiliar {
  id: string;
  carnet_id: string;
  nombre_completo: string;
  created_at: string;
  updated_at: string;
}

interface FilaCarnet {
  id: string;
  tipo_socio: string | null;
}

const COLUMNAS_FAMILIAR =
  "id, carnet_id, nombre_completo, created_at, updated_at";

export class ErrorFamiliaresCarnetSocioPanel extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name = "ErrorFamiliaresCarnetSocioPanel";
    this.status = status;
  }
}

function comprobarId(
  valor: string,
  descripcion: string,
): string {
  const id =
    typeof valor === "string"
      ? valor.trim()
      : "";

  if (!UUID.test(id)) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      `El identificador de ${descripcion} no es válido.`,
      400,
    );
  }

  return id;
}

function normalizarNombre(
  valor: unknown,
): string {
  if (typeof valor !== "string") {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "Debes indicar el nombre y los apellidos.",
      400,
    );
  }

  const nombre = valor
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");

  if (
    nombre.length < 2 ||
    nombre.length > MAX_NOMBRE ||
    /[\u0000-\u001f\u007f]/.test(nombre)
  ) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      `El nombre debe tener entre 2 y ${MAX_NOMBRE} caracteres.`,
      400,
    );
  }

  return nombre;
}

function claveNombre(nombre: string): string {
  return nombre
    .normalize("NFKC")
    .toLocaleLowerCase("es-ES");
}

function convertirFamiliar(
  fila: FilaFamiliar,
): FamiliarCarnetSocio {
  return {
    id: fila.id,
    carnetId: fila.carnet_id,
    nombreCompleto: fila.nombre_completo,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
  };
}

async function comprobarCarnetFamiliar(
  socioId: string,
  carnetId: string,
): Promise<void> {
  const cliente = obtenerSupabasePrivilegiado();

  const {
    data,
    error,
  } = await cliente
    .from("socios_temporadas")
    .select("id, tipo_socio")
    .eq("id", carnetId)
    .eq("socio_id", socioId)
    .maybeSingle();

  if (error) {
    console.error(
      "Error consultando el carnet familiar:",
      error,
    );

    throw new ErrorFamiliaresCarnetSocioPanel(
      "No se ha podido comprobar el carnet.",
      500,
    );
  }

  if (!data) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "El carnet no existe o no pertenece a este socio.",
      404,
    );
  }

  const carnet = data as FilaCarnet;

  if (
    carnet.tipo_socio?.trim().toLowerCase() !==
    "familiar"
  ) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "Solo los carnets de tipo Familiar permiten gestionar familiares.",
      409,
    );
  }
}

async function consultarFamiliares(
  carnetId: string,
): Promise<FamiliarCarnetSocio[]> {
  const cliente = obtenerSupabasePrivilegiado();

  const {
    data,
    error,
  } = await cliente
    .from("socios_carnet_familiares")
    .select(COLUMNAS_FAMILIAR)
    .eq("carnet_id", carnetId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error(
      "Error consultando familiares del carnet:",
      error,
    );

    throw new ErrorFamiliaresCarnetSocioPanel(
      "No se han podido consultar los familiares.",
      500,
    );
  }

  return ((data ?? []) as FilaFamiliar[]).map(
    convertirFamiliar,
  );
}

export async function listarFamiliaresCarnetSocio(
  socioId: string,
  carnetId: string,
): Promise<FamiliarCarnetSocio[]> {
  const socio = comprobarId(socioId, "socio");
  const carnet = comprobarId(carnetId, "carnet");

  await comprobarCarnetFamiliar(socio, carnet);

  return consultarFamiliares(carnet);
}

export async function anadirFamiliarCarnetSocio(
  socioId: string,
  carnetId: string,
  nombreCompleto: unknown,
): Promise<FamiliarCarnetSocio[]> {
  const socio = comprobarId(socioId, "socio");
  const carnet = comprobarId(carnetId, "carnet");
  const nombre = normalizarNombre(nombreCompleto);

  await comprobarCarnetFamiliar(socio, carnet);

  const familiares = await consultarFamiliares(carnet);

  if (familiares.length >= MAX_FAMILIARES) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      `Un carnet puede incluir hasta ${MAX_FAMILIARES} familiares adicionales.`,
      409,
    );
  }

  const repetido = familiares.some(
    (familiar) =>
      claveNombre(familiar.nombreCompleto) ===
      claveNombre(nombre),
  );

  if (repetido) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "Esta persona ya está incluida en el carnet.",
      409,
    );
  }

  const cliente = obtenerSupabasePrivilegiado();

  const {
    error,
  } = await cliente
    .from("socios_carnet_familiares")
    .insert({
      carnet_id: carnet,
      nombre_completo: nombre,
    });

  if (error) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      error.code === "23505"
        ? "Esta persona ya está incluida en el carnet."
        : "No se ha podido añadir el familiar.",
      error.code === "23505" ? 409 : 500,
    );
  }

  return consultarFamiliares(carnet);
}

export async function modificarFamiliarCarnetSocio(
  socioId: string,
  carnetId: string,
  familiarId: string,
  nombreCompleto: unknown,
): Promise<FamiliarCarnetSocio[]> {
  const socio = comprobarId(socioId, "socio");
  const carnet = comprobarId(carnetId, "carnet");
  const familiar = comprobarId(familiarId, "familiar");
  const nombre = normalizarNombre(nombreCompleto);

  await comprobarCarnetFamiliar(socio, carnet);

  const familiares = await consultarFamiliares(carnet);

  const existe = familiares.some(
    (elemento) => elemento.id === familiar,
  );

  if (!existe) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "El familiar no existe en este carnet.",
      404,
    );
  }

  const repetido = familiares.some(
    (elemento) =>
      elemento.id !== familiar &&
      claveNombre(elemento.nombreCompleto) ===
        claveNombre(nombre),
  );

  if (repetido) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "Ya existe otro familiar con este nombre.",
      409,
    );
  }

  const cliente = obtenerSupabasePrivilegiado();

  const {
    data,
    error,
  } = await cliente
    .from("socios_carnet_familiares")
    .update({
      nombre_completo: nombre,
      updated_at: new Date().toISOString(),
    })
    .eq("id", familiar)
    .eq("carnet_id", carnet)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      error.code === "23505"
        ? "Ya existe un familiar con este nombre."
        : "No se ha podido modificar el familiar.",
      error.code === "23505" ? 409 : 500,
    );
  }

  if (!data) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "El familiar ya no existe.",
      404,
    );
  }

  return consultarFamiliares(carnet);
}

export async function quitarFamiliarCarnetSocio(
  socioId: string,
  carnetId: string,
  familiarId: string,
): Promise<FamiliarCarnetSocio[]> {
  const socio = comprobarId(socioId, "socio");
  const carnet = comprobarId(carnetId, "carnet");
  const familiar = comprobarId(familiarId, "familiar");

  await comprobarCarnetFamiliar(socio, carnet);

  const cliente = obtenerSupabasePrivilegiado();

  const {
    data,
    error,
  } = await cliente
    .from("socios_carnet_familiares")
    .delete()
    .eq("id", familiar)
    .eq("carnet_id", carnet)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "No se ha podido quitar el familiar.",
      500,
    );
  }

  if (!data) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "El familiar ya no existe en este carnet.",
      404,
    );
  }

  return consultarFamiliares(carnet);
}

export async function copiarFamiliaresCarnetSocio(
  socioId: string,
  carnetDestinoId: string,
  carnetOrigenId: string,
): Promise<{
  familiares: FamiliarCarnetSocio[];
  copiados: number;
}> {
  const socio = comprobarId(socioId, "socio");
  const destino = comprobarId(
    carnetDestinoId,
    "carnet de destino",
  );
  const origen = comprobarId(
    carnetOrigenId,
    "carnet de origen",
  );

  if (destino === origen) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "Selecciona un carnet de otra temporada.",
      400,
    );
  }

  /*
   * Ambos carnets deben pertenecer al mismo socio
   * y ser de tipo Familiar.
   */
  await Promise.all([
    comprobarCarnetFamiliar(socio, destino),
    comprobarCarnetFamiliar(socio, origen),
  ]);

  const [familiaresOrigen, familiaresDestino] =
    await Promise.all([
      consultarFamiliares(origen),
      consultarFamiliares(destino),
    ]);

  const existentes = new Set(
    familiaresDestino.map(
      (familiar) =>
        claveNombre(familiar.nombreCompleto),
    ),
  );

  const nuevos: string[] = [];

  for (const familiar of familiaresOrigen) {
    const clave = claveNombre(familiar.nombreCompleto);

    if (!existentes.has(clave)) {
      nuevos.push(familiar.nombreCompleto);
      existentes.add(clave);
    }
  }

  if (
    familiaresDestino.length + nuevos.length >
    MAX_FAMILIARES
  ) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      "No se pueden copiar todos los familiares porque se superaría el límite del carnet.",
      409,
    );
  }

  if (nuevos.length === 0) {
    return {
      familiares: familiaresDestino,
      copiados: 0,
    };
  }

  const cliente = obtenerSupabasePrivilegiado();

  const {
    error,
  } = await cliente
    .from("socios_carnet_familiares")
    .insert(
      nuevos.map((nombre) => ({
        carnet_id: destino,
        nombre_completo: nombre,
      })),
    );

  if (error) {
    throw new ErrorFamiliaresCarnetSocioPanel(
      error.code === "23505"
        ? "Los familiares han cambiado. Actualiza la lista y vuelve a intentarlo."
        : "No se han podido copiar los familiares.",
      error.code === "23505" ? 409 : 500,
    );
  }

  return {
    familiares: await consultarFamiliares(destino),
    copiados: nuevos.length,
  };
}
