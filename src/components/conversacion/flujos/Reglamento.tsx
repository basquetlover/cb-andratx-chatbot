import MensajeIA from "@components/MensajeIA";

interface Propiedades {
  alCompletar: () => void;
}

// Pega aquí el enlace a la página del reglamento.
const URL_REGLAMENTO_FBIB = "https://www.fbib.es/documents/24";

// Imagen ubicada en public/imagenes/fbib.png.
const LOGO_FBIB = "/img/logo-fbib.svg";

export default function Reglamento({ alCompletar }: Propiedades) {
  const enlace = URL_REGLAMENTO_FBIB.trim();

  return (
    <MensajeIA>
        <p className="font-semibold text-on-secondary-fixed">
        Reglamento de las competiciones de la FBIB
        </p>

        <p className="mt-1 text-sm text-on-surface-variant">
        Consulta el reglamento aplicable a las competiciones de ámbito
        balear de la Federació de Bàsquet de les Illes Balears (FBIB).
        </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
          <div className="flex h-24 w-40 items-center justify-center rounded-xl bg-white p-3">
            <img
              src={LOGO_FBIB}
              alt="FBIB"
              className="h-full w-full object-contain"
              decoding="async"
            />
          </div>

          <p className="font-semibold text-on-secondary-fixed">
            Federació de Bàsquet de les Illes Balears
          </p>

            <p className="text-sm text-on-surface-variant">
            Accede a la normativa y al reglamento que se aplican en las
            competiciones organizadas por la FBIB en las Illes Balears.
            </p>

          {enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => alCompletar()}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary transition-colors hover:bg-on-secondary-fixed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Consultar reglamento

              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 3h7v7M21 3 10 14" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
            </a>
          ) : (
            <>
              <p className="text-sm text-on-surface-variant">
                El enlace al reglamento todavía no está disponible.
              </p>

              <button
                type="button"
                onClick={() => alCompletar()}
                className="mt-2 rounded-full border border-secondary px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary"
              >
                Continuar
              </button>
            </>
          )}
        </div>

        {enlace && (
          <p className="border-t border-outline-variant px-4 py-3 text-center text-xs text-on-surface-variant">
            Se abrirá la web oficial de la FBIB en una nueva pestaña.
          </p>
        )}
      </div>
    </MensajeIA>
  );
}