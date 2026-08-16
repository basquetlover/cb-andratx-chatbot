import type { ReactNode } from "react";

interface Propiedades {
  children: ReactNode;
}

export default function MensajeUsuario({
  children,
}: Propiedades) {
  return (
    <div
      className="my-3 flex w-full justify-end pl-10"
      aria-label="Mensaje del usuario"
    >
      <div className="rounded-usuario max-w-[85%] border-r-4 border-on-secondary-fixed  bg-secondary px-5 py-3  text-on-secondary  " >
        {/* <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary-fixed-dim">
          Tú
        </p> */}

        <div className="text-body-md">
          {children}
        </div>
      </div>
    </div>
  );
}