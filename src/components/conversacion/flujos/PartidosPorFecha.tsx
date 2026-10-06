import { useEffect, useRef, useState } from "react";

import SeleccionEquipo from "@components/formularios/SeleccionEquipo";
import SeleccionFechaPartidos from "@components/formularios/SeleccionFechaPartidos";
import RespuestaPartidosPorFecha from "@components/resultados/RespuestaPartidosPorFecha";

import {
  MensajeEquiposPartidos,
  MensajeFechaPartidos,
  MensajeCargaPartidosFecha,
  MensajeErrorPartidosFecha,
} from "./MensajesPartidosPorFecha";

import type { EquipoDisponible } from "@tipos/Equipo";
import type {
  RangoFechasPartidos,
  RespuestaPartidosPorFechaApi,
  ResultadoPartidosPorFecha,
} from "@tipos/PartidosPorFecha";

interface Propiedades {
  alCompletar: () => void;
}

interface Peticion {
  rango: RangoFechasPartidos;
  equipos: EquipoDisponible[];
}

export default function PartidosPorFecha({
  alCompletar,
}: Propiedades) {
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<
    EquipoDisponible[]
  >([]);

  const [seleccionConfirmada, setSeleccionConfirmada] = useState(false);

  const [rangoConfirmado, setRangoConfirmado] =
    useState<RangoFechasPartidos | null>(null);

  const [resultados, setResultados] = useState<
    ResultadoPartidosPorFecha[]
  >([]);

  const [equiposConError, setEquiposConError] = useState<
    EquipoDisponible[]
  >([]);

  const [peticion, setPeticion] = useState<Peticion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const alCompletarRef = useRef(alCompletar);

  useEffect(() => {
    alCompletarRef.current = alCompletar;
  }, [alCompletar]);

  useEffect(() => {
    if (!peticion) {
      return;
    }

    const controlador = new AbortController();

    const cargarPartidos = async () => {
      const respuestas = await Promise.allSettled(
        peticion.equipos.map(async (equipo) => {
          const parametros = new URLSearchParams({
            equipoId: equipo.id,
            desde: peticion.rango.desde,
            hasta: peticion.rango.hasta,
          });

          const respuesta = await fetch(
            `/api/partidos/fecha?${parametros.toString()}`,
            {
              method: "GET",
              credentials: "same-origin",
              headers: {
                Accept: "application/json",
              },
              signal: controlador.signal,
            },
          );

          const contenido =
            (await respuesta.json()) as RespuestaPartidosPorFechaApi;

          if (!respuesta.ok || !contenido.ok || !contenido.data) {
            throw new Error(
              contenido.error ?? "No se han podido obtener los partidos",
            );
          }

          return contenido.data;
        }),
      );

      if (controlador.signal.aborted) {
        return;
      }

      const correctos: ResultadoPartidosPorFecha[] = [];
      const errores: EquipoDisponible[] = [];

      respuestas.forEach((respuesta, indice) => {
        if (respuesta.status === "fulfilled") {
          correctos.push(respuesta.value);
          return;
        }

        const equipo = peticion.equipos[indice];

        errores.push(equipo);

        console.error(
          `Error al consultar los partidos de ${equipo.id}:`,
          respuesta.reason,
        );
      });

      setResultados((anteriores) => {
        const porEquipo = new Map(
          anteriores.map((resultado) => [
            resultado.equipo.id,
            resultado,
          ]),
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

    void cargarPartidos();

    return () => controlador.abort();
  }, [peticion]);

  const confirmarEquipos = () => {
    if (seleccionConfirmada || equiposSeleccionados.length === 0) {
      return;
    }

    setSeleccionConfirmada(true);
  };

  const confirmarRango = (rango: RangoFechasPartidos) => {
    if (
      !seleccionConfirmada ||
      rangoConfirmado ||
      !rango.desde ||
      !rango.hasta ||
      rango.hasta < rango.desde
    ) {
      return;
    }

    setRangoConfirmado(rango);
    setCargando(true);

    setPeticion({
      rango,
      equipos: [...equiposSeleccionados],
    });
  };

  const reintentar = () => {
    if (
      cargando ||
      finalizado ||
      !rangoConfirmado ||
      equiposConError.length === 0
    ) {
      return;
    }

    setCargando(true);

    setPeticion({
      rango: rangoConfirmado,
      equipos: [...equiposConError],
    });
  };

  const continuar = () => {
    if (cargando || finalizado) {
      return;
    }

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
        alConfirmar={confirmarEquipos}
      />

      {seleccionConfirmada && (
        <>
          <MensajeEquiposPartidos equipos={equiposSeleccionados} />

          <SeleccionFechaPartidos
            rangoConfirmado={rangoConfirmado}
            alConfirmar={confirmarRango}
          />
        </>
      )}

      {rangoConfirmado && (
        <MensajeFechaPartidos rango={rangoConfirmado} />
      )}

      {equiposSeleccionados.map((equipo) => {
        const resultado = resultados.find(
          (elemento) => elemento.equipo.id === equipo.id,
        );

        return resultado ? (
          <RespuestaPartidosPorFecha
            key={equipo.id}
            resultado={resultado}
          />
        ) : null;
      })}

      {cargando && (
        <MensajeCargaPartidosFecha
          cantidad={peticion?.equipos.length ?? 0}
        />
      )}

      {!cargando && !finalizado && equiposConError.length > 0 && (
        <MensajeErrorPartidosFecha
          equipos={equiposConError}
          alReintentar={reintentar}
          alContinuar={continuar}
        />
      )}
    </>
  );
}