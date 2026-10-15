
import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

// ======================================================
// C.B. ANDRATX
// GUARDAR PERSONAL DE DESIGNACIONES
//
// Alta y edición de árbitros y oficiales de mesa.
//
// Tabla: designaciones_personal
//
// No requiere funciones SQL ni triggers.
// No modifica permisos ni sesiones.
// No elimina registros de personal.
// ======================================================

// ======================================================
// CONFIGURACIÓN
// ======================================================

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REGEX_CODIGO =
  /^CBA-([0-9]{3,})$/;

const MAXIMO_GRUPOS = 30;
const MAXIMO_PERSONAL_CODIGO = 999999;

// ======================================================
// TIPOS
// ======================================================

export type HabilitacionPersonal =
  | "pista"
  | "mesa"
  | "ambos";

export interface DatosGuardarPersonal {
  id?: string | null;

  nombreCompleto: string;

  habilitacion: HabilitacionPersonal;

  nivelPista?: string | null;
  nivelMesa?: string | null;

  grupos?: string[];

  activo?: boolean;

  anotaciones?: string | null;
}

export interface PersonalGuardado {
  id: string;

  codigo: string;
  nombreCompleto: string;

  habilitacion: HabilitacionPersonal;

  nivelPista: string | null;
  nivelMesa: string | null;

  grupos: string[];

  activo: boolean;

  anotaciones: string;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface ResultadoGuardarPersonal {
  personal: PersonalGuardado;
  creado: boolean;
}

interface FilaPersonal {
  id: string;

  codigo: string | null;
  nombre_completo: string | null;

  habilitacion: string | null;

  nivel_pista: string | null;
  nivel_mesa: string | null;

  grupos: string[] | null;

  activo: boolean | null;

  anotaciones: string | null;

  created_at: string | null;
  updated_at: string | null;
}

interface DatosValidados {
  id: string | null;

  nombreCompleto: string;
  habilitacion: HabilitacionPersonal;

  nivelPista: string | null;
  nivelMesa: string | null;

  grupos: string[];

  activo: boolean;
  anotaciones: string | null;
}

type Registro = Record<string, unknown>;

// ======================================================
// ERRORES
// ======================================================

export class ErrorGuardarPersonalDesignaciones
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorGuardarPersonalDesignaciones";

    this.status = status;
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function esRegistro(
  valor: unknown,
): valor is Registro {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function obtenerTexto(
  valor: unknown,
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function obtenerTextoOpcional(
  valor: unknown,
  campo: string,
  maximo: number,
): string | null {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  if (typeof valor !== "string") {
    throw new ErrorGuardarPersonalDesignaciones(
      `El campo ${campo} no es válido.`,
    );
  }

  const resultado = valor.trim();

  if (resultado.length > maximo) {
    throw new ErrorGuardarPersonalDesignaciones(
      `El campo ${campo} no puede superar ${maximo} caracteres.`,
    );
  }

  return resultado || null;
}

function validarUuid(
  valor: string,
): boolean {
  return REGEX_UUID.test(valor);
}

function normalizarHabilitacion(
  valor: unknown,
): HabilitacionPersonal {
  const habilitacion = obtenerTexto(valor)
    .toLocaleLowerCase("es");

  if (
    habilitacion === "pista" ||
    habilitacion === "mesa" ||
    habilitacion === "ambos"
  ) {
    return habilitacion;
  }

  throw new ErrorGuardarPersonalDesignaciones(
    "Selecciona una habilitación válida: pista, mesa o ambos.",
  );
}

function validarGrupos(
  valor: unknown,
): string[] {
  if (
    valor === null ||
    valor === undefined
  ) {
    return [];
  }

  if (!Array.isArray(valor)) {
    throw new ErrorGuardarPersonalDesignaciones(
      "Los grupos deben enviarse como una lista.",
    );
  }

  if (valor.length > MAXIMO_GRUPOS) {
    throw new ErrorGuardarPersonalDesignaciones(
      `No puedes asignar más de ${MAXIMO_GRUPOS} grupos.`,
    );
  }

  const grupos: string[] = [];
  const encontrados = new Set<string>();

  for (const elemento of valor) {
    if (typeof elemento !== "string") {
      throw new ErrorGuardarPersonalDesignaciones(
        "Todos los grupos deben ser textos válidos.",
      );
    }

    const grupo = elemento.trim();

    if (!grupo || grupo.length > 100) {
      throw new ErrorGuardarPersonalDesignaciones(
        "Cada grupo debe tener entre 1 y 100 caracteres.",
      );
    }

    const clave = grupo.toLocaleLowerCase("es");

    if (!encontrados.has(clave)) {
      encontrados.add(clave);
      grupos.push(grupo);
    }
  }

  return grupos;
}

// ======================================================
// VALIDAR DATOS DE ENTRADA
// ======================================================

export function validarDatosPersonalDesignaciones(
  contenido: unknown,
): DatosValidados {
  if (!esRegistro(contenido)) {
    throw new ErrorGuardarPersonalDesignaciones(
      "Los datos del personal no son válidos.",
    );
  }

  const id = obtenerTexto(contenido.id) || null;

  if (id && !validarUuid(id)) {
    throw new ErrorGuardarPersonalDesignaciones(
      "El identificador de la persona no es válido.",
    );
  }

  const nombreCompleto =
    obtenerTexto(contenido.nombreCompleto);

  if (
    nombreCompleto.length < 3 ||
    nombreCompleto.length > 200
  ) {
    throw new ErrorGuardarPersonalDesignaciones(
      "El nombre completo debe tener entre 3 y 200 caracteres.",
    );
  }

  const habilitacion =
    normalizarHabilitacion(
      contenido.habilitacion,
    );

  const nivelPista =
    obtenerTextoOpcional(
      contenido.nivelPista,
      "nivelPista",
      100,
    );

  const nivelMesa =
    obtenerTextoOpcional(
      contenido.nivelMesa,
      "nivelMesa",
      100,
    );

  const grupos =
    validarGrupos(contenido.grupos);

  const activo =
    contenido.activo === undefined
      ? true
      : contenido.activo;

  if (typeof activo !== "boolean") {
    throw new ErrorGuardarPersonalDesignaciones(
      "El estado activo debe ser verdadero o falso.",
    );
  }

  const anotaciones =
    obtenerTextoOpcional(
      contenido.anotaciones,
      "anotaciones",
      5000,
    );

  // El nivel de pista o mesa puede estar definido
  // independientemente de la habilitación.
  //
  // No se eliminan niveles automáticamente:
  // una persona puede cambiar su habilitación
  // sin perder los niveles registrados.

  return {
    id,
    nombreCompleto,
    habilitacion,
    nivelPista,
    nivelMesa,
    grupos,
    activo,
    anotaciones,
  };
}

// ======================================================
// CONVERTIR FILA DE SUPABASE
// ======================================================

function convertirPersonal(
  fila: FilaPersonal,
): PersonalGuardado {
  const habilitacion =
    normalizarHabilitacion(
      fila.habilitacion,
    );

  return {
    id: fila.id,

    codigo:
      fila.codigo ?? "",

    nombreCompleto:
      fila.nombre_completo ?? "",

    habilitacion,

    nivelPista:
      fila.nivel_pista,

    nivelMesa:
      fila.nivel_mesa,

    grupos:
      Array.isArray(fila.grupos)
        ? fila.grupos
        : [],

    activo:
      fila.activo !== false,

    anotaciones:
      fila.anotaciones ?? "",

    createdAt:
      fila.created_at,

    updatedAt:
      fila.updated_at,
  };
}

// ======================================================
// COLUMNAS DE RETORNO
// ======================================================

const COLUMNAS_PERSONAL = `
  id,
  codigo,
  nombre_completo,
  habilitacion,
  nivel_pista,
  nivel_mesa,
  grupos,
  activo,
  anotaciones,
  created_at,
  updated_at
`;

// ======================================================
// COMPROBAR EXISTENCIA
// ======================================================

async function obtenerPersonaExistente(
  id: string,
): Promise<FilaPersonal> {
  const { data, error } = await supabaseServidor
    .from("designaciones_personal")
    .select(COLUMNAS_PERSONAL)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new ErrorGuardarPersonalDesignaciones(
      "No se ha podido consultar la persona.",
      500,
    );
  }

  if (!data?.id) {
    throw new ErrorGuardarPersonalDesignaciones(
      "La persona indicada no existe.",
      404,
    );
  }

  return data as FilaPersonal;
}

// ======================================================
// GENERACIÓN DE CÓDIGOS CBA
// ======================================================

function formatearCodigo(
  numero: number,
): string {
  return `CBA-${String(numero).padStart(3, "0")}`;
}

async function generarSiguienteCodigo(): Promise<string> {
  const { data, error } = await supabaseServidor
    .from("designaciones_personal")
    .select("codigo")
    .not("codigo", "is", null);

  if (error) {
    throw new ErrorGuardarPersonalDesignaciones(
      "No se han podido consultar los códigos del personal.",
      500,
    );
  }

  const ocupados = new Set<number>();

  for (const fila of data ?? []) {
    const codigo = obtenerTexto(
      fila.codigo,
    );

    const coincidencia =
      REGEX_CODIGO.exec(codigo);

    if (!coincidencia) {
      continue;
    }

    const numero = Number(
      coincidencia[1],
    );

    if (
      Number.isSafeInteger(numero) &&
      numero >= 1
    ) {
      ocupados.add(numero);
    }
  }

  // Conservamos una secuencia creciente.
  // No reutilizamos códigos de personal inactivo.

  const ultimo = Math.max(
    0,
    ...ocupados,
  );

  if (ultimo >= MAXIMO_PERSONAL_CODIGO) {
    throw new ErrorGuardarPersonalDesignaciones(
      "Se ha alcanzado el límite de códigos de personal.",
      409,
    );
  }

  return formatearCodigo(
    ultimo + 1,
  );
}

// ======================================================
// CREAR PERSONAL
// ======================================================

async function crearPersonal(
  datos: DatosValidados,
): Promise<ResultadoGuardarPersonal> {
  const codigo =
    await generarSiguienteCodigo();

  const ahora =
    new Date().toISOString();

  const { data, error } = await supabaseServidor
    .from("designaciones_personal")
    .insert({
      codigo,

      nombre_completo:
        datos.nombreCompleto,

      habilitacion:
        datos.habilitacion,

      nivel_pista:
        datos.nivelPista,

      nivel_mesa:
        datos.nivelMesa,

      grupos:
        datos.grupos,

      activo:
        datos.activo,

      anotaciones:
        datos.anotaciones,

      created_at: ahora,
      updated_at: ahora,
    })
    .select(COLUMNAS_PERSONAL)
    .single();

  if (error || !data?.id) {
    console.error(
      "[DESIGNACIONES] Error creando personal:",
      {
        codigoError: error?.code,
        mensaje: error?.message,
      },
    );

    throw new ErrorGuardarPersonalDesignaciones(
      "No se ha podido registrar la persona.",
      500,
    );
  }

  return {
    personal:
      convertirPersonal(
        data as FilaPersonal,
      ),

    creado: true,
  };
}

// ======================================================
// EDITAR PERSONAL
// ======================================================

async function editarPersonal(
  datos: DatosValidados,
): Promise<ResultadoGuardarPersonal> {
  if (!datos.id) {
    throw new ErrorGuardarPersonalDesignaciones(
      "Falta el identificador de la persona.",
    );
  }

  const existente =
    await obtenerPersonaExistente(
      datos.id,
    );

  // El código CBA-xxx es permanente.
  // No se envía dentro del UPDATE.

  if (!existente.codigo) {
    throw new ErrorGuardarPersonalDesignaciones(
      "La persona no tiene un código CBA asignado. Revisa sus datos antes de editarla.",
      409,
    );
  }

  const { data, error } = await supabaseServidor
    .from("designaciones_personal")
    .update({
      nombre_completo:
        datos.nombreCompleto,

      habilitacion:
        datos.habilitacion,

      nivel_pista:
        datos.nivelPista,

      nivel_mesa:
        datos.nivelMesa,

      grupos:
        datos.grupos,

      activo:
        datos.activo,

      anotaciones:
        datos.anotaciones,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", datos.id)
    .select(COLUMNAS_PERSONAL)
    .maybeSingle();

  if (error) {
    console.error(
      "[DESIGNACIONES] Error editando personal:",
      {
        personaId: datos.id,
        codigoError: error.code,
        mensaje: error.message,
      },
    );

    throw new ErrorGuardarPersonalDesignaciones(
      "No se han podido guardar los cambios de la persona.",
      500,
    );
  }

  if (!data?.id) {
    throw new ErrorGuardarPersonalDesignaciones(
      "No se ha podido actualizar la persona. Comprueba que continúa existiendo.",
      409,
    );
  }

  return {
    personal:
      convertirPersonal(
        data as FilaPersonal,
      ),

    creado: false,
  };
}

// ======================================================
// SERVICIO PRINCIPAL
// ======================================================

export async function guardarPersonalDesignaciones(
  contenido: unknown,
): Promise<ResultadoGuardarPersonal> {
  const datos =
    validarDatosPersonalDesignaciones(
      contenido,
    );

  if (datos.id) {
    return editarPersonal(
      datos,
    );
  }

  return crearPersonal(
    datos,
  );
}
