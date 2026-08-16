import { useEffect, useState } from "react";

import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";
import SeleccionEquipo from "@components/formularios/SeleccionEquipo";
import RespuestaHorariosEntrenamiento from "@components/resultados/RespuestaHorariosEntrenamiento";
import type { EquipoDisponible } from "@tipos/Equipo";
import type { RespuestaEntrenamientosApi, ResultadoEntrenamientos } from "@tipos/Entrenamiento";

interface Propiedades {
  alCompletar: () => void;
}

export default function HorariosEntrenamiento({ alCompletar }: Propiedades) {
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoDisponible | null>(null);
  const [resultado, setResultado] = useState<ResultadoEntrenamientos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const equipoId = equipoSeleccionado?.id ?? null;

  useEffect(() => {
    if (!equipoId) {
      setResultado(null);
      setError(null);
      setCargando(false);
      return;
    }

    const controlador = new AbortController();

    const cargarEntrenamientos = async () => {
      try {
        setCargando(true);
        setError(null);
        setResultado(null);

        const parametros = new URLSearchParams({
          equipoId,
        });

        const respuesta = await fetch(`/api/entrenamientos/semana?${parametros.toString()}`, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const contenido = (await respuesta.json()) as RespuestaEntrenamientosApi;

        if (!respuesta.ok || !contenido.ok || !contenido.data) {
          throw new Error(contenido.error ?? "No se han podido obtener los entrenamientos");
        }

        setResultado(contenido.data);
        alCompletar();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error al cargar los entrenamientos:", error);
        setError("No se han podido obtener los entrenamientos de esta semana.");
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarEntrenamientos();

    return () => {
      controlador.abort();
    };
  }, [equipoId, intento]);

  return (
    <>
      <SeleccionEquipo equipoSeleccionado={equipoSeleccionado} alSeleccionar={setEquipoSeleccionado} />

      {equipoSeleccionado && (
        <MensajeUsuario>
          <p className="text-sm text-secondary-fixed">Equipo seleccionado:</p>
          <p className="font-semibold">{equipoSeleccionado.nombre ?? equipoSeleccionado.nombreCorto ?? "Equipo"}</p>
        </MensajeUsuario>
      )}

      {cargando && (
        <MensajeIA>
          <div className="flex items-center gap-3" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-secondary" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant">Consultando los entrenamientos de esta semana...</p>
          </div>
        </MensajeIA>
      )}

      {!cargando && error && (
        <MensajeIA>
          <div role="alert">
            <p className="font-semibold text-error">No se han podido cargar los entrenamientos</p>
            <p className="mt-1 text-sm text-on-surface-variant">{error}</p>

            <button type="button" onClick={() => setIntento((valor) => valor + 1)} className="mt-4 rounded-xl border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container">
              Volver a intentarlo
            </button>
          </div>
        </MensajeIA>
      )}

      {!cargando && !error && resultado && <RespuestaHorariosEntrenamiento resultado={resultado} />}
    </>
  );
}