import { useEffect, useRef, useState } from "react";

import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";
import SeleccionEquipo from "@components/formularios/SeleccionEquipo";
import RespuestaProximoPartido from "@components/resultados/RespuestaProximoPartido";

import type { EquipoDisponible } from "@tipos/Equipo";
import type { RespuestaProximoPartido as RespuestaApiProximoPartido, ResultadoProximoPartido } from "@tipos/Partido";

interface Propiedades {
  alCompletar: () => void;
}

export default function ProximoPartido({ alCompletar }: Propiedades) {
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoDisponible | null>(null);
  const [resultado, setResultado] = useState<ResultadoProximoPartido | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alCompletarRef = useRef(alCompletar);

  useEffect(() => {
    alCompletarRef.current = alCompletar;
  }, [alCompletar]);

  useEffect(() => {
    if (!equipoSeleccionado) {
      return;
    }

    const controlador = new AbortController();

    const cargarProximoPartido = async () => {
      try {
        setCargando(true);
        setError(null);
        setResultado(null);

        const respuesta = await fetch(`/api/partidos/proximo?equipoId=${encodeURIComponent(equipoSeleccionado.id)}`, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const datos = (await respuesta.json()) as RespuestaApiProximoPartido;

        if (!respuesta.ok || !datos.ok || !datos.data) {
          throw new Error(datos.error ?? "No se ha podido obtener el próximo partido");
        }

        setResultado(datos.data);
        alCompletarRef.current();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error al cargar el próximo partido:", error);
        setError("No se ha podido consultar el próximo partido en este momento.");
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarProximoPartido();

    return () => {
      controlador.abort();
    };
  }, [equipoSeleccionado]);

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
            <p className="text-sm text-on-surface-variant">Consultando el próximo partido en la FBIB...</p>
          </div>
        </MensajeIA>
      )}

      {!cargando && error && (
        <MensajeIA>
          <p className="font-semibold text-error">No se ha podido completar la consulta</p>
          <p className="mt-1 text-sm text-on-surface-variant">{error}</p>
        </MensajeIA>
      )}

      {!cargando && !error && resultado && <RespuestaProximoPartido resultado={resultado} />}
    </>
  );
}