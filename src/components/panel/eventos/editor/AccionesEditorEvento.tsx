interface Propiedades {
  modo: "crear" | "editar";

  estadoEvento:
    | "borrador"
    | "publicado"
    | "cancelado"
    | "archivado";

  guardando: boolean;
  eliminando?: boolean;
  modificado: boolean;

  puedeEliminar?: boolean;

  alGuardarBorrador: () => void;
  alPublicar: () => void;
  alCancelarCambios: () => void;
  alEliminar?: () => void;
}

export default function AccionesEditorEvento({
  modo,
  estadoEvento,
  guardando,
  eliminando = false,
  modificado,
  puedeEliminar = false,
  alGuardarBorrador,
  alPublicar,
  alCancelarCambios,
  alEliminar,
}: Propiedades) {
  const ocupado =
    guardando || eliminando;

  const publicado =
    estadoEvento === "publicado";

  const archivado =
    estadoEvento === "archivado";

  return (
    <section className=" bottom-3 z-20 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/95 p-4 shadow-xl backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface">
            {modo === "crear"
              ? "Nuevo evento"
              : modificado
                ? "Hay cambios sin guardar"
                : "Todos los cambios están guardados"}
          </p>

          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            {modo === "crear"
              ? "Puedes guardarlo como borrador o publicarlo directamente."
              : modificado
                ? "Guarda los cambios antes de abandonar esta página."
                : publicado
                  ? "El evento está publicado."
                  : archivado
                    ? "El evento está archivado y oculto en la web pública."
                    : "El evento no está publicado actualmente."}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          {modo === "editar" &&
            puedeEliminar &&
            alEliminar && (
              <button
                type="button"
                onClick={alEliminar}
                disabled={ocupado}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-error px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                {eliminando ? (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-error/30 border-t-error"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
                    style={{
                      maskImage:
                        "url('/iconos/panel/eliminar.svg')",

                      WebkitMaskImage:
                        "url('/iconos/panel/eliminar.svg')",
                    }}
                    aria-hidden="true"
                  />
                )}

                {eliminando
                  ? "Eliminando..."
                  : "Eliminar evento"}
              </button>
            )}

          <button
            type="button"
            onClick={
              alCancelarCambios
            }
            disabled={
              ocupado ||
              (
                modo === "editar" &&
                !modificado
              )
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            {modo === "crear"
              ? "Limpiar formulario"
              : "Descartar cambios"}
          </button>

          <button
            type="button"
            onClick={
              alGuardarBorrador
            }
            disabled={
              ocupado ||
              (
                modo === "editar" &&
                !modificado &&
                estadoEvento ===
                  "borrador"
              )
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                aria-hidden="true"
              />
            ) : (
              <span
                className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/guardar.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/guardar.svg')",
                }}
                aria-hidden="true"
              />
            )}

            Guardar borrador
          </button>

          <button
            type="button"
            onClick={alPublicar}
            disabled={
              ocupado ||
              (
                modo === "editar" &&
                !modificado &&
                publicado
              )
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-on-primary shadow-sm transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
                aria-hidden="true"
              />
            ) : (
              <span
                className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/correcto.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/correcto.svg')",
                }}
                aria-hidden="true"
              />
            )}

            {publicado
              ? "Guardar y mantener publicado"
              : "Guardar y publicar"}
          </button>
        </div>
      </div>
    </section>
  );
}