import { useEffect, useRef, useState } from "react";

import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";
import SeleccionEquipo from "@components/formularios/SeleccionEquipo";
import RespuestaHorariosEntrenamiento from "@components/resultados/RespuestaHorariosEntrenamiento";

import type { EquipoDisponible } from "@tipos/Equipo";
import type { RespuestaEntrenamientosApi, ResultadoEntrenamientos } from "@tipos/Entrenamiento";

interface Propiedades {
  alCompletar: () => void;
}

interface EquipoConError {
  id: string;
  nombre: string;
}

export default function HorariosEntrenamiento({ alCompletar }: Propiedades) {
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<EquipoDisponible[]>([]);
  const [seleccionConfirmada, setSeleccionConfirmada] = useState(false);
  const [resultados, setResultados] = useState<ResultadoEntrenamientos[]>([]);
  const [equiposConError, setEquiposConError] = useState<EquipoConError[]>([]);
  const [cargando, setCargando] = useState(false);
  const [intento, setIntento] = useState(0);

  const alCompletarRef = useRef(alCompletar);

  useEffect(() => {
    alCompletarRef.current = alCompletar;
  }, [alCompletar]);

  useEffect(() => {
    if (!seleccionConfirmada || equiposSeleccionados.length === 0) {
      return;
    }

    const controlador = new AbortController();

    const cargarEntrenamientos = async () => {
      setCargando(true);
      setResultados([]);
      setEquiposConError([]);

      const consultas = equiposSeleccionados.map(async (equipo) => {
        const parametros = new URLSearchParams({
          equipoId: equipo.id,
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

        return contenido.data;
      });

      const respuestas = await Promise.allSettled(consultas);

      if (controlador.signal.aborted) {
        return;
      }

      const resultadosCorrectos: ResultadoEntrenamientos[] = [];
      const errores: EquipoConError[] = [];

      respuestas.forEach((respuesta, indice) => {
        const equipo = equiposSeleccionados[indice];

        if (respuesta.status === "fulfilled") {
          resultadosCorrectos.push(respuesta.value);
          return;
        }

        console.error(`Error al consultar los entrenamientos de ${equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}:`, respuesta.reason);

        errores.push({
          id: equipo.id,
          nombre: equipo.nombre ?? equipo.nombreCorto ?? "Equipo",
        });
      });

      setResultados(resultadosCorrectos);
      setEquiposConError(errores);
      setCargando(false);

      if (errores.length === 0) {
        alCompletarRef.current();
      }
    };

    cargarEntrenamientos();

    return () => {
      controlador.abort();
    };
  }, [seleccionConfirmada, equiposSeleccionados, intento]);

  return (
    <>
      <SeleccionEquipo modo="multiple" equiposSeleccionados={equiposSeleccionados} seleccionConfirmada={seleccionConfirmada} maximo={5} alCambiarSeleccion={setEquiposSeleccionados} alConfirmar={() => setSeleccionConfirmada(true)} />

      {seleccionConfirmada && (
        <MensajeUsuario>
          <p className="text-sm text-secondary-fixed">Equipos seleccionados:</p>

          <ul className="mt-1 flex flex-col gap-1">
            {equiposSeleccionados.map((equipo) => (
              <li key={equipo.id} className="font-semibold">
                {equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}
              </li>
            ))}
          </ul>
        </MensajeUsuario>
      )}

      {cargando && (
        <MensajeIA>
          <div className="flex items-center gap-3" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-secondary" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant">
              {equiposSeleccionados.length === 1 ? "Consultando los entrenamientos de esta semana..." : `Consultando los entrenamientos de ${equiposSeleccionados.length} equipos...`}
            </p>
          </div>
        </MensajeIA>
      )}

      {!cargando &&
        resultados.map((resultado) => (
          <RespuestaHorariosEntrenamiento key={resultado.equipo.id} resultado={resultado} />
        ))}

      {!cargando && equiposConError.length > 0 && (
        <MensajeIA>
          <div role="alert">
            <p className="font-semibold text-error">{equiposConError.length === 1 ? "No se han podido cargar los entrenamientos de un equipo" : "No se han podido cargar los entrenamientos de algunos equipos"}</p>

            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-on-surface-variant">
              {equiposConError.map((equipo) => (
                <li key={equipo.id}>{equipo.nombre}</li>
              ))}
            </ul>

            <button type="button" onClick={() => setIntento((valor) => valor + 1)} className="mt-4 rounded-xl border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container">
              Volver a intentarlo
            </button>
          </div>
        </MensajeIA>
      )}
    </>
  );
}