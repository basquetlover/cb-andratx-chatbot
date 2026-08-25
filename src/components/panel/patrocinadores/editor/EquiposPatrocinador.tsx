import { useMemo, useState, type FormEvent } from "react";

import SelectorEquiposPatrocinador from "@components/panel/patrocinadores/formulario/SelectorEquiposPatrocinador";

import type { EquipoPatrocinadoPanel } from "@tipos/PatrocinadorPanel";

interface Propiedades {
  patrocinadorId: string;
  equiposIniciales: EquipoPatrocinadoPanel[];
  alActualizar: (equipos: EquipoPatrocinadoPanel[]) => void;
}

interface RespuestaEquipos {
  ok: boolean;
  data?: {
    equipos?: EquipoPatrocinadoPanel[];
  };
  error?: string;
}

function ordenarIds(ids: string[]): string[] {
  return [...ids].sort((primerId, segundoId) => primerId.localeCompare(segundoId));
}

function sonSeleccionesIguales(primeraSeleccion: string[], segundaSeleccion: string[]): boolean {
  const primera = ordenarIds(primeraSeleccion);
  const segunda = ordenarIds(segundaSeleccion);

  return primera.length === segunda.length && primera.every((id, indice) => id === segunda[indice]);
}

export default function EquiposPatrocinador({ patrocinadorId, equiposIniciales, alActualizar }: Propiedades) {
  const idsIniciales = useMemo(() => equiposIniciales.map((equipo) => equipo.id), [equiposIniciales]);

  const [equiposGuardadosIds, setEquiposGuardadosIds] = useState(idsIniciales);
  const [equiposSeleccionadosIds, setEquiposSeleccionadosIds] = useState(idsIniciales);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const hayCambios = useMemo(() => {
    return !sonSeleccionesIguales(equiposGuardadosIds, equiposSeleccionadosIds);
  }, [equiposGuardadosIds, equiposSeleccionadosIds]);

  const cambiarSeleccion = (equiposIds: string[]) => {
    setEquiposSeleccionadosIds(equiposIds);
    setError(null);
    setMensaje(null);
  };

  const descartarCambios = () => {
    setEquiposSeleccionadosIds(equiposGuardadosIds);
    setError(null);
    setMensaje(null);
  };

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!hayCambios || guardando) {
      return;
    }

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch(`/api/panel/patrocinadores/${encodeURIComponent(patrocinadorId)}/equipos`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equiposIds: equiposSeleccionadosIds,
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaEquipos;

      if (!respuesta.ok || !contenido.ok || !contenido.data?.equipos) {
        throw new Error(contenido.error ?? "No se han podido actualizar los equipos");
      }

      const equiposActualizados = contenido.data.equipos;
      const idsActualizados = equiposActualizados.map((equipo) => equipo.id);

      setEquiposGuardadosIds(idsActualizados);
      setEquiposSeleccionadosIds(idsActualizados);
      setMensaje("Los equipos patrocinados se han actualizado.");
      alActualizar(equiposActualizados);
    } catch (error) {
      console.error("Error actualizando los equipos patrocinados:", error);
      setError(error instanceof Error ? error.message : "No se han podido actualizar los equipos patrocinados.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Equipos patrocinados</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Selecciona los equipos con los que colabora este patrocinador.</p>
          </div>

          <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-on-primary-fixed-variant">{equiposSeleccionadosIds.length} seleccionados</span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {mensaje && <p className="rounded-xl border border-success/40 bg-success-container px-4 py-3 text-sm text-on-success-container" role="status">{mensaje}</p>}
        {error && <p className="rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</p>}

        <div className="rounded-xl border border-secondary/30 bg-secondary-fixed px-4 py-3 text-sm text-on-secondary-fixed">
          <p className="font-semibold">Información de las asignaciones</p>
          <p className="mt-1 text-on-secondary-fixed-variant">Los equipos que ya estaban seleccionados conservarán su fecha y administrador originales. Esta información solo se generará de nuevo para las asociaciones nuevas.</p>
        </div>

        <SelectorEquiposPatrocinador equiposSeleccionados={equiposSeleccionadosIds} alCambiar={cambiarSeleccion} deshabilitado={guardando} />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low p-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={descartarCambios} disabled={!hayCambios || guardando} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40">
          Descartar cambios
        </button>

        <button type="submit" disabled={!hayCambios || guardando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {guardando && <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" aria-hidden="true" />}
          {guardando ? "Guardando..." : "Guardar equipos"}
        </button>
      </div>
    </form>
  );
}