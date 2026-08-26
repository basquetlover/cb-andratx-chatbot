import { supabaseServidor } from "../../supabase/servidor";

import type { IntegracionesEquipoDetalle } from "@tipos/EquipoDetallePanel";

export interface ErrorCampoIntegracionesEquipo {
  campo: string;
  mensaje: string;
}

export class ErrorActualizarIntegracionesEquipo extends Error {
  status: number;
  errores: ErrorCampoIntegracionesEquipo[];

  constructor(
    mensaje: string,
    status = 400,
    errores: ErrorCampoIntegracionesEquipo[] = [],
  ) {
    super(mensaje);

    this.name = "ErrorActualizarIntegracionesEquipo";
    this.status = status;
    this.errores = errores;
  }
}

interface DatosIntegracionesValidados {
  chatbot: boolean;
  idEquipoFbib: string | null;
}

interface FilaIntegracionesEquipo {
  id: string;
  chatbot: boolean | null;
  id_equipo_fbib: string | null;
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

function validarDatos(
  datos: unknown,
): DatosIntegracionesValidados {
  if (!esObjeto(datos)) {
    throw new ErrorActualizarIntegracionesEquipo(
      "Los datos enviados no son válidos.",
      400,
    );
  }

  const errores: ErrorCampoIntegracionesEquipo[] = [];

  let chatbot = false;

  if (typeof datos.chatbot !== "boolean") {
    errores.push({
      campo: "chatbot",
      mensaje:
        "El estado del asistente virtual no es válido.",
    });
  } else {
    chatbot = datos.chatbot;
  }

  let idEquipoFbib: string | null = null;

  if (
    datos.idEquipoFbib !== null &&
    datos.idEquipoFbib !== undefined
  ) {
    if (typeof datos.idEquipoFbib !== "string") {
      errores.push({
        campo: "idEquipoFbib",
        mensaje:
          "El identificador FBIB no es válido.",
      });
    } else {
      const identificador =
        datos.idEquipoFbib.trim();

      idEquipoFbib = identificador || null;

      if (
        idEquipoFbib &&
        idEquipoFbib.length > 100
      ) {
        errores.push({
          campo: "idEquipoFbib",
          mensaje:
            "El identificador FBIB no puede superar los 100 caracteres.",
        });
      }
    }
  }

  if (errores.length > 0) {
    throw new ErrorActualizarIntegracionesEquipo(
      "Revisa los campos indicados.",
      400,
      errores,
    );
  }

  return {
    chatbot,
    idEquipoFbib,
  };
}

export async function actualizarIntegracionesEquipo(
  equipoId: string,
  datos: unknown,
): Promise<IntegracionesEquipoDetalle> {
  const idNormalizado = equipoId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorActualizarIntegracionesEquipo(
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
    .select("id")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorComprobacion) {
    throw new ErrorActualizarIntegracionesEquipo(
      `No se ha podido comprobar el equipo: ${errorComprobacion.message}`,
      500,
    );
  }

  if (!equipoExistente?.id) {
    throw new ErrorActualizarIntegracionesEquipo(
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
      chatbot: datosValidados.chatbot,
      id_equipo_fbib:
        datosValidados.idEquipoFbib,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idNormalizado)
    .select(
      `
        id,
        chatbot,
        id_equipo_fbib
      `,
    )
    .maybeSingle();

  if (errorActualizacion) {
    throw new ErrorActualizarIntegracionesEquipo(
      `No se han podido actualizar las integraciones del equipo: ${errorActualizacion.message}`,
      500,
    );
  }

  if (!equipoActualizado?.id) {
    throw new ErrorActualizarIntegracionesEquipo(
      "El equipo ya no está disponible.",
      404,
    );
  }

  const equipo =
    equipoActualizado as FilaIntegracionesEquipo;

  return {
    chatbot: Boolean(equipo.chatbot),
    idEquipoFbib:
      equipo.id_equipo_fbib ?? "",
  };
}