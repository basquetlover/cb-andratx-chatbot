import { useEffect, useRef, useState } from "react";

import SeleccionEquipo from "@components/formularios/SeleccionEquipo";
import RespuestaClasificacion from "@components/resultados/RespuestaClasificacion";

import {
  MensajeCargaClasificacion,
  MensajeEquiposClasificacion,
  MensajeErrorClasificacion,
} from "./MensajesClasificacion";

import type { EquipoDisponible } from "@tipos/Equipo";
import type {
  RespuestaClasificacionApi,
  ResultadoClasificacion,
} from "@tipos/Clasificacion";

interface Propiedades {
  alCompletar: () => void;
}

export default function Clasificacion({ alCompletar }: Propiedades) {
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<
    EquipoDisponible[]
  >([]);
  const [seleccionConfirmada, setSeleccionConfirmada] = useState(false);
  const [resultados, setResultados] = useState<ResultadoClasificacion[]>([]);
  const [equiposConError, setEquiposConError] = useState<EquipoDisponible[]>([]);
  const [peticion, setPeticion] = useState<{
    equipos: EquipoDisponible[];
  } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const alCompletarRef = useRef(alCompletar);

  useEffect(() => {
    alCompletarRef.current = alCompletar;
  }, [alCompletar]);

  useEffect(() => {
    if (!peticion) return;

    const controlador = new AbortController();

    const cargar = async () => {
      const respuestas = await Promise.allSettled(
        peticion.equipos.map(async (equipo) => {
          const respuesta = await fetch(
            `/api/clasificaciones/equipo?equipoId=${encodeURIComponent(equipo.id)}`,
            {
              method: "GET",
              credentials: "same-origin",
              headers: { Accept: "application/json" },
              signal: controlador.signal,
            },
          );

          const contenido =
            (await respuesta.json()) as RespuestaClasificacionApi;

          if (!respuesta.ok || !contenido.ok || !contenido.data) {
            throw new Error(
              contenido.error ?? "No se ha podido obtener la clasificación",
            );
          }

          return contenido.data;
        }),
      );

      if (controlador.signal.aborted) return;

      const correctos: ResultadoClasificacion[] = [];
      const errores: EquipoDisponible[] = [];

      respuestas.forEach((respuesta, indice) => {
        if (respuesta.status === "fulfilled") {
          correctos.push(respuesta.value);
        } else {
          const equipo = peticion.equipos[indice];
          errores.push(equipo);
          console.error(
            `Error al consultar la clasificación de ${equipo.id}:`,
            respuesta.reason,
          );
        }
      });

      setResultados((anteriores) => {
        const porEquipo = new Map(
          anteriores.map((resultado) => [resultado.equipo.id, resultado]),
        );

        correctos.forEach((resultado) => {
          porEquipo.set(resultado.equipo.id, resultado);
        });

        return Array.from(porEquipo.values());
      });

      setEquiposConError(errores);
      setCargando(false);

      if (errores.length === 0) {
        setFinalizado(true);
        alCompletarRef.current();
      }
    };

    void cargar();

    return () => controlador.abort();
  }, [peticion]);

  const confirmarSeleccion = () => {
    if (seleccionConfirmada || equiposSeleccionados.length === 0) return;

    setSeleccionConfirmada(true);
    setCargando(true);
    setPeticion({ equipos: [...equiposSeleccionados] });
  };

  const reintentar = () => {
    if (cargando || finalizado || equiposConError.length === 0) return;

    setCargando(true);
    setPeticion({ equipos: [...equiposConError] });
  };

  const continuar = () => {
    if (cargando || finalizado) return;

    setFinalizado(true);
    alCompletarRef.current();
  };

  return (
    <>
      <SeleccionEquipo
        modo="multiple"
        equiposSeleccionados={equiposSeleccionados}
        seleccionConfirmada={seleccionConfirmada}
        maximo={5}
        alCambiarSeleccion={setEquiposSeleccionados}
        alConfirmar={confirmarSeleccion}
      />

      {seleccionConfirmada && (
        <MensajeEquiposClasificacion equipos={equiposSeleccionados} />
      )}

      {equiposSeleccionados.map((equipo) => {
        const resultado = resultados.find(
          (elemento) => elemento.equipo.id === equipo.id,
        );

        return resultado ? (
          <RespuestaClasificacion key={equipo.id} resultado={resultado} />
        ) : null;
      })}

      {cargando && (
        <MensajeCargaClasificacion
          cantidad={peticion?.equipos.length ?? equiposSeleccionados.length}
        />
      )}

      {!cargando && !finalizado && equiposConError.length > 0 && (
        <MensajeErrorClasificacion
          equipos={equiposConError}
          alReintentar={reintentar}
          alContinuar={continuar}
        />
      )}
    </>
  );
}