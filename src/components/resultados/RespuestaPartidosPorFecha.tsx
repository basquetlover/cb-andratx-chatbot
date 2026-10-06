import MensajeIA from "@components/MensajeIA";
import TarjetaPartidoEquipoPublico from "@components/equipos/publico/TarjetaPartidoEquipoPublico";

import { formatearRangoPartidos } from "@components/conversacion/flujos/MensajesPartidosPorFecha";

import type { ResultadoPartidosPorFecha } from "@tipos/PartidosPorFecha";

interface Propiedades {
  resultado: ResultadoPartidosPorFecha;
}

export default function RespuestaPartidosPorFecha({
  resultado,
}: Propiedades) {
  const cantidad = resultado.partidos.length;

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">
        Partidos: {resultado.equipo.nombre}
      </p>

      <p className="mt-1 text-sm text-on-surface-variant">
        {formatearRangoPartidos(resultado.rango)}
      </p>

      {cantidad > 0 ? (
        <>
          <p className="mt-2 text-xs font-semibold text-secondary">
            {cantidad === 1
              ? "1 partido encontrado"
              : `${cantidad} partidos encontrados`}
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {resultado.partidos.map((partido) => (
              <TarjetaPartidoEquipoPublico
                key={partido.id}
                partido={partido}
                compacto
              />
            ))}
          </div>

          <p className="mt-4 text-xs text-on-surface-variant">
            Partidos ordenados por fecha y hora. Consulta los posibles
            cambios y las fichas disponibles en la web oficial de la FBIB.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-on-surface-variant">
          No se han encontrado partidos de este equipo dentro del
          periodo seleccionado en los datos consultados de la FBIB.
        </p>
      )}
    </MensajeIA>
  );
}