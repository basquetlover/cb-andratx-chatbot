export type TipoUsuarioNuevo = "interno" | "publico";
export type NivelAccesoNuevo = "panel" | "todos-equipos" | "acceso-total";

export interface DatosPersonalesNuevoUsuario {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  tipoUsuario: TipoUsuarioNuevo;
  cargo: string;
}

export interface ConfiguracionPermisosNuevoUsuario {
  nivelAcceso: NivelAccesoNuevo;
  permisosSeleccionados: string[];
}

export interface EquipoAsignadoNuevoUsuario {
  equipoId: string;
  principal: boolean;
  fechaCaducidad: string | null;
}

export interface SolicitudCrearUsuario {
  datosPersonales: DatosPersonalesNuevoUsuario;
  configuracionPermisos: ConfiguracionPermisosNuevoUsuario;
  equiposAsignados: EquipoAsignadoNuevoUsuario[];
}

export interface ErrorValidacionUsuario {
  campo: string;
  mensaje: string;
}

export type ResultadoValidacionUsuario =
  | {
      ok: true;
      data: SolicitudCrearUsuario;
      errores: [];
    }
  | {
      ok: false;
      data: null;
      errores: ErrorValidacionUsuario[];
    };

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function obtenerTexto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function esUuidValido(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const fechaConvertida = new Date(`${fecha}T12:00:00Z`);

  return !Number.isNaN(fechaConvertida.getTime()) && fechaConvertida.toISOString().slice(0, 10) === fecha;
}

function eliminarDuplicados(valores: string[]): string[] {
  return Array.from(new Set(valores));
}

export function validarNuevoUsuario(contenido: unknown): ResultadoValidacionUsuario {
  const errores: ErrorValidacionUsuario[] = [];

  if (!esObjeto(contenido)) {
    return {
      ok: false,
      data: null,
      errores: [
        {
          campo: "solicitud",
          mensaje: "El contenido de la solicitud no es válido.",
        },
      ],
    };
  }

  const datosOriginales = esObjeto(contenido.datosPersonales) ? contenido.datosPersonales : {};
  const permisosOriginales = esObjeto(contenido.configuracionPermisos) ? contenido.configuracionPermisos : {};
  const equiposOriginales = Array.isArray(contenido.equiposAsignados) ? contenido.equiposAsignados : [];

  const nombre = obtenerTexto(datosOriginales.nombre);
  const apellidos = obtenerTexto(datosOriginales.apellidos);
  const email = obtenerTexto(datosOriginales.email).toLowerCase();
  const telefono = obtenerTexto(datosOriginales.telefono);
  const tipoUsuario = obtenerTexto(datosOriginales.tipoUsuario);
  const cargo = obtenerTexto(datosOriginales.cargo);
  const nivelAcceso = obtenerTexto(permisosOriginales.nivelAcceso);

  if (nombre.length < 2 || nombre.length > 80) {
    errores.push({
      campo: "datosPersonales.nombre",
      mensaje: "El nombre debe contener entre 2 y 80 caracteres.",
    });
  }

  if (apellidos.length < 2 || apellidos.length > 120) {
    errores.push({
      campo: "datosPersonales.apellidos",
      mensaje: "Los apellidos deben contener entre 2 y 120 caracteres.",
    });
  }

  if (!esEmailValido(email) || email.length > 254) {
    errores.push({
      campo: "datosPersonales.email",
      mensaje: "El correo electrónico no es válido.",
    });
  }

  if (telefono.length > 30) {
    errores.push({
      campo: "datosPersonales.telefono",
      mensaje: "El teléfono no puede superar los 30 caracteres.",
    });
  }

  if (tipoUsuario !== "interno" && tipoUsuario !== "publico") {
    errores.push({
      campo: "datosPersonales.tipoUsuario",
      mensaje: "El tipo de usuario no es válido.",
    });
  }

  if (tipoUsuario === "interno" && (cargo.length < 2 || cargo.length > 100)) {
    errores.push({
      campo: "datosPersonales.cargo",
      mensaje: "El cargo debe contener entre 2 y 100 caracteres.",
    });
  }

  if (nivelAcceso !== "panel" && nivelAcceso !== "todos-equipos" && nivelAcceso !== "acceso-total") {
    errores.push({
      campo: "configuracionPermisos.nivelAcceso",
      mensaje: "El nivel de acceso no es válido.",
    });
  }

  const permisosRecibidos = Array.isArray(permisosOriginales.permisosSeleccionados) ? permisosOriginales.permisosSeleccionados : [];

  const permisosSeleccionados = eliminarDuplicados(
    permisosRecibidos
      .filter((permiso): permiso is string => typeof permiso === "string")
      .map((permiso) => permiso.trim())
      .filter(Boolean),
  );

  if (permisosSeleccionados.length > 200) {
    errores.push({
      campo: "configuracionPermisos.permisosSeleccionados",
      mensaje: "Se han recibido demasiados permisos.",
    });
  }

  permisosSeleccionados.forEach((permisoId, indice) => {
    if (!esUuidValido(permisoId)) {
      errores.push({
        campo: `configuracionPermisos.permisosSeleccionados.${indice}`,
        mensaje: "El identificador del permiso no es válido.",
      });
    }
  });

  const equiposAsignados: EquipoAsignadoNuevoUsuario[] = [];
  const idsEquipos = new Set<string>();

  equiposOriginales.forEach((equipoOriginal, indice) => {
    if (!esObjeto(equipoOriginal)) {
      errores.push({
        campo: `equiposAsignados.${indice}`,
        mensaje: "La asignación del equipo no es válida.",
      });

      return;
    }

    const equipoId = obtenerTexto(equipoOriginal.equipoId);
    const principal = equipoOriginal.principal === true;
    const fechaCaducidadTexto = obtenerTexto(equipoOriginal.fechaCaducidad);
    const fechaCaducidad = fechaCaducidadTexto || null;

    if (!esUuidValido(equipoId)) {
      errores.push({
        campo: `equiposAsignados.${indice}.equipoId`,
        mensaje: "El identificador del equipo no es válido.",
      });

      return;
    }

    if (idsEquipos.has(equipoId)) {
      errores.push({
        campo: `equiposAsignados.${indice}.equipoId`,
        mensaje: "El mismo equipo no puede asignarse más de una vez.",
      });

      return;
    }

    if (fechaCaducidad && !esFechaValida(fechaCaducidad)) {
      errores.push({
        campo: `equiposAsignados.${indice}.fechaCaducidad`,
        mensaje: "La fecha de caducidad no es válida.",
      });
    }

    idsEquipos.add(equipoId);

    equiposAsignados.push({
      equipoId,
      principal,
      fechaCaducidad,
    });
  });

  if (equiposAsignados.length > 100) {
    errores.push({
      campo: "equiposAsignados",
      mensaje: "Se han recibido demasiados equipos.",
    });
  }

  const equiposPrincipales = equiposAsignados.filter((equipo) => equipo.principal);

  if (equiposPrincipales.length > 1) {
    errores.push({
      campo: "equiposAsignados",
      mensaje: "Solo puede existir un equipo principal.",
    });
  }

  const tieneAccesoGlobal = nivelAcceso === "todos-equipos" || nivelAcceso === "acceso-total";

  if (tieneAccesoGlobal && equiposAsignados.length > 0) {
    errores.push({
      campo: "equiposAsignados",
      mensaje: "Un usuario con acceso global no necesita equipos asignados.",
    });
  }

  if (errores.length > 0) {
    return {
      ok: false,
      data: null,
      errores,
    };
  }

  return {
    ok: true,
    data: {
      datosPersonales: {
        nombre,
        apellidos,
        email,
        telefono,
        tipoUsuario: tipoUsuario as TipoUsuarioNuevo,
        cargo: tipoUsuario === "interno" ? cargo : "",
      },
      configuracionPermisos: {
        nivelAcceso: nivelAcceso as NivelAccesoNuevo,
        permisosSeleccionados,
      },
      equiposAsignados,
    },
    errores: [],
  };
}