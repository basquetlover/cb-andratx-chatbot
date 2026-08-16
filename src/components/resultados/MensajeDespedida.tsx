import MensajeIA from "@components/MensajeIA";

export default function MensajeDespedida() {
  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">¡Perfecto! Espero haberte ayudado.</p>

      <p className="mt-2 text-sm text-on-surface-variant">
        Puedes volver cuando necesites consultar información sobre equipos, entrenamientos, partidos, clasificaciones o eventos del C.B. Andratx.
      </p>

      <p className="mt-3 text-xs text-on-surface-variant">
        Recuerda comprobar la información importante en las fuentes oficiales del club y de la FBIB.
      </p>
    </MensajeIA>
  );
}