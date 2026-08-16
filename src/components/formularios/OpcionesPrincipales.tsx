import MensajeIA from "@components/MensajeIA";
import { opcionesPrincipales } from "@tipos/Opciones";

interface Propiedades {
  opcionSeleccionada: string | null;
  alSeleccionar: (id: string) => void;
}

export default function OpcionesPrincipales({ alSeleccionar, opcionSeleccionada }: Propiedades) {
  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">
        ¿Qué información quieres consultar?
      </p>

      <p className="mt-1 text-sm text-on-surface-variant">
        Selecciona una de las siguientes opciones:
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {opcionesPrincipales.map((opcion) => {
          const estaDisponible = opcion.estado === "disponible";
          const estaSeleccionada = opcionSeleccionada === opcion.id;
          const hayOpcionSeleccionada = opcionSeleccionada !== null;

          return (
            <button
              key={opcion.id}
              type="button"
              data-opcion={opcion.id}
              disabled={!estaDisponible || hayOpcionSeleccionada}
              onClick={() => alSeleccionar(opcion.id)}
              className={`
                rounded-xl
                border
                px-4 py-3
                text-left
                font-semibold
                transition-colors

                ${
                  estaSeleccionada
                    ? "border-secondary bg-secondary text-on-secondary opacity-100"
                    : "border-outline-variant bg-surface-container-lowest text-on-secondary-fixed"
                }

                ${
                  !hayOpcionSeleccionada && estaDisponible
                    ? "cursor-pointer hover:border-on-secondary-fixed hover:bg-secondary-container"
                    : ""
                }

                ${
                  hayOpcionSeleccionada && !estaSeleccionada
                    ? "cursor-not-allowed"
                    : ""
                }

                ${
                  !estaDisponible && !estaSeleccionada
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }
              `}
            >
              {opcion.nombre}
            </button>
          );
        })}
      </div>
    </MensajeIA>
  );
}