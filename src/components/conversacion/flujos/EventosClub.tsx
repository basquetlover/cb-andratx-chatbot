import { useEffect, useRef, useState } from "react";

import RespuestaEventoClub from "@components/resultados/RespuestaEventoClub";

import {
  MensajeCargaEventosClub,
  MensajeErrorEventosClub,
  MensajeSinEventosClub,
} from "./MensajesEventosClub";

import type {
  EventoChatbot,
  RespuestaEventosChatbot,
} from "@tipos/EventoChatbot";

interface Propiedades {
  alCompletar: () => void;
}

export default function EventosClub({
  alCompletar,
}: Propiedades) {
  const [eventos, setEventos] = useState<EventoChatbot[]>([]);
  const [estado, setEstado] = useState<
    "cargando" | "correcto" | "error" | "omitido"
  >("cargando");
  const [intento, setIntento] = useState(0);

  const alCompletarRef = useRef(alCompletar);

  useEffect(() => {
    alCompletarRef.current = alCompletar;
  }, [alCompletar]);

  useEffect(() => {
    const controlador = new AbortController();

    const cargarEventos = async () => {
      try {
        const respuesta = await fetch("/api/eventos/proximos", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const contenido =
          (await respuesta.json()) as RespuestaEventosChatbot;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !Array.isArray(contenido.data)
        ) {
          throw new Error(
            contenido.error ?? "No se han podido obtener los eventos",
          );
        }

        if (controlador.signal.aborted) return;

        setEventos(contenido.data);
        setEstado("correcto");
        alCompletarRef.current();
      } catch (error) {
        if (controlador.signal.aborted) return;

        console.error("Error al consultar los eventos del club:", error);
        setEstado("error");
      }
    };

    void cargarEventos();

    return () => controlador.abort();
  }, [intento]);

  const reintentar = () => {
    if (estado !== "error") return;

    setEstado("cargando");
    setIntento((valor) => valor + 1);
  };

  const continuar = () => {
    if (estado !== "error") return;

    setEstado("omitido");
    alCompletarRef.current();
  };

  return (
    <>
      {estado === "cargando" && <MensajeCargaEventosClub />}

      {estado === "error" && (
        <MensajeErrorEventosClub
          alReintentar={reintentar}
          alContinuar={continuar}
        />
      )}

      {estado === "correcto" && eventos.length === 0 && (
        <MensajeSinEventosClub />
      )}

      {estado === "correcto" &&
        eventos.map((evento) => (
          <RespuestaEventoClub
            key={evento.id}
            evento={evento}
          />
        ))}
    </>
  );
}