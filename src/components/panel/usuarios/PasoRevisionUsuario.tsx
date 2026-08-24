import { useMemo } from "react";

import type { EquipoDisponiblePanel, EstadoCreacionUsuario, PasoCreacionUsuario, PermisoDisponiblePanel } from "@tipos/PanelUsuario";

interface Propiedades {
  estado: EstadoCreacionUsuario;
  permisosDisponibles: PermisoDisponiblePanel[];
  equiposDisponibles: EquipoDisponiblePanel[];
  alEditar: (paso: PasoCreacionUsuario) => void;
}

const nombresNivelAcceso = {
  panel: "Acceso al panel",
  "todos-equipos": "Acceso a todos los equipos",
  "acceso-total": "Acceso total",
};

function formatearFecha(fecha: string | null): string {
  if (!fecha) {
    return "Sin caducidad";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(new Date(`${fecha}T12:00:00`));
}

function BotonEditar({ paso, alEditar }: { paso: PasoCreacionUsuario; alEditar: (paso: PasoCreacionUsuario) => void }) {
  return (
    <button type="button" onClick={() => alEditar(paso)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary-fixed hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`Editar paso ${paso}`}>
      <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/editar.svg')", WebkitMaskImage: "url('/iconos/panel/editar.svg')" }} aria-hidden="true" />
    </button>
  );
}

export default function PasoRevisionUsuario({ estado, permisosDisponibles, equiposDisponibles, alEditar }: Propiedades) {
  const nombreCompleto = [estado.datosPersonales.nombre, estado.datosPersonales.apellidos].filter(Boolean).join(" ").trim();
  const accesoTodosLosEquipos = estado.configuracionPermisos.nivelAcceso === "todos-equipos" || estado.configuracionPermisos.nivelAcceso === "acceso-total";

  const permisosSeleccionados = useMemo(() => {
    if (estado.configuracionPermisos.nivelAcceso === "acceso-total") {
      return permisosDisponibles.filter((permiso) => permiso.activo);
    }

    return permisosDisponibles.filter((permiso) => estado.configuracionPermisos.permisosSeleccionados.includes(permiso.id));
  }, [estado.configuracionPermisos.nivelAcceso, estado.configuracionPermisos.permisosSeleccionados, permisosDisponibles]);

  const equiposAsignados = useMemo(() => {
    return estado.equiposAsignados
      .map((asignacion) => {
        const equipo = equiposDisponibles.find((equipoDisponible) => equipoDisponible.id === asignacion.equipoId);

        if (!equipo) {
          return null;
        }

        return {
          ...asignacion,
          equipo,
        };
      })
      .filter((asignacion): asignacion is NonNullable<typeof asignacion> => asignacion !== null)
      .sort((primeraAsignacion, segundaAsignacion) => {
        if (primeraAsignacion.principal !== segundaAsignacion.principal) {
          return primeraAsignacion.principal ? -1 : 1;
        }

        const primerNombre = primeraAsignacion.equipo.nombre ?? primeraAsignacion.equipo.nombreCorto ?? "";
        const segundoNombre = segundaAsignacion.equipo.nombre ?? segundaAsignacion.equipo.nombreCorto ?? "";

        return primerNombre.localeCompare(segundoNombre, "es");
      });
  }, [estado.equiposAsignados, equiposDisponibles]);

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Paso 4 de 4</p>
        <h2 className="mt-1 text-xl font-bold text-on-surface">Revisión final</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Comprueba que toda la información sea correcta antes de crear el usuario y generar su invitación.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-3 lg:p-8">
        <article className="overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low px-4 py-3">
            <div className="flex items-center gap-2 text-primary">
              <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/usuario.svg')", WebkitMaskImage: "url('/iconos/panel/usuario.svg')" }} aria-hidden="true" />
              <h3 className="font-bold text-on-surface">Datos personales</h3>
            </div>

            <BotonEditar paso={1} alEditar={alEditar} />
          </div>

          <div className="p-4">
            <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-sm font-bold uppercase text-on-primary-container">
                {estado.datosPersonales.nombre.charAt(0)}
                {estado.datosPersonales.apellidos.charAt(0)}
              </span>

              <div className="min-w-0">
                <p className="truncate font-bold text-on-surface">{nombreCompleto || "Nombre pendiente"}</p>
                <p className="mt-0.5 truncate text-sm text-on-surface-variant">{estado.datosPersonales.email}</p>
              </div>
            </div>

            <dl className="mt-4 flex flex-col gap-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Tipo de usuario</dt>
                <dd className="mt-1 text-sm font-semibold capitalize text-on-surface">{estado.datosPersonales.tipoUsuario}</dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Cargo o función</dt>
                <dd className="mt-1 text-sm font-semibold text-on-surface">{estado.datosPersonales.cargo || "No indicado"}</dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Teléfono</dt>
                <dd className="mt-1 text-sm font-semibold text-on-surface">{estado.datosPersonales.telefono || "No indicado"}</dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low px-4 py-3">
            <div className="flex items-center gap-2 text-primary">
              <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/seguridad.svg')", WebkitMaskImage: "url('/iconos/panel/seguridad.svg')" }} aria-hidden="true" />
              <h3 className="font-bold text-on-surface">Acceso y permisos</h3>
            </div>

            <BotonEditar paso={2} alEditar={alEditar} />
          </div>

          <div className="p-4">
            <div className="rounded-lg bg-primary-fixed/50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-on-primary-fixed-variant">Nivel de acceso</p>
              <p className="mt-1 font-bold text-on-primary-container">{nombresNivelAcceso[estado.configuracionPermisos.nivelAcceso]}</p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Permisos concedidos</p>

              {estado.configuracionPermisos.nivelAcceso === "acceso-total" ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/30 bg-success-container p-3">
                  <span className="inline-block h-5 w-5 shrink-0 bg-success mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
                  <p className="text-sm font-semibold text-on-success-container">Todos los permisos actuales y futuros.</p>
                </div>
              ) : permisosSeleccionados.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {permisosSeleccionados.map((permiso) => (
                    <li key={permiso.id} className="flex items-start gap-2 text-sm text-on-surface">
                      <span className="mt-0.5 inline-block h-4 w-4 shrink-0 bg-success mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
                      <span>{permiso.nombre}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">No se han concedido permisos detallados.</p>
              )}
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low px-4 py-3">
            <div className="flex items-center gap-2 text-primary">
              <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/equipos.svg')", WebkitMaskImage: "url('/iconos/panel/equipos.svg')" }} aria-hidden="true" />
              <h3 className="font-bold text-on-surface">Equipos asignados</h3>
            </div>

            <BotonEditar paso={3} alEditar={alEditar} />
          </div>

          <div className="p-4">
            {accesoTodosLosEquipos ? (
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary-fixed/40 p-3">
                <span className="inline-block h-5 w-5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/equipos.svg')", WebkitMaskImage: "url('/iconos/panel/equipos.svg')" }} aria-hidden="true" />
                <p className="text-sm font-semibold text-on-primary-fixed-variant">Tendrá acceso a todos los equipos actuales y futuros.</p>
              </div>
            ) : equiposAsignados.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {equiposAsignados.map((asignacion) => {
                  const nombreEquipo = asignacion.equipo.nombre ?? asignacion.equipo.nombreCorto ?? "Equipo";
                  const informacion = [asignacion.equipo.categoria, asignacion.equipo.genero, asignacion.equipo.nivel].filter(Boolean).join(" · ");

                  return (
                    <li key={asignacion.equipoId} className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface">{nombreEquipo}</p>
                          {informacion && <p className="mt-0.5 text-xs text-on-surface-variant">{informacion}</p>}
                        </div>

                        {asignacion.principal && <span className="shrink-0 rounded-full bg-tertiary-fixed px-2 py-1 text-[10px] font-bold uppercase text-on-tertiary-fixed">Principal</span>}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/calendario.svg')", WebkitMaskImage: "url('/iconos/panel/calendario.svg')" }} aria-hidden="true" />
                        <span>{formatearFecha(asignacion.fechaCaducidad)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-on-surface-variant">No se han asignado equipos específicos.</p>
            )}
          </div>
        </article>
      </div>

      <div className="border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <span className="inline-block h-5 w-5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/informacion.svg')", WebkitMaskImage: "url('/iconos/panel/informacion.svg')" }} aria-hidden="true" />
          <p className="text-sm text-on-surface-variant">Al crear el usuario se generará una invitación para que pueda establecer su propia contraseña. No se creará ninguna contraseña desde este panel.</p>
        </div>
      </div>
    </section>
  );
}