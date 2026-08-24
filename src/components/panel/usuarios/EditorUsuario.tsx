import { useState } from "react";

import type { EquipoUsuarioDetalle, UsuarioDetallePanel } from "@tipos/UsuarioDetallePanel";
import DatosUsuario, { type DatosUsuarioGuardados } from "@components/panel/usuarios/editor/DatosUsuario";
import AccesoUsuario, { type AccesoUsuarioGuardado } from "@components/panel/usuarios/editor/AccesoUsuario";
import SeguridadUsuario from "@components/panel/usuarios/editor/SeguridadUsuario";
import EquiposUsuario from "@components/panel/usuarios/editor/EquiposUsuario";



interface Propiedades {
  usuarioInicial: UsuarioDetallePanel;
}

type SeccionEditor = "datos" | "acceso" | "equipos" | "seguridad";

interface SeccionDisponible {
  id: SeccionEditor;
  nombre: string;
  nombreCorto: string;
  icono: string;
}

const secciones: SeccionDisponible[] = [
  {
    id: "datos",
    nombre: "Datos personales",
    nombreCorto: "Datos",
    icono: "usuario",
  },
  {
    id: "acceso",
    nombre: "Acceso y permisos",
    nombreCorto: "Permisos",
    icono: "seguridad",
  },
  {
    id: "equipos",
    nombre: "Equipos asignados",
    nombreCorto: "Equipos",
    icono: "equipos",
  },
  {
    id: "seguridad",
    nombre: "Seguridad y sesiones",
    nombreCorto: "Seguridad",
    icono: "seguridad",
  },
];

const etiquetasEstado = {
  activo: "Activo",
  pendiente: "Pendiente",
  bloqueado: "Bloqueado",
  desactivado: "Desactivado",
};

const clasesEstado = {
  activo: "bg-success-container text-on-success-container",
  pendiente: "bg-tertiary-fixed text-on-tertiary-fixed",
  bloqueado: "bg-error-container text-on-error-container",
  desactivado: "bg-surface-container-high text-on-surface-variant",
};

function obtenerIniciales(usuario: UsuarioDetallePanel): string {
  const nombre = usuario.datosPersonales.nombre.trim().charAt(0).toUpperCase();
  const apellido = usuario.datosPersonales.apellidos.trim().charAt(0).toUpperCase();

  return `${nombre}${apellido}` || "CB";
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) {
    return "Nunca";
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return "Sin información";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(fechaConvertida);
}

export default function EditorUsuario({ usuarioInicial }: Propiedades) {
  const [usuario, setUsuario] = useState(usuarioInicial);
  const [seccionActual, setSeccionActual] = useState<SeccionEditor>("datos");

  const nombreCompleto = [usuario.datosPersonales.nombre, usuario.datosPersonales.apellidos].filter(Boolean).join(" ").trim();

  const actualizarDatosUsuario = (datos: DatosUsuarioGuardados) => {
  setUsuario((usuarioActual) => ({
    ...usuarioActual,
    datosPersonales: {
      ...usuarioActual.datosPersonales,
      ...datos,
    },
  }));
};

const actualizarAccesoUsuario = (acceso: AccesoUsuarioGuardado) => {
  setUsuario((usuarioActual) => ({
    ...usuarioActual,
    acceso: {
      ...usuarioActual.acceso,
      ...acceso,
    },
  }));
};

const actualizarEquiposUsuario = (equiposAsignados: EquipoUsuarioDetalle[]) => {
  setUsuario((usuarioActual) => ({
    ...usuarioActual,
    equiposAsignados,
  }));
};

const actualizarSeguridadUsuario = (estado: UsuarioDetallePanel["datosPersonales"]["estado"], sesionesCerradas: number) => {
  setUsuario((usuarioActual) => ({
    ...usuarioActual,
    datosPersonales: {
      ...usuarioActual.datosPersonales,
      estado,
    },
    seguridad: {
      ...usuarioActual.seguridad,
      sesionesActivas: sesionesCerradas > 0 ? 0 : usuarioActual.seguridad.sesionesActivas,
    },
  }));
};

  return (
    <section className="w-full">
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-max overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm xl:sticky xl:top-28">
          <div className="bg-primary px-5 py-6 text-on-primary">
            <div className="flex items-center gap-4">
              {usuario.datosPersonales.imagen ? (
                <img src={usuario.datosPersonales.imagen} alt="" className="h-16 w-16 shrink-0 rounded-full border-2 border-on-primary/30 object-cover" />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-on-primary/30 bg-on-primary/10 text-lg font-bold">{obtenerIniciales(usuario)}</span>
              )}

              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{nombreCompleto}</h2>
                <p className="mt-1 truncate text-sm text-on-primary/75">{usuario.datosPersonales.email}</p>
              </div>
            </div>

            <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${clasesEstado[usuario.datosPersonales.estado]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {etiquetasEstado[usuario.datosPersonales.estado]}
            </span>
          </div>

          <nav className="flex gap-2 overflow-x-auto p-3 xl:flex-col" aria-label="Secciones del usuario">
            {secciones.map((seccion) => {
              const estaSeleccionada = seccionActual === seccion.id;

              return (
                <button key={seccion.id} type="button" onClick={() => setSeccionActual(seccion.id)} className={`flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors xl:w-full ${estaSeleccionada ? "bg-primary-fixed text-on-primary-fixed" : "text-on-surface-variant hover:bg-surface-container hover:text-primary"}`} aria-current={estaSeleccionada ? "page" : undefined}>
                  <span className="inline-block h-5 w-5 shrink-0 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${seccion.icono}.svg')`, WebkitMaskImage: `url('/iconos/panel/${seccion.icono}.svg')` }} aria-hidden="true" />
                  <span className="hidden xl:inline">{seccion.nombre}</span>
                  <span className="xl:hidden">{seccion.nombreCorto}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-outline-variant/60 bg-surface-container-low p-4">
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Creado</dt>
                <dd className="mt-1 text-on-surface">{formatearFecha(usuario.administracion.createdAt)}</dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Creado por</dt>
                <dd className="mt-1 text-on-surface">{usuario.administracion.creadoPor?.nombreCompleto ?? "Usuario inicial"}</dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Último acceso</dt>
                <dd className="mt-1 text-on-surface">{formatearFecha(usuario.administracion.ultimoAccesoAt)}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="min-w-0">
          {seccionActual === "datos" && (
                <DatosUsuario usuarioId={usuario.id} datosIniciales={usuario.datosPersonales} alActualizar={actualizarDatosUsuario} />
           )}

          {seccionActual === "acceso" && (
            <AccesoUsuario usuarioId={usuario.id} accesoInicial={usuario.acceso} alActualizar={actualizarAccesoUsuario} />
            )}

          {seccionActual === "equipos" && (
            <EquiposUsuario
                usuarioId={usuario.id}
                accesoTodosEquipos={usuario.acceso.accesoTodosEquipos}
                equiposIniciales={usuario.equiposAsignados}
                alActualizar={actualizarEquiposUsuario}
                alIrAPermisos={() => setSeccionActual("acceso")}
            />
            )}

          {seccionActual === "seguridad" && (
            <SeguridadUsuario
                usuarioId={usuario.id}
                estadoInicial={usuario.datosPersonales.estado}
                sesionesActivasIniciales={usuario.seguridad.sesionesActivas}
                tienePassword={usuario.seguridad.tienePassword}
                emailVerificadoAt={usuario.seguridad.emailVerificadoAt}
                passwordChangedAt={usuario.seguridad.passwordChangedAt}
                ultimoAccesoAt={usuario.administracion.ultimoAccesoAt}
                alActualizarEstado={actualizarSeguridadUsuario}
            />
            )}
        </div>
      </div>
    </section>
  );
}