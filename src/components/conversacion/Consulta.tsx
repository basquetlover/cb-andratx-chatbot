import { useState } from "react";

import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";

import HorariosEntrenamiento from "@components/conversacion/flujos/HorariosEntrenamiento";
import ProximoPartido from "@components/conversacion/flujos/ProximoPartido";
import PartidosPorFecha from "@components/conversacion/flujos/PartidosPorFecha";
import Clasificacion from "@components/conversacion/flujos/Clasificacion";
import EventosClub from "@components/conversacion/flujos/EventosClub";
import Reglamento from "@components/conversacion/flujos/Reglamento";

import ContinuarConsulta from "@components/formularios/ContinuarConsulta";
import OpcionesPrincipales from "@components/formularios/OpcionesPrincipales";
import { ContextoSeleccionEquipo } from "@components/formularios/SeleccionEquipo";

import BannerRedesSociales from "./BannerRedesSociales";

import { opcionesPrincipales } from "@tipos/Opciones";

interface Propiedades {
  alResponderContinuacion: (quiereContinuar: boolean) => void;
}

const opcionesImplementadas: string[] = [
  "horarios-entrenamiento",
  "proximo-partido",
  "partidos-por-fecha",
  "clasificacion",
  "eventos-club",
  "reglamento",
];

export default function Consulta({
  alResponderContinuacion,
}: Propiedades) {
  const [opcionSeleccionada, setOpcionSeleccionada] =
    useState<string | null>(null);

  const [flujoCompletado, setFlujoCompletado] = useState(false);

  const opcionActual =
    opcionesPrincipales.find(
      (opcion) => opcion.id === opcionSeleccionada,
    ) ?? null;

  const seleccionarOpcion = (id: string) => {
    if (opcionSeleccionada !== null) {
      return;
    }

    const opcion = opcionesPrincipales.find(
      (elemento) => elemento.id === id,
    );

    if (!opcion || opcion.estado !== "disponible") {
      return;
    }

    setOpcionSeleccionada(id);
    setFlujoCompletado(false);
  };

  const completarFlujo = () => {
    setFlujoCompletado(true);
  };

  return (
    <ContextoSeleccionEquipo.Provider
      value={{
        requiereFbib: opcionActual?.requiereFbib ?? false,
        alContinuarSinEquipos: completarFlujo,
      }}
    >
      <OpcionesPrincipales
        opcionSeleccionada={opcionSeleccionada}
        alSeleccionar={seleccionarOpcion}
      />

      {opcionActual && (
        <MensajeUsuario>
          <p className="text-sm text-secondary-fixed">
            Opción seleccionada:
          </p>

          <p className="font-semibold">
            {opcionActual.nombre}
          </p>
        </MensajeUsuario>
      )}

      {opcionSeleccionada === "horarios-entrenamiento" && (
        <HorariosEntrenamiento alCompletar={completarFlujo} />
      )}

      {opcionSeleccionada === "proximo-partido" && (
        <ProximoPartido alCompletar={completarFlujo} />
      )}

      {opcionSeleccionada === "partidos-por-fecha" && (
        <PartidosPorFecha alCompletar={completarFlujo} />
      )}

      {opcionSeleccionada === "clasificacion" && (
        <Clasificacion alCompletar={completarFlujo} />
      )}

      {opcionSeleccionada === "eventos-club" && (
        <EventosClub alCompletar={completarFlujo} />
      )}

      {opcionSeleccionada === "reglamento" && (
        <Reglamento alCompletar={completarFlujo} />
      )}

      {opcionSeleccionada &&
        !opcionesImplementadas.includes(opcionSeleccionada) && (
          <MensajeIA>
            <p className="font-semibold text-on-secondary-fixed">
              Esta consulta todavía no está disponible
            </p>

            <p className="mt-1 text-sm text-on-surface-variant">
              Estamos preparando este apartado del asistente.
            </p>
          </MensajeIA>
        )}

      {flujoCompletado && (
        <>
          <BannerRedesSociales />

          <ContinuarConsulta
            alResponder={alResponderContinuacion}
          />
        </>
      )}
    </ContextoSeleccionEquipo.Provider>
  );
}