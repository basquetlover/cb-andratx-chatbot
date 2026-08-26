import {
  useEffect,
  useRef,
  useState,
} from "react";

import Consulta from "@components/conversacion/Consulta";
import MensajeBienvenida from "@components/conversacion/MensajeBienvenida";
import MensajeDespedida from "@components/resultados/MensajeDespedida";

import ToastContainer, {
  useToast,
} from "@components/notificaciones/SistemaNotificaciones";

interface BloqueConsulta {
  id: number;
}

function contieneMensajeUsuario(
  nodo: Node,
): boolean {
  if (!(nodo instanceof Element)) {
    return false;
  }

  return (
    nodo.matches(
      "[data-mensaje-usuario]",
    ) ||
    Boolean(
      nodo.querySelector(
        "[data-mensaje-usuario]",
      ),
    )
  );
}

export default function App() {
  const { addToast: _addToast } =
    useToast();

  const [consultas, setConsultas] =
    useState<BloqueConsulta[]>([
      {
        id: 1,
      },
    ]);

  const [
    conversacionFinalizada,
    setConversacionFinalizada,
  ] = useState(false);

  const contenedorConversacionRef =
    useRef<HTMLElement | null>(null);

  const responderContinuacion = (
    consultaId: number,
    quiereContinuar: boolean,
  ) => {
    if (conversacionFinalizada) {
      return;
    }

    const ultimaConsulta =
      consultas.at(-1);

    if (
      !ultimaConsulta ||
      ultimaConsulta.id !== consultaId
    ) {
      return;
    }

    if (!quiereContinuar) {
      setConversacionFinalizada(true);
      return;
    }

    setConsultas(
      (consultasActuales) => {
        const ultimoId =
          consultasActuales.at(-1)?.id ??
          0;

        return [
          ...consultasActuales,
          {
            id: ultimoId + 1,
          },
        ];
      },
    );
  };

  useEffect(() => {
    const contenedor =
      contenedorConversacionRef.current;

    if (!contenedor) {
      return;
    }

    let animacion:
      | number
      | null = null;

    const desplazarAlUltimoMensajeUsuario =
      () => {
        if (animacion !== null) {
          window.cancelAnimationFrame(
            animacion,
          );
        }

        animacion =
          window.requestAnimationFrame(
            () => {
              const mensajesUsuario =
                contenedor.querySelectorAll<HTMLElement>(
                  "[data-mensaje-usuario]",
                );

              const ultimoMensajeUsuario =
                mensajesUsuario.item(
                  mensajesUsuario.length -
                    1,
                );

              if (
                !ultimoMensajeUsuario
              ) {
                return;
              }

              const posicionInicioMensaje =
                ultimoMensajeUsuario.getBoundingClientRect()
                  .top +
                window.scrollY;

              window.scrollTo({
                top: Math.max(
                  0,
                  posicionInicioMensaje -
                    16,
                ),
                behavior: "smooth",
              });
            },
          );
      };

    const observador =
      new MutationObserver(
        (mutaciones) => {
          /*
           * Ignoramos las mutaciones internas
           * de Leaflet: mosaicos, marcadores,
           * popups y controles del mapa.
           */
          const hayNuevoMensajeUsuario =
            mutaciones.some(
              (mutacion) => {
                if (
                  mutacion.target instanceof
                    Element &&
                  mutacion.target.closest(
                    ".mapa-localizaciones",
                  )
                ) {
                  return false;
                }

                return Array.from(
                  mutacion.addedNodes,
                ).some(
                  contieneMensajeUsuario,
                );
              },
            );

          if (
            hayNuevoMensajeUsuario
          ) {
            desplazarAlUltimoMensajeUsuario();
          }
        },
      );

    observador.observe(contenedor, {
      childList: true,
      subtree: true,
    });

    return () => {
      observador.disconnect();

      if (animacion !== null) {
        window.cancelAnimationFrame(
          animacion,
        );
      }
    };
  }, []);

  const reiniciarConversacion =
    () => {
      setConsultas(
        (consultasActuales) => {
          const ultimoId =
            consultasActuales.at(-1)
              ?.id ?? 0;

          return [
            {
              id: ultimoId + 1,
            },
          ];
        },
      );

      setConversacionFinalizada(
        false,
      );

      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            () => {
              contenedorConversacionRef.current?.scrollIntoView(
                {
                  behavior: "smooth",
                  block: "start",
                },
              );
            },
          );
        },
      );
    };

  return (
    <section
      ref={contenedorConversacionRef}
      className="mx-auto mt-5 flex max-w-3xl flex-col gap-y-2 overflow-hidden p-4"
      aria-label="Conversación con el asistente"
    >
      <MensajeBienvenida />

      {consultas.map((consulta) => (
        <Consulta
          key={consulta.id}
          alResponderContinuacion={(
            quiereContinuar,
          ) =>
            responderContinuacion(
              consulta.id,
              quiereContinuar,
            )
          }
        />
      ))}

      {conversacionFinalizada && (
        <>
          <MensajeDespedida />

          <div className="flex w-full justify-center py-5">
            <button
              type="button"
              onClick={
                reiniciarConversacion
              }
              className="flex cursor-pointer items-center gap-x-2 py-1 text-sm text-on-surface-variant transition-colors hover:text-primary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 fill-current"
                viewBox="0 -960 960 960"
                aria-hidden="true"
              >
                <path d="M339.5-108.5q-65.5-28.5-114-77t-77-114T120-440h80q0 117 81.5 198.5T480-160t198.5-81.5T760-440t-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77 77 114T840-440t-28.5 140.5-77 114-114 77T480-80t-140.5-28.5" />
              </svg>

              Reiniciar conversación
            </button>
          </div>
        </>
      )}

      <div
        className="h-15 w-full"
        aria-hidden="true"
      />

      <ToastContainer />
    </section>
  );
}