import type { ReactNode } from "react";

interface PropiedadesMensajeIA {
  children: ReactNode;
}

export default function MensajeIA({
  children,
}: PropiedadesMensajeIA) {
  return (
    <div className="max-w-96 max-md:max-w-76 space-y-2 bg-primary-fixed/50 border-l-4 border-primary p-4 h-auto rounded-ia text-on-secondary-fixed-variant">
      {children}
    </div>
  );
}