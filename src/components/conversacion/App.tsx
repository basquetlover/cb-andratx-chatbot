import { useEffect, useRef, useState } from "react";

import Consulta from "@components/conversacion/Consulta";
import MensajeBienvenida from "@components/conversacion/MensajeBienvenida";
import MensajeDespedida from "@components/resultados/MensajeDespedida";
import ToastContainer, { useToast } from "@components/notificaciones/SistemaNotificaciones";

interface BloqueConsulta {
  id: number;
}

export default function App() {
  const { addToast } = useToast();
  const [consultas, setConsultas] = useState<BloqueConsulta[]>([
    {
      id: 1,
    },
  ]);

  addToast({
  type: "favoriteRemoved",
  message: "Infantil Masculino ya está entre tus equipos favoritos.",
  duration: 0,
});

  const [conversacionFinalizada, setConversacionFinalizada] = useState(false);

  const contenedorConversacionRef = useRef<HTMLElement | null>(null);

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

    const desplazarAlUltimoMensajeUsuario = () => {
      if (animacion !== null) {
        cancelAnimationFrame(animacion);
      }

      animacion = requestAnimationFrame(() => {
        const mensajesUsuario = contenedor.querySelectorAll<HTMLElement>("[data-mensaje-usuario]");
        const ultimoMensajeUsuario = mensajesUsuario.item(mensajesUsuario.length - 1);

        if (!ultimoMensajeUsuario) {
          return;
        }

        const posicionInicioMensaje = ultimoMensajeUsuario.getBoundingClientRect().top + window.scrollY;

        window.scrollTo({
          top: Math.max(0, posicionInicioMensaje - 16),
          behavior: "smooth",
        });
      });
    };



    const observador = new MutationObserver(desplazarAlUltimoMensajeUsuario);

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

      const reiniciarConversacion = () => {
      setConsultas((consultasActuales) => {
        const ultimoId = consultasActuales.at(-1)?.id ?? 0;

        return [
          {
            id: ultimoId + 1,
          },
        ];
      });

      setConversacionFinalizada(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          contenedorConversacionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    };

  return (
    <section ref={contenedorConversacionRef} className="mx-auto mt-5 flex max-w-3xl flex-col gap-y-2 overflow-hidden p-4" aria-label="Conversación con el asistente">
      <MensajeBienvenida />

      {consultas.map((consulta) => (
        <Consulta key={consulta.id} alResponderContinuacion={(quiereContinuar) => responderContinuacion(consulta.id, quiereContinuar)} />
      ))}

      {conversacionFinalizada && (
        <>
          <MensajeDespedida />

          <div className="flex w-full justify-center py-5">
            <p onClick={reiniciarConversacion} className="text-sm py-1 text-on-surface-variant cursor-pointer fill-on-surface-variant flex items-center gap-x-2  transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg"className="w-4 h-4" viewBox="0 -960 960 960">
                <path d="M339.5-108.5q-65.5-28.5-114-77t-77-114T120-440h80q0 117 81.5 198.5T480-160t198.5-81.5T760-440t-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77 77 114T840-440t-28.5 140.5-77 114-114 77T480-80t-140.5-28.5"/>
              </svg>
              Reiniciar conversación
            </p>
          </div>
        </>
      )}

      <div className="h-15 w-full" aria-hidden="true" />
      <ToastContainer/>
    </section>
  );
}