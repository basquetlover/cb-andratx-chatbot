import { useEffect, useRef, useState } from "react";

import Consulta from "@components/conversacion/Consulta";
import MensajeBienvenida from "@components/conversacion/MensajeBienvenida";
import MensajeDespedida from "@components/resultados/MensajeDespedida";

interface BloqueConsulta {
  id: number;
}

export default function App() {
  const [consultas, setConsultas] = useState<BloqueConsulta[]>([
    {
      id: 1,
    },
  ]);

  const [conversacionFinalizada, setConversacionFinalizada] = useState(false);

  const contenedorConversacionRef = useRef<HTMLElement | null>(null);
  const finalConversacionRef = useRef<HTMLDivElement | null>(null);

  const responderContinuacion = (consultaId: number, quiereContinuar: boolean) => {
    if (conversacionFinalizada) {
      return;
    }

    const ultimaConsulta = consultas.at(-1);

    if (!ultimaConsulta || ultimaConsulta.id !== consultaId) {
      return;
    }

    if (!quiereContinuar) {
      setConversacionFinalizada(true);
      return;
    }

    setConsultas((consultasActuales) => {
      const ultimoId = consultasActuales.at(-1)?.id ?? 0;

      return [
        ...consultasActuales,
        {
          id: ultimoId + 1,
        },
      ];
    });
  };

  useEffect(() => {
    const contenedor = contenedorConversacionRef.current;

    if (!contenedor) {
      return;
    }

    let animacion: number | null = null;

    const desplazarAlUltimoMensaje = () => {
      if (animacion !== null) {
        cancelAnimationFrame(animacion);
      }

      animacion = requestAnimationFrame(() => {
        const ultimoMensaje = finalConversacionRef.current?.previousElementSibling;

        if (ultimoMensaje instanceof HTMLElement) {
          ultimoMensaje.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    };

    const observador = new MutationObserver(desplazarAlUltimoMensaje);

    observador.observe(contenedor, {
      childList: true,
      subtree: true,
    });

    return () => {
      observador.disconnect();

      if (animacion !== null) {
        cancelAnimationFrame(animacion);
      }
    };
  }, []);

  return (
    <section ref={contenedorConversacionRef} className="mx-auto mt-5 flex max-w-3xl flex-col gap-y-2 overflow-hidden p-4" aria-label="Conversación con el asistente">
      <MensajeBienvenida />

      {consultas.map((consulta) => (
        <Consulta key={consulta.id} alResponderContinuacion={(quiereContinuar) => responderContinuacion(consulta.id, quiereContinuar)} />
      ))}

      {conversacionFinalizada && <MensajeDespedida />}

      <div ref={finalConversacionRef} className="h-15 w-full" aria-hidden="true" />
    </section>
  );
}