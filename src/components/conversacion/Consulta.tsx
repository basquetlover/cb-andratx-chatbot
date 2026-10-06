import { useState } from "react";

import HorariosEntrenamiento from "@components/conversacion/flujos/HorariosEntrenamiento";
import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";
import ContinuarConsulta from "@components/formularios/ContinuarConsulta";
import OpcionesPrincipales from "@components/formularios/OpcionesPrincipales";
import { opcionesPrincipales } from "@tipos/Opciones";
import BannerRedesSociales from "./BannerRedesSociales";
import ProximoPartido from "@components/conversacion/flujos/ProximoPartido";
import Reglamento from "./flujos/Reglamento";
import Clasificacion from "./flujos/Clasificacion";
import EventosClub from "./flujos/EventosClub";
import PartidosPorFecha from "./flujos/PartidosPorFecha";

interface Propiedades {
  alResponderContinuacion: (quiereContinuar: boolean) => void;
}

export default function Consulta({ alResponderContinuacion }: Propiedades) {
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string | null>(null);
  const [flujoCompletado, setFlujoCompletado] = useState(false);

  const opcionActual = opcionesPrincipales.find((opcion) => opcion.id === opcionSeleccionada) ?? null;

  const seleccionarOpcion = (id: string) => {
    if (opcionSeleccionada !== null) {
      return;
    }

    setOpcionSeleccionada(id);
    setFlujoCompletado(false);
  };

  return (
    <>
      <OpcionesPrincipales opcionSeleccionada={opcionSeleccionada} alSeleccionar={seleccionarOpcion} />

      {opcionActual && (
        <MensajeUsuario>
          <p className="text-sm text-secondary-fixed">Opción seleccionada:</p>
          <p className="font-semibold">{opcionActual.nombre}</p>
        </MensajeUsuario>
      )}

      {opcionSeleccionada === "horarios-entrenamiento" && <HorariosEntrenamiento alCompletar={() => setFlujoCompletado(true)} />}

      {opcionSeleccionada === "proximo-partido" && <ProximoPartido alCompletar={() => setFlujoCompletado(true)} />}

      {opcionSeleccionada === "reglamento" && (
        <Reglamento alCompletar={() => setFlujoCompletado(true)} />
      )}

      {opcionSeleccionada === "clasificacion" && (
        <Clasificacion alCompletar={() => setFlujoCompletado(true)} />
      )}

      {opcionSeleccionada === "eventos-club" && (
        <EventosClub alCompletar={() => setFlujoCompletado(true)} />
      )}

      {opcionSeleccionada === "partidos-por-fecha" && (
        <PartidosPorFecha alCompletar={() => setFlujoCompletado(true)} />
      )}

      {opcionSeleccionada && !["horarios-entrenamiento", "proximo-partido", "reglamento", "clasificacion", "eventos-club", "partidos-por-fecha"].includes(opcionSeleccionada) && (
        <MensajeIA>
          <p className="font-semibold text-on-secondary-fixed">Esta consulta todavía no está disponible</p>
          <p className="mt-1 text-sm text-on-surface-variant">Estamos preparando este apartado del asistente.</p>
        </MensajeIA>
      )}

      {flujoCompletado && (
        <>
          <BannerRedesSociales />
          <ContinuarConsulta alResponder={alResponderContinuacion} />
        </>
      )}
    </>
  );
}