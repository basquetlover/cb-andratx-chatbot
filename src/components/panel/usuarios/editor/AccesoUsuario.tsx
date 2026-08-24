import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { PermisoDisponiblePanel } from "@tipos/PanelUsuario";
import type { NivelAccesoUsuarioPanel, UsuarioDetallePanel } from "../../../../types/UsuarioDetallePanel";

export interface AccesoUsuarioGuardado {
  nivelAcceso: NivelAccesoUsuarioPanel;
  accesoPanel: boolean;
  accesoTotal: boolean;
  accesoTodosEquipos: boolean;
  permisosSeleccionados: string[];
  version: number;
}

interface Propiedades {
  usuarioId: string;
  accesoInicial: UsuarioDetallePanel["acceso"];
  alActualizar: (acceso: AccesoUsuarioGuardado) => void;
}

interface NivelAcceso {
  id: NivelAccesoUsuarioPanel;
  nombre: string;
  descripcion: string;
  aviso?: string;
  icono: string;
}

interface RespuestaPermisosApi {
  ok: boolean;
  data: PermisoDisponiblePanel[];
  total: number;
  error?: string;
}

interface RespuestaActualizacion {
  ok: boolean;
  data: {
    acceso: AccesoUsuarioGuardado;
  } | null;
  error: string | null;
}

const nivelesAcceso: NivelAcceso[] = [
  {
    id: "panel",
    nombre: "Acceso al panel",
    descripcion: "Solo tendrá los permisos seleccionados individualmente.",
    icono: "panel",
  },
  {
    id: "todos-equipos",
    nombre: "Todos los equipos",
    descripcion: "Podrá trabajar con cualquier equipo actual o futuro.",
    icono: "equipos",
  },
  {
    id: "acceso-total",
    nombre: "Acceso total",
    descripcion: "Dispondrá de todos los permisos actuales y futuros.",
    aviso: "Utilízalo únicamente con personas de máxima confianza.",
    icono: "seguridad",
  },
];

const ordenAcciones = ["ver", "crear", "editar", "eliminar"];

function formatearTexto(texto: string): string {
  const resultado = texto.replaceAll("_", " ").replaceAll("-", " ").trim();

  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

function ordenarIds(ids: string[]): string[] {
  return [...ids].sort((primerId, segundoId) => primerId.localeCompare(segundoId));
}

export default function AccesoUsuario({ usuarioId, accesoInicial, alActualizar }: Propiedades) {
  const [nivelAcceso, setNivelAcceso] = useState<NivelAccesoUsuarioPanel>(accesoInicial.nivelAcceso);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>(accesoInicial.permisosSeleccionados);
  const [permisosDisponibles, setPermisosDisponibles] = useState<PermisoDisponiblePanel[]>([]);
  const [cargandoPermisos, setCargandoPermisos] = useState(true);
  const [errorPermisos, setErrorPermisos] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [guardadoCorrectamente, setGuardadoCorrectamente] = useState(false);

  useEffect(() => {
    setNivelAcceso(accesoInicial.nivelAcceso);
    setPermisosSeleccionados(accesoInicial.permisosSeleccionados);
  }, [accesoInicial]);

  useEffect(() => {
    const controlador = new AbortController();

    const cargarPermisos = async () => {
      try {
        setCargandoPermisos(true);
        setErrorPermisos(null);

        const respuesta = await fetch("/api/panel/permisos", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const contenido = (await respuesta.json()) as RespuestaPermisosApi;

        if (!respuesta.ok || !contenido.ok) {
          throw new Error(contenido.error ?? "No se han podido cargar los permisos.");
        }

        const permisosValidos = contenido.data.filter((permiso) => typeof permiso.id === "string" && typeof permiso.codigo === "string" && permiso.activo);

        setPermisosDisponibles(permisosValidos);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error cargando los permisos:", error);
        setErrorPermisos("No se ha podido obtener la lista de permisos disponibles.");
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoPermisos(false);
        }
      }
    };

    cargarPermisos();

    return () => {
      controlador.abort();
    };
  }, [intento]);

  const permisosPorModulo = useMemo(() => {
    const grupos = new Map<string, PermisoDisponiblePanel[]>();

    permisosDisponibles.forEach((permiso) => {
      const permisosModulo = grupos.get(permiso.modulo) ?? [];

      permisosModulo.push(permiso);
      grupos.set(permiso.modulo, permisosModulo);
    });

    return Array.from(grupos.entries())
      .map(([modulo, permisos]) => ({
        modulo,
        permisos: permisos.sort((primerPermiso, segundoPermiso) => {
          const primeraPosicion = ordenAcciones.indexOf(primerPermiso.accion);
          const segundaPosicion = ordenAcciones.indexOf(segundoPermiso.accion);

          return (primeraPosicion === -1 ? ordenAcciones.length : primeraPosicion) - (segundaPosicion === -1 ? ordenAcciones.length : segundaPosicion);
        }),
      }))
      .sort((primerGrupo, segundoGrupo) => primerGrupo.modulo.localeCompare(segundoGrupo.modulo, "es"));
  }, [permisosDisponibles]);

  const accesoTotal = nivelAcceso === "acceso-total";
  const idsPermisosDisponibles = permisosDisponibles.map((permiso) => permiso.id);

  const todosSeleccionados = idsPermisosDisponibles.length > 0 && idsPermisosDisponibles.every((permisoId) => permisosSeleccionados.includes(permisoId));

  const hayCambios = useMemo(() => {
    if (nivelAcceso !== accesoInicial.nivelAcceso) {
      return true;
    }

    return JSON.stringify(ordenarIds(permisosSeleccionados)) !== JSON.stringify(ordenarIds(accesoInicial.permisosSeleccionados));
  }, [nivelAcceso, permisosSeleccionados, accesoInicial]);

  const seleccionarNivel = (nivel: NivelAccesoUsuarioPanel) => {
    setNivelAcceso(nivel);
    setErrorGuardado(null);
    setGuardadoCorrectamente(false);
  };

  const alternarPermiso = (permisoId: string) => {
    if (accesoTotal || guardando) {
      return;
    }

    setPermisosSeleccionados((permisosActuales) => {
      if (permisosActuales.includes(permisoId)) {
        return permisosActuales.filter((id) => id !== permisoId);
      }

      return [...permisosActuales, permisoId];
    });

    setErrorGuardado(null);
    setGuardadoCorrectamente(false);
  };

  const alternarTodos = () => {
    if (accesoTotal || guardando) {
      return;
    }

    setPermisosSeleccionados(todosSeleccionados ? [] : idsPermisosDisponibles);
    setErrorGuardado(null);
    setGuardadoCorrectamente(false);
  };

  const descartarCambios = () => {
    setNivelAcceso(accesoInicial.nivelAcceso);
    setPermisosSeleccionados(accesoInicial.permisosSeleccionados);
    setErrorGuardado(null);
    setGuardadoCorrectamente(false);
  };

  const guardarCambios = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!hayCambios || guardando || cargandoPermisos || errorPermisos) {
      return;
    }

    try {
      setGuardando(true);
      setErrorGuardado(null);
      setGuardadoCorrectamente(false);

      const respuesta = await fetch(`/api/panel/usuarios/${encodeURIComponent(usuarioId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seccion: "acceso-permisos",
          datos: {
            nivelAcceso,
            permisosSeleccionados: accesoTotal ? [] : permisosSeleccionados,
          },
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaActualizacion;

      if (!respuesta.ok || !contenido.ok || !contenido.data) {
        throw new Error(contenido.error ?? "No se han podido guardar los permisos.");
      }

      alActualizar(contenido.data.acceso);
      setNivelAcceso(contenido.data.acceso.nivelAcceso);
      setPermisosSeleccionados(contenido.data.acceso.permisosSeleccionados);
      setGuardadoCorrectamente(true);
    } catch (error) {
      console.error("Error actualizando los permisos:", error);
      setErrorGuardado(error instanceof Error ? error.message : "No se han podido guardar los permisos.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardarCambios} className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">Acceso y permisos</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Define qué apartados podrá consultar o modificar este usuario.</p>
      </div>

      <div className="p-5 sm:p-6">
        {errorGuardado && (
          <div className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            <p className="font-bold">No se han podido guardar los permisos</p>
            <p className="mt-1">{errorGuardado}</p>
          </div>
        )}

        {guardadoCorrectamente && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm font-semibold text-on-success-container" role="status">
            <span className="inline-block h-5 w-5 shrink-0 bg-success mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
            Los permisos se han actualizado correctamente.
          </div>
        )}

        <fieldset disabled={guardando}>
          <legend className="font-bold text-on-surface">Nivel de acceso general</legend>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {nivelesAcceso.map((nivel) => {
              const seleccionado = nivelAcceso === nivel.id;

              return (
                <label key={nivel.id} className={`relative flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-colors ${seleccionado ? "border-primary bg-primary-fixed/50" : "border-outline-variant/70 hover:border-primary/60 hover:bg-surface-container-low"}`}>
                  <input type="radio" name="nivel-acceso" value={nivel.id} checked={seleccionado} onChange={() => seleccionarNivel(nivel.id)} className="sr-only" />

                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${seleccionado ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                    <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${nivel.icono}.svg')`, WebkitMaskImage: `url('/iconos/panel/${nivel.icono}.svg')` }} aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-bold text-on-surface">{nivel.nombre}</span>
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
            <p className="mt-1 text-sm text-on-surface-variant">{accesoTotal ? "El acceso total incluye todos los permisos actuales y futuros." : "Selecciona las acciones concretas que podrá realizar."}</p>
          </div>

          {!cargandoPermisos && !errorPermisos && permisosDisponibles.length > 0 && (
            <button type="button" onClick={alternarTodos} disabled={accesoTotal || guardando} className="w-max text-sm font-bold text-primary transition-colors hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-40">
              {todosSeleccionados ? "Quitar selección" : "Seleccionar todos"}
            </button>
          )}
        </div>

        {cargandoPermisos && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant">Cargando permisos disponibles...</p>
          </div>
        )}

        {!cargandoPermisos && errorPermisos && (
          <div className="mt-5 rounded-xl border border-error/40 bg-error-container p-4" role="alert">
            <p className="font-bold text-on-error-container">No se han podido cargar los permisos</p>
            <p className="mt-1 text-sm text-on-error-container">{errorPermisos}</p>

            <button type="button" onClick={() => setIntento((valor) => valor + 1)} className="mt-3 rounded-lg border border-error px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error hover:text-on-error">
              Volver a intentarlo
            </button>
          </div>
        )}

        {!cargandoPermisos && !errorPermisos && permisosPorModulo.length > 0 && (
          <div className={`mt-5 overflow-hidden rounded-xl border border-outline-variant/70 ${accesoTotal ? "opacity-70" : ""}`}>
            <div className="hidden grid-cols-[minmax(180px,1fr)_repeat(4,90px)] items-center bg-on-primary-fixed px-4 py-3 text-xs font-bold uppercase tracking-wide text-on-primary lg:grid">
              <span>Módulo</span>

              {ordenAcciones.map((accion) => (
                <span key={accion} className="text-center">{formatearTexto(accion)}</span>
              ))}
            </div>

            <div className="divide-y divide-outline-variant/60">
              {permisosPorModulo.map((grupo) => (
                <div key={grupo.modulo} className="bg-surface-container-lowest p-3 lg:grid lg:grid-cols-[minmax(180px,1fr)_repeat(4,90px)] lg:items-center">
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

                      const seleccionado = accesoTotal || permisosSeleccionados.includes(permiso.id);

                      return (
                        <label key={permiso.id} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg p-3 transition-colors lg:min-h-0 ${seleccionado ? "bg-primary-fixed/50" : "bg-surface-container-low hover:bg-primary-fixed/30"} ${accesoTotal ? "cursor-not-allowed" : "cursor-pointer"}`}>
                          <span className="text-[10px] font-semibold text-on-surface-variant lg:hidden">{formatearTexto(accion)}</span>
                          <input type="checkbox" checked={seleccionado} onChange={() => alternarPermiso(permiso.id)} disabled={accesoTotal || guardando} className="h-4 w-4 rounded border-outline-variant accent-primary" aria-label={`${formatearTexto(accion)} ${formatearTexto(grupo.modulo)}`} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nivelAcceso === "todos-equipos" && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-fixed/40 p-4">
            <span className="inline-block h-5 w-5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/informacion.svg')", WebkitMaskImage: "url('/iconos/panel/informacion.svg')" }} aria-hidden="true" />
            <p className="text-sm text-on-primary-fixed-variant">El usuario tendrá acceso a todos los equipos actuales y futuros.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={descartarCambios} disabled={!hayCambios || guardando} className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
          Descartar cambios
        </button>

        <button type="submit" disabled={!hayCambios || guardando || cargandoPermisos || Boolean(errorPermisos)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40">
          {guardando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" aria-hidden="true" />}
          {guardando ? "Guardando..." : "Guardar permisos"}
        </button>
      </div>
    </form>
  );
}