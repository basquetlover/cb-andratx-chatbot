import { supabaseServidor } from "../../supabase/servidor";

import type { DatosGeneralesEquipoDetalle } from "@tipos/EquipoDetallePanel";

export interface ErrorCampoEquipo {
  campo: string;
  mensaje: string;
}

export class ErrorActualizarEquipo extends Error {
  status: number;
  errores: ErrorCampoEquipo[];

  constructor(
    mensaje: string,
    status = 400,
    errores: ErrorCampoEquipo[] = [],
  ) {
    super(mensaje);

    this.name = "ErrorActualizarEquipo";
    this.status = status;
    this.errores = errores;
  }
}

interface DatosActualizacionValidados {
  nombre: string;
  nombreCorto: string | null;
  slug: string;
  categoria: string;
  genero: string;
  nivel: string | null;
  descripcion: string | null;
  activo: boolean;
}

interface FilaEquipo {
  id: string;
  temporada_id: string;
  nombre: string;
  nombre_corto: string | null;
  slug: string;
  categoria: string;
  genero: string;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;
  activo: boolean;
}

interface FilaTemporada {
  id: string;
  nombre: string;
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
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
): string | null {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto || null;
}

function validarDatos(
  datos: unknown,
): DatosActualizacionValidados {
  if (!esObjeto(datos)) {
    throw new ErrorActualizarEquipo(
      "Los datos enviados no son válidos.",
      400,
    );
  }

  const errores: ErrorCampoEquipo[] = [];

  const nombre = obtenerTexto(datos.nombre);

  const nombreCorto = obtenerTextoOpcional(
    datos.nombreCorto,
  );

  const slug = obtenerTexto(datos.slug)
    .toLowerCase();

  const categoria = obtenerTexto(datos.categoria);
  const genero = obtenerTexto(datos.genero);

  const nivel = obtenerTextoOpcional(datos.nivel);

  const descripcion = obtenerTextoOpcional(
    datos.descripcion,
  );

  if (!nombre) {
    errores.push({
      campo: "nombre",
      mensaje:
        "Introduce el nombre del equipo.",
    });
  } else if (nombre.length > 120) {
    errores.push({
      campo: "nombre",
      mensaje:
        "El nombre no puede superar los 120 caracteres.",
    });
  }

  if (
    nombreCorto &&
    nombreCorto.length > 60
  ) {
    errores.push({
      campo: "nombreCorto",
      mensaje:
        "El nombre corto no puede superar los 60 caracteres.",
    });
  }

  if (!slug) {
    errores.push({
      campo: "slug",
      mensaje: "Introduce un slug válido.",
    });
  } else if (slug.length > 120) {
    errores.push({
      campo: "slug",
      mensaje:
        "El slug no puede superar los 120 caracteres.",
    });
  } else if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    errores.push({
      campo: "slug",
      mensaje:
        "El slug solo puede contener letras minúsculas, números y guiones.",
    });
  }

  if (!categoria) {
    errores.push({
      campo: "categoria",
      mensaje: "Selecciona la categoría.",
    });
  } else if (categoria.length > 100) {
    errores.push({
      campo: "categoria",
      mensaje:
        "La categoría no puede superar los 100 caracteres.",
    });
  }

  if (!genero) {
    errores.push({
      campo: "genero",
      mensaje: "Selecciona el género.",
    });
  } else if (genero.length > 100) {
    errores.push({
      campo: "genero",
      mensaje:
        "El género no puede superar los 100 caracteres.",
    });
  }

  if (nivel && nivel.length > 100) {
    errores.push({
      campo: "nivel",
      mensaje:
        "El nivel no puede superar los 100 caracteres.",
    });
  }

  if (
    descripcion &&
    descripcion.length > 1500
  ) {
    errores.push({
      campo: "descripcion",
      mensaje:
        "La descripción no puede superar los 1500 caracteres.",
    });
  }

  if (typeof datos.activo !== "boolean") {
    errores.push({
      campo: "activo",
      mensaje:
        "El estado del equipo no es válido.",
    });
  }

  if (errores.length > 0) {
    throw new ErrorActualizarEquipo(
      "Revisa los campos indicados.",
      400,
      errores,
    );
  }

  return {
    nombre,
    nombreCorto,
    slug,
    categoria,
    genero,
    nivel,
    descripcion,
    activo: datos.activo as boolean,
  };
}

export async function actualizarDatosEquipo(
  equipoId: string,
  datos: unknown,
): Promise<DatosGeneralesEquipoDetalle> {
  const idNormalizado = equipoId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorActualizarEquipo(
      "El identificador del equipo no es válido.",
      400,
      [
        {
          campo: "equipoId",
          mensaje:
            "El identificador del equipo no es válido.",
        },
      ],
    );
  }

  const datosValidados = validarDatos(datos);

  const {
    data: equipoExistente,
    error: errorComprobacion,
  } = await supabaseServidor
    .from("equipos")
    .select("id, temporada_id")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorComprobacion) {
    throw new ErrorActualizarEquipo(
      `No se ha podido comprobar el equipo: ${errorComprobacion.message}`,
      500,
    );
  }

  if (!equipoExistente?.id) {
    throw new ErrorActualizarEquipo(
      "El equipo no existe.",
      404,
    );
  }

  const {
    data: equipoActualizado,
    error: errorActualizacion,
  } = await supabaseServidor
    .from("equipos")
    .update({
      nombre: datosValidados.nombre,
      nombre_corto: datosValidados.nombreCorto,
      slug: datosValidados.slug,
      categoria: datosValidados.categoria,
      genero: datosValidados.genero,
      nivel: datosValidados.nivel,
      descripcion: datosValidados.descripcion,
      activo: datosValidados.activo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idNormalizado)
    .select(
      `
        id,
        temporada_id,
        nombre,
        nombre_corto,
        slug,
        categoria,
        genero,
        nivel,
        descripcion,
        imagen,
        activo
      `,
    )
    .maybeSingle();

  if (errorActualizacion) {
    if (errorActualizacion.code === "23505") {
      throw new ErrorActualizarEquipo(
        "Ya existe otro equipo con ese slug.",
        409,
        [
          {
            campo: "slug",
            mensaje:
              "Ya existe otro equipo con ese slug.",
          },
        ],
      );
    }

    throw new ErrorActualizarEquipo(
      `No se han podido actualizar los datos del equipo: ${errorActualizacion.message}`,
      500,
    );
  }

  if (!equipoActualizado?.id) {
    throw new ErrorActualizarEquipo(
      "El equipo ya no está disponible.",
      404,
    );
  }

  const equipo =
    equipoActualizado as FilaEquipo;

  const {
    data: temporadaEncontrada,
    error: errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select("id, nombre")
    .eq("id", equipo.temporada_id)
    .maybeSingle();

  if (errorTemporada) {
    throw new ErrorActualizarEquipo(
      `Los datos se han actualizado, pero no se ha podido obtener la temporada: ${errorTemporada.message}`,
      500,
    );
  }

  if (!temporadaEncontrada?.id) {
    throw new ErrorActualizarEquipo(
      "Los datos se han actualizado, pero la temporada asociada no existe.",
      500,
    );
  }

  const temporada =
    temporadaEncontrada as FilaTemporada;

  return {
    temporada: {
      id: temporada.id,
      nombre: temporada.nombre,
    },
    nombre: equipo.nombre,
    nombreCorto: equipo.nombre_corto ?? "",
    slug: equipo.slug,
    categoria: equipo.categoria,
    genero: equipo.genero,
    nivel: equipo.nivel ?? "",
    descripcion: equipo.descripcion ?? "",
    imagen: equipo.imagen,
    activo: equipo.activo,
  };
}