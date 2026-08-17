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

interface EquipoConError {
  id: string;
  nombre: string;
}

export default function ProximoPartido({ alCompletar }: Propiedades) {
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<EquipoDisponible[]>([]);
  const [seleccionConfirmada, setSeleccionConfirmada] = useState(false);
  const [resultados, setResultados] = useState<ResultadoProximoPartido[]>([]);
  const [equiposConError, setEquiposConError] = useState<EquipoConError[]>([]);
  const [cargando, setCargando] = useState(false);

  const alCompletarRef = useRef(alCompletar);

  useEffect(() => {
    alCompletarRef.current = alCompletar;
  }, [alCompletar]);

  useEffect(() => {
    if (!seleccionConfirmada || equiposSeleccionados.length === 0) {
      return;
    }

    const controlador = new AbortController();

    const cargarProximosPartidos = async () => {
      setCargando(true);
      setResultados([]);
      setEquiposConError([]);

      const consultas = equiposSeleccionados.map(async (equipo) => {
        const respuesta = await fetch(`/api/partidos/proximo?equipoId=${encodeURIComponent(equipo.id)}`, {
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

        return datos.data;
      });

      const respuestas = await Promise.allSettled(consultas);

      if (controlador.signal.aborted) {
        return;
      }

      const resultadosCorrectos: ResultadoProximoPartido[] = [];
      const errores: EquipoConError[] = [];

      respuestas.forEach((respuesta, indice) => {
        const equipo = equiposSeleccionados[indice];

        if (respuesta.status === "fulfilled") {
          resultadosCorrectos.push(respuesta.value);
          return;
        }

        console.error(`Error al consultar el próximo partido de ${equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}:`, respuesta.reason);

        errores.push({
          id: equipo.id,
          nombre: equipo.nombre ?? equipo.nombreCorto ?? "Equipo",
        });
      });

      setResultados(resultadosCorrectos);
      setEquiposConError(errores);
      setCargando(false);
      alCompletarRef.current();
    };

    cargarProximosPartidos();

    return () => {
      controlador.abort();
    };
  }, [seleccionConfirmada, equiposSeleccionados]);

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
              Consultando {equiposSeleccionados.length === 1 ? "el próximo partido..." : `los próximos partidos de ${equiposSeleccionados.length} equipos...`}
            </p>
          </div>
        </MensajeIA>
      )}

      {!cargando &&
        resultados.map((resultado) => (
          <RespuestaProximoPartido key={resultado.equipo.id} resultado={resultado} />
        ))}

      {!cargando && equiposConError.length > 0 && (
        <MensajeIA>
          <p className="font-semibold text-error">{equiposConError.length === 1 ? "No se ha podido consultar un equipo" : "No se han podido consultar algunos equipos"}</p>

          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-on-surface-variant">
            {equiposConError.map((equipo) => (
              <li key={equipo.id}>{equipo.nombre}</li>
            ))}
          </ul>
        </MensajeIA>
      )}
    </>
  );
}