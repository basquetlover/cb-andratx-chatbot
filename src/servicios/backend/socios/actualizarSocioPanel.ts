import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  obtenerSocioPanel,
} from "./obtenerSocioPanel";

import {
  validarActualizacionSocio,
} from "./validarDatosSocio";

import type {
  ErrorCampoSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

export class ErrorActualizarSocioPanel
  extends Error {
  status: number;
  errores: ErrorCampoSocio[];

  constructor(
    mensaje: string,
    status: number,
    errores:
      ErrorCampoSocio[] = [],
  ) {
    super(mensaje);

    this.name =
      "ErrorActualizarSocioPanel";

    this.status = status;
    this.errores = errores;
  }
}

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

async function comprobarSocioExiste(
  socioId: string,
): Promise<void> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("socios")
      .select("id")
      .eq(
        "id",
        socioId,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorActualizarSocioPanel(
      `No se ha podido comprobar el socio: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorActualizarSocioPanel(
      "El socio solicitado no existe.",
      404,
    );
  }
}

async function comprobarEmailDisponible(
  socioId: string,
  email: string,
): Promise<void> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("socios")
      .select("id")
      .ilike(
        "email",
        email,
      )
      .neq(
        "id",
        socioId,
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorActualizarSocioPanel(
      `No se ha podido comprobar el correo electrónico: ${error.message}`,
      500,
    );
  }

  if (data) {
    throw new ErrorActualizarSocioPanel(
      "Ya existe otro socio con ese correo electrónico.",
      409,
      [
        {
          campo: "email",
          mensaje:
            "Este correo electrónico ya está siendo utilizado por otro socio.",
        },
      ],
    );
  }
}

export async function actualizarSocioPanel(
  socioId: string,
  contenido: unknown,
  usuarioId: string,
): Promise<SocioPanel> {
  const idSocio =
    socioId.trim();

  const idUsuario =
    usuarioId.trim();

  if (
    !idSocio ||
    !esUuidValido(
      idSocio,
    )
  ) {
    throw new ErrorActualizarSocioPanel(
      "El identificador del socio no es válido.",
      400,
    );
  }

  if (
    !idUsuario ||
    !esUuidValido(
      idUsuario,
    )
  ) {
    throw new ErrorActualizarSocioPanel(
      "No se ha podido identificar al usuario que modifica el socio.",
      400,
    );
  }

  const validacion =
    validarActualizacionSocio(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorActualizarSocioPanel(
      "Revisa los datos del formulario.",
      400,
      validacion.errores,
    );
  }

  const datos =
    validacion.datos;

  await comprobarSocioExiste(
    idSocio,
  );

  await comprobarEmailDisponible(
    idSocio,
    datos.email,
  );

  const ahora =
    new Date().toISOString();

  const {
    data: socioActualizado,
    error,
  } =
    await supabaseServidor
      .from("socios")
      .update({
        nombre:
          datos.nombre,

        apellidos:
          datos.apellidos,

        email:
          datos.email,

        telefono:
          datos.telefono,

        observaciones:
          datos.observaciones,

        activo:
          datos.activo,

        actualizado_por:
          idUsuario,

        updated_at:
          ahora,
      })
      .eq(
        "id",
        idSocio,
      )
      .select("id")
      .maybeSingle();

  if (error) {
    if (
      error.code ===
      "23505"
    ) {
      throw new ErrorActualizarSocioPanel(
        "Ya existe otro socio con ese correo electrónico.",
        409,
        [
          {
            campo: "email",
            mensaje:
              "Este correo electrónico ya está siendo utilizado por otro socio.",
          },
        ],
      );
    }

    throw new ErrorActualizarSocioPanel(
      `No se ha podido actualizar el socio: ${error.message}`,
      500,
    );
  }

  if (!socioActualizado) {
    throw new ErrorActualizarSocioPanel(
      "El socio solicitado no existe.",
      404,
    );
  }

  return obtenerSocioPanel(
    idSocio,
  );
}