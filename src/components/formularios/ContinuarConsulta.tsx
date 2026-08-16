import { useState } from "react";

import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";

interface Propiedades {
  alResponder: (quiereContinuar: boolean) => void;
}

export default function ContinuarConsulta({ alResponder }: Propiedades) {
  const [respuesta, setRespuesta] = useState<boolean | null>(null);

  const responder = (quiereContinuar: boolean) => {
    if (respuesta !== null) {
      return;
    }

    setRespuesta(quiereContinuar);
    alResponder(quiereContinuar);
  };

  const hayRespuesta = respuesta !== null;

  const clasesBotonSi = [
    "rounded-xl border px-4 py-3 text-left font-semibold transition-colors",
    respuesta === true
      ? "border-secondary bg-secondary text-on-secondary"
      : "border-outline-variant bg-surface-container-lowest text-on-secondary-fixed",
    !hayRespuesta ? "hover:border-secondary hover:bg-secondary-container" : "",
    hayRespuesta && respuesta !== true ? "cursor-not-allowed opacity-50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const clasesBotonNo = [
    "rounded-xl border px-4 py-3 text-left font-semibold transition-colors",
    respuesta === false
      ? "border-secondary bg-secondary text-on-secondary"
      : "border-outline-variant bg-surface-container-lowest text-on-secondary-fixed",
    !hayRespuesta ? "hover:border-secondary hover:bg-secondary-container" : "",
    hayRespuesta && respuesta !== false ? "cursor-not-allowed opacity-50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <MensajeIA>
        <p className="font-semibold text-on-secondary-fixed">¿Quieres hacer otra consulta?</p>

        <p className="mt-1 text-sm text-on-surface-variant">
          Puedes consultar otra información sin perder la conversación actual.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" disabled={hayRespuesta} onClick={() => responder(true)} className={clasesBotonSi}>
            Sí, hacer otra consulta
          </button>

          <button type="button" disabled={hayRespuesta} onClick={() => responder(false)} className={clasesBotonNo}>
            No, gracias
          </button>
        </div>
      </MensajeIA>

      {respuesta === true && (
        <MensajeUsuario>
          <p className="font-semibold">Sí, quiero hacer otra consulta.</p>
        </MensajeUsuario>
      )}

      {respuesta === false && (
        <MensajeUsuario>
          <p className="font-semibold">No, gracias.</p>
        </MensajeUsuario>
      )}
    </>
  );
}