import { useMemo } from "react";

import type { ConfiguracionPermisosUsuario, NivelAccesoUsuario, PermisoDisponiblePanel } from "@tipos/PanelUsuario";

interface Propiedades {
  configuracion: ConfiguracionPermisosUsuario;
  permisos: PermisoDisponiblePanel[];
  cargando: boolean;
  error: string | null;
  alCambiar: (configuracion: ConfiguracionPermisosUsuario) => void;
  alReintentar?: () => void;
}

interface NivelAcceso {
  id: NivelAccesoUsuario;
  nombre: string;
  descripcion: string;
  aviso?: string;
  icono: string;
}

const nivelesAcceso: NivelAcceso[] = [
  {
    id: "panel",
    nombre: "Acceso al panel",
    descripcion: "Acceso administrativo con permisos definidos individualmente.",
    icono: "panel",
  },
  {
    id: "todos-equipos",
    nombre: "Todos los equipos",
    descripcion: "Podrá gestionar información relacionada con cualquier equipo.",
    icono: "equipos",
  },
  {
    id: "acceso-total",
    nombre: "Acceso total",
    descripcion: "Dispondrá de todos los permisos actuales y futuros del panel.",
    aviso: "Utilízalo únicamente para personas de máxima confianza.",
    icono: "seguridad",
  },
];

const ordenAcciones = ["ver", "crear", "editar", "eliminar"];

function formatearTexto(texto: string): string {
  const textoFormateado = texto.replaceAll("_", " ").replaceAll("-", " ").trim();

  return textoFormateado.charAt(0).toUpperCase() + textoFormateado.slice(1);
}

export default function PasoPermisosUsuario({ configuracion, permisos, cargando, error, alCambiar, alReintentar }: Propiedades) {
  const permisosPorModulo = useMemo(() => {
    const grupos = new Map<string, PermisoDisponiblePanel[]>();

    permisos
      .filter((permiso) => permiso.activo)
      .forEach((permiso) => {
        const permisosModulo = grupos.get(permiso.modulo) ?? [];

        permisosModulo.push(permiso);
        grupos.set(permiso.modulo, permisosModulo);
      });

    return Array.from(grupos.entries())
      .map(([modulo, permisosModulo]) => ({
        modulo,
        permisos: permisosModulo.sort((primerPermiso, segundoPermiso) => {
          const primeraPosicion = ordenAcciones.indexOf(primerPermiso.accion);
          const segundaPosicion = ordenAcciones.indexOf(segundoPermiso.accion);

          return (primeraPosicion === -1 ? ordenAcciones.length : primeraPosicion) - (segundaPosicion === -1 ? ordenAcciones.length : segundaPosicion);
        }),
      }))
      .sort((primerGrupo, segundoGrupo) => primerGrupo.modulo.localeCompare(segundoGrupo.modulo, "es"));
  }, [permisos]);

  const accesoTotal = configuracion.nivelAcceso === "acceso-total";
  const idsPermisosActivos = permisos.filter((permiso) => permiso.activo).map((permiso) => permiso.id);
  const todosSeleccionados = idsPermisosActivos.length > 0 && idsPermisosActivos.every((permisoId) => configuracion.permisosSeleccionados.includes(permisoId));

  const seleccionarNivelAcceso = (nivelAcceso: NivelAccesoUsuario) => {
    alCambiar({
      ...configuracion,
      nivelAcceso,
    });
  };

  const alternarPermiso = (permisoId: string) => {
    if (accesoTotal) {
      return;
    }

    const estaSeleccionado = configuracion.permisosSeleccionados.includes(permisoId);

    alCambiar({
      ...configuracion,
      permisosSeleccionados: estaSeleccionado ? configuracion.permisosSeleccionados.filter((id) => id !== permisoId) : [...configuracion.permisosSeleccionados, permisoId],
    });
  };

  const alternarTodosLosPermisos = () => {
    if (accesoTotal) {
      return;
    }

    alCambiar({
      ...configuracion,
      permisosSeleccionados: todosSeleccionados ? [] : idsPermisosActivos,
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Paso 2 de 4</p>
        <h2 className="mt-1 text-xl font-bold text-on-surface">Acceso y permisos</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Define qué partes del panel podrá consultar o modificar este usuario.</p>
      </div>

      <div className="p-5 sm:p-6 lg:p-8">
        <fieldset>
          <legend className="text-base font-bold text-on-surface">Nivel de acceso general</legend>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {nivelesAcceso.map((nivel) => {
              const seleccionado = configuracion.nivelAcceso === nivel.id;

              return (
                <label key={nivel.id} className={`relative flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-colors ${seleccionado ? "border-primary bg-primary-fixed/50" : "border-outline-variant/70 bg-surface-container-lowest hover:border-primary/60 hover:bg-surface-container-low"}`}>
                  <input type="radio" name="nivel-acceso" value={nivel.id} checked={seleccionado} onChange={() => seleccionarNivelAcceso(nivel.id)} className="sr-only" />

                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${seleccionado ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                    <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${nivel.icono}.svg')`, WebkitMaskImage: `url('/iconos/panel/${nivel.icono}.svg')` }} aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={`font-bold ${seleccionado ? "text-on-primary-container" : "text-on-surface"}`}>{nivel.nombre}</span>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${seleccionado ? "border-primary" : "border-outline-variant"}`}>
                        {seleccionado && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </span>
                    </span>

                    <span className="mt-1 block text-sm leading-snug text-on-surface-variant">{nivel.descripcion}</span>

                    {nivel.aviso && <span className="mt-2 block text-xs font-semibold text-tertiary">{nivel.aviso}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="my-7 h-px bg-outline-variant/60" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-on-surface">Permisos detallados</h3>
            <p className="mt-0.5 text-sm text-on-surface-variant">{accesoTotal ? "El acceso total incluye automáticamente todos los permisos." : "Selecciona las acciones concretas que podrá realizar."}</p>
          </div>

          {!cargando && !error && permisos.length > 0 && (
            <button type="button" onClick={alternarTodosLosPermisos} disabled={accesoTotal} className="w-max text-sm font-bold text-primary transition-colors hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-40">
              {todosSeleccionados || accesoTotal ? "Quitar selección" : "Seleccionar todos"}
            </button>
          )}
        </div>

        {cargando && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant">Cargando permisos disponibles...</p>
          </div>
        )}

        {!cargando && error && (
          <div className="mt-5 rounded-xl border border-error/40 bg-error-container p-4" role="alert">
            <p className="font-bold text-on-error-container">No se han podido cargar los permisos</p>
            <p className="mt-1 text-sm text-on-error-container">{error}</p>

            {alReintentar && (
              <button type="button" onClick={alReintentar} className="mt-3 rounded-lg border border-error px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error hover:text-on-error">
                Volver a intentarlo
              </button>
            )}
          </div>
        )}

        {!cargando && !error && permisosPorModulo.length === 0 && (
          <div className="mt-5 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
            <p className="text-sm text-on-surface-variant">No hay permisos configurados en este momento.</p>
          </div>
        )}

        {!cargando && !error && permisosPorModulo.length > 0 && (
          <div className={`mt-5 overflow-hidden rounded-xl border border-outline-variant/70 ${accesoTotal ? "opacity-70" : ""}`}>
            <div className="hidden grid-cols-[minmax(180px,1fr)_repeat(4,90px)] items-center bg-on-primary-container px-4 py-3 text-xs font-bold uppercase tracking-wide text-on-primary lg:grid">
              <span>Módulo</span>
              {ordenAcciones.map((accion) => (
                <span key={accion} className="text-center">{formatearTexto(accion)}</span>
              ))}
            </div>

            <div className="divide-y divide-outline-variant/60">
              {permisosPorModulo.map((grupo) => (
                <div key={grupo.modulo} className="bg-surface-container-lowest p-2  lg:grid lg:grid-cols-[minmax(180px,1fr)_repeat(4,90px)] lg:items-center">
                  <div className="mb-3 flex items-center gap-2 lg:mb-0">
                    <span className="inline-block h-5 w-5 bg-primary mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${grupo.modulo}.svg')`, WebkitMaskImage: `url('/iconos/panel/${grupo.modulo}.svg')` }} aria-hidden="true" />
                    <span className="font-semibold text-on-surface">{formatearTexto(grupo.modulo)}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 lg:contents">
                    {ordenAcciones.map((accion) => {
                      const permiso = grupo.permisos.find((permisoModulo) => permisoModulo.accion === accion);

                      if (!permiso) {
                        return <span key={accion} className="flex min-h-12 items-center justify-center rounded-lg bg-surface-container-low text-outline lg:min-h-0 lg:bg-transparent">—</span>;
                      }

                      const seleccionado = accesoTotal || configuracion.permisosSeleccionados.includes(permiso.id);

                      return (
                        <label key={permiso.id} className={`flex min-h-12 cursor-pointer p-4 flex-col items-center justify-center gap-1 rounded-lg transition-colors lg:min-h-0 lg:bg-transparent ${seleccionado ? "bg-primary-fixed/50" : "bg-surface-container-low hover:bg-primary-fixed/30"} ${accesoTotal ? "cursor-not-allowed" : ""}`}>
                          <span className="text-[10px] font-semibold text-on-surface-variant lg:hidden">{formatearTexto(accion)}</span>
                          <input type="checkbox" checked={seleccionado} onChange={() => alternarPermiso(permiso.id)} disabled={accesoTotal} className="h-4 w-4 rounded border-outline-variant accent-primary" aria-label={`${formatearTexto(accion)} ${formatearTexto(grupo.modulo)}`} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {configuracion.nivelAcceso === "todos-equipos" && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-fixed/40 p-4">
            <span className="inline-block h-5 w-5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/informacion.svg')", WebkitMaskImage: "url('/iconos/panel/informacion.svg')" }} aria-hidden="true" />
            <p className="text-sm text-on-primary-fixed-variant">No será necesario asignar equipos individualmente. El usuario tendrá acceso a todos los equipos actuales y a los que se creen posteriormente.</p>
          </div>
        )}
      </div>
    </section>
  );
}