import MensajeIA from "@components/MensajeIA";

export default function MensajeBienvenida() {
  return (
    <MensajeIA>
      <img
        src="/favicon.png"
        alt="Escudo C.B.Andratx"
        className="w-20 h-20 mx-auto"
      />

      <h1 className="text-xl text-on-secondary-fixed font-semibold text-center">
        ¡Hola! Soy el asistente del <br /> C.B. Andratx
      </h1>

      <p>
        Puedo ayudarte a consultar horarios de entrenamiento, próximos partidos,
        resultados, clasificaciones y dudas sobre el reglamento.
      </p>
    </MensajeIA>
  );
}