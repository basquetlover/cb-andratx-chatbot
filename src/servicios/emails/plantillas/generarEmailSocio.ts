import type {
  ContenidoEmail,
} from "../../../types/Email";

interface DatosEmailSocio {
  nombre: string;
  email: string;
  contrasena: string;
  enlace: string;
  urlEscudo?: string;
}

function escaparHtml(
  texto: string,
): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obtenerAñoActual(): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      year: "numeric",
      timeZone: "Europe/Madrid",
    },
  ).format(new Date());
}

export function generarEmailSocio({
  nombre,
  email,
  contrasena,
  enlace,
  urlEscudo =
    "https://cbandratx.es/favicon.png",
}: DatosEmailSocio): ContenidoEmail {
  const nombreSeguro =
    escaparHtml(nombre.trim());

  const emailSeguro =
    escaparHtml(email.trim());

  const contrasenaSegura =
    escaparHtml(contrasena.trim());

  const enlaceSeguro =
    escaparHtml(enlace.trim());

  const urlEscudoSegura =
    escaparHtml(urlEscudo.trim());

  const añoActual =
    obtenerAñoActual();

  const asunto =
    "Bienvenido/a como socio/a del C.B. Andratx";

  const htmlBase = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="es">
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>Bienvenido/a como socio/a del C.B. Andratx</title>
  <!--[if (mso 16)]>
    <style type="text/css">
      a {text-decoration: none;}
    </style>
  <![endif]-->
  <!--[if gte mso 9]>
    <style>
      sup {font-size: 100% !important;}
    </style>
  <![endif]-->
  <!--[if gte mso 9]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG></o:AllowPNG>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
  <![endif]-->
  <!--[if mso]>
    <xml>
      <w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word">
        <w:DontUseAdvancedTypographyReadingMail/>
      </w:WordDocument>
    </xml>
  <![endif]-->
  <style type="text/css">
    u + .body img ~ div div {
      display: none;
    }

    #outlook a {
      padding: 0;
    }

    span.MsoHyperlink,
    span.MsoHyperlinkFollowed {
      color: inherit;
      mso-style-priority: 99;
    }

    a.es-button {
      mso-style-priority: 100 !important;
      text-decoration: none !important;
    }

    a[x-apple-data-detectors],
    #MessageViewBody a {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    .es-desk-hidden {
      display: none;
      float: left;
      overflow: hidden;
      width: 0;
      max-height: 0;
      line-height: 0;
      mso-hide: all;
    }

    @media only screen and (max-width: 600px) {
      *[class="gmail-fix"] {
        display: none !important;
      }

      p,
      a {
        line-height: 150% !important;
      }

      h1,
      h1 a,
      h2,
      h2 a,
      h3,
      h3 a,
      h4,
      h4 a,
      h5,
      h5 a,
      h6,
      h6 a {
        line-height: 120% !important;
      }

      h1 {
        font-size: 40px !important;
        text-align: left;
      }

      h2 {
        font-size: 32px !important;
        text-align: left;
      }

      h3 {
        font-size: 28px !important;
        text-align: left;
      }

      h4 {
        font-size: 24px !important;
        text-align: left;
      }

      h5 {
        font-size: 20px !important;
        text-align: left;
      }

      h6 {
        font-size: 16px !important;
        text-align: left;
      }

      .es-header-body p,
      .es-header-body a,
      .es-content-body p,
      .es-content-body a,
      .es-footer-body p,
      .es-footer-body a {
        font-size: 14px !important;
      }

      .es-infoblock p,
      .es-infoblock a {
        font-size: 12px !important;
      }

      .es-m-txt-c,
      .es-m-txt-c h1,
      .es-m-txt-c h2,
      .es-m-txt-c h3,
      .es-m-txt-c h4,
      .es-m-txt-c h5,
      .es-m-txt-c h6 {
        text-align: center !important;
      }

      .es-m-txt-r,
      .es-m-txt-r h1,
      .es-m-txt-r h2,
      .es-m-txt-r h3,
      .es-m-txt-r h4,
      .es-m-txt-r h5,
      .es-m-txt-r h6 {
        text-align: right !important;
      }

      .es-m-txt-l,
      .es-m-txt-l h1,
      .es-m-txt-l h2,
      .es-m-txt-l h3,
      .es-m-txt-l h4,
      .es-m-txt-l h5,
      .es-m-txt-l h6 {
        text-align: left !important;
      }

      .es-content table,
      .es-header table,
      .es-footer table,
      .es-content,
      .es-footer,
      .es-header {
        width: 100% !important;
        max-width: 600px !important;
      }

      .adapt-img {
        width: 100% !important;
        height: auto !important;
      }

      .es-adapt-td {
        display: block !important;
        width: 100% !important;
      }

      .es-mobile-hidden,
      .es-hidden {
        display: none !important;
      }

      a.es-button,
      button.es-button {
        display: inline-block !important;
        font-size: 14px !important;
        padding: 10px 20px !important;
        line-height: 120% !important;
      }

      .img-7843 {
        width: 100px !important;
      }

      .es-m-text .es-text-mobile-size-8,
      .es-m-text .es-text-mobile-size-8 * {
        font-size: 8px !important;
      }

      .es-m-text .es-text-mobile-size-12,
      .es-m-text .es-text-mobile-size-12 * {
        font-size: 12px !important;
      }
    }

    @media screen and (max-width: 384px) {
      .mail-message-content {
        width: 414px !important;
      }
    }
  </style>
 </head>

 <body
  class="body"
  style="width:100%;height:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0"
 >
  <div
   dir="ltr"
   class="es-wrapper-color"
   lang="es"
   style="background-color:#F6F6F6"
  >
   <!--[if gte mso 9]>
    <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
      <v:fill type="tile" color="#f6f6f6"></v:fill>
    </v:background>
   <![endif]-->

   <table
    width="100%"
    cellspacing="0"
    cellpadding="0"
    class="es-wrapper"
    role="none"
    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%"
   >
    <tbody>
     <tr>
      <td
       valign="top"
       style="padding:0;Margin:0"
      >
       <table
        cellspacing="0"
        cellpadding="0"
        align="center"
        class="es-header"
        role="none"
        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%;table-layout:fixed !important;background-color:transparent"
       >
        <tbody>
         <tr>
          <td
           align="center"
           style="padding:0;Margin:0"
          >
           <table
            cellspacing="0"
            cellpadding="0"
            bgcolor="#ffffff"
            align="center"
            class="es-header-body"
            role="none"
            style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:#FFFFFF;width:600px"
           >
            <tbody>
             <tr>
              <td style="padding:0;Margin:0">
               <table
                cellspacing="0"
                cellpadding="0"
                align="center"
                bgcolor="#006688"
                role="none"
                style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:#006688;border-top:1px solid #6e797f;border-radius:20px 20px 0 0;border-right:1px solid #6e797f;border-left:1px solid #6e797f;width:600px;border-collapse:separate"
               >
                <tbody>
                 <tr>
                  <td
                   align="left"
                   style="padding:20px;Margin:0"
                  >
                   <table
                    cellspacing="0"
                    cellpadding="0"
                    width="100%"
                    role="none"
                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px"
                   >
                    <tbody>
                     <tr>
                      <td
                       valign="top"
                       align="center"
                       style="padding:0;Margin:0;width:558px"
                      >
                       <table
                        cellspacing="0"
                        cellpadding="0"
                        role="presentation"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:558px"
                       >
                        <tbody>
                         <tr>
                          <td
                           align="center"
                           style="padding:0;Margin:0;font-size:0"
                          >
                           <img
                            src="{urlEscudo}"
                            alt="C.B. Andratx"
                            width="100"
                            class="img-7843"
                            style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0"
                           >
                          </td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
              </td>
             </tr>
            </tbody>
           </table>
          </td>
         </tr>
        </tbody>
       </table>

       <table
        cellspacing="0"
        cellpadding="0"
        align="center"
        class="es-content"
        role="none"
        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%;table-layout:fixed !important"
       >
        <tbody>
         <tr>
          <td
           align="center"
           style="padding:0;Margin:0"
          >
           <table
            cellspacing="0"
            cellpadding="0"
            bgcolor="#ffffff"
            align="center"
            class="es-content-body"
            role="none"
            style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:#FFFFFF;width:600px"
           >
            <tbody>
             <tr>
              <td style="padding:0;Margin:0">
               <table
                cellspacing="0"
                cellpadding="0"
                align="center"
                role="none"
                style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-right:1px solid #6e797f;border-left:1px solid #6e797f;width:600px"
               >
                <tbody>
                 <tr>
                  <td
                   align="left"
                   style="padding:20px 20px 0;Margin:0"
                  >
                   <table
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    role="none"
                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px"
                   >
                    <tbody>
                     <tr>
                      <td
                       valign="top"
                       align="center"
                       style="padding:0;Margin:0;width:558px"
                      >
                       <table
                        cellspacing="0"
                        cellpadding="0"
                        role="presentation"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:558px"
                       >
                        <tbody>
                         <tr>
                          <td
                           align="left"
                           style="padding:0;Margin:0"
                          >
                           <h4
                            style="Margin:0;font-family:georgia, times, 'times new roman', serif;mso-line-height-rule:exactly;letter-spacing:0;font-size:24px;font-style:normal;font-weight:normal;line-height:29px;color:#333333"
                           >
                            <strong style="font-weight:bolder !important">
                             ¡Bienvenido/a, {Nombre}!
                            </strong>
                           </h4>
                          </td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
              </td>
             </tr>
            </tbody>
           </table>
          </td>
         </tr>
        </tbody>
       </table>

       <table
        cellspacing="0"
        cellpadding="0"
        align="center"
        class="es-footer"
        role="none"
        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%;table-layout:fixed !important;background-color:transparent"
       >
        <tbody>
         <tr>
          <td
           align="center"
           style="padding:0;Margin:0"
          >
           <table
            cellspacing="0"
            cellpadding="0"
            bgcolor="#ffffff"
            align="center"
            class="es-footer-body"
            role="none"
            style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:#FFFFFF;width:600px"
           >
            <tbody>
             <tr>
              <td style="padding:0;Margin:0">
               <table
                cellpadding="0"
                align="center"
                cellspacing="0"
                role="none"
                style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-right:1px solid #6e797f;border-left:1px solid #6e797f;width:600px"
               >
                <tbody>
                 <tr>
                  <td
                   align="left"
                   style="Margin:0;padding:20px"
                  >
                   <table
                    cellspacing="0"
                    cellpadding="0"
                    width="100%"
                    role="none"
                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px"
                   >
                    <tbody>
                     <tr>
                      <td
                       align="left"
                       style="padding:0;Margin:0;width:558px"
                      >
                       <table
                        cellspacing="0"
                        cellpadding="0"
                        role="presentation"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:558px"
                       >
                        <tbody>
                         <tr>
                          <td
                           align="left"
                           style="padding:0;Margin:0"
                          >
                           <p
                            style="Margin:0;mso-line-height-rule:exactly;font-family:georgia, times, 'times new roman', serif;line-height:21px;letter-spacing:0;font-weight:normal;color:#333333;font-size:14px"
                           >
                            Tu alta como socio/a ya está activa. Desde tu área privada podrás consultar y mostrar tu tarjeta digital del C.B. Andratx siempre que la necesites.
                           </p>
                          </td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
              </td>
             </tr>

             <tr>
              <td style="padding:0;Margin:0">
               <table
                cellspacing="0"
                cellpadding="0"
                align="center"
                role="none"
                style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-right:1px solid #6e797f;border-left:1px solid #6e797f;width:600px"
               >
                <tbody>
                 <tr>
                  <td
                   align="left"
                   style="padding:20px 20px 0;Margin:0"
                  >
                   <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    role="none"
                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px"
                   >
                    <tbody>
                     <tr>
                      <td
                       align="left"
                       style="padding:0;Margin:0;width:558px"
                      >
                       <table
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:558px"
                       >
                        <tbody>
                         <tr>
                          <td
                           align="left"
                           style="padding:0;Margin:0"
                          >
                           <h5
                            style="Margin:0;font-family:georgia, times, 'times new roman', serif;mso-line-height-rule:exactly;letter-spacing:0;font-size:20px;font-style:normal;font-weight:normal;line-height:24px;color:#333333"
                           >
                            Tus credenciales de acceso
                           </h5>

                           <p
                            style="Margin:0;mso-line-height-rule:exactly;font-family:georgia, times, 'times new roman', serif;line-height:21px;letter-spacing:0;font-weight:normal;color:#333333;font-size:14px"
                           >
                            Utiliza estos datos para entrar y ver tu tarjeta.
                           </p>
                          </td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
              </td>
             </tr>

             <tr>
              <td style="padding:0;Margin:0">
               <table
                cellspacing="0"
                cellpadding="0"
                align="center"
                role="none"
                style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-right:1px solid #6e797f;border-left:1px solid #6e797f;width:600px"
               >
                <tbody>
                 <tr>
                  <td
                   align="left"
                   style="Margin:0;padding:5px 20px 20px"
                  >
                   <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    role="none"
                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px"
                   >
                    <tbody>
                     <tr>
                      <td
                       align="left"
                       style="padding:0;Margin:0;width:558px"
                      >
                       <table
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:558px"
                       >
                        <tbody>
                         <tr>
                          <td
                           align="left"
                           style="padding:0;Margin:0"
                          >
                           <table
                            cellpadding="0"
                            cellspacing="0"
                            class="es-table"
                            role="presentation"
                            style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%"
                           >
                            <tbody>
                             <tr>
                              <td
                               style="Margin:0;border-width:1px;border-style:solid;border-color:#6e797f;width:187px;background-color:#b0dff3;padding:10px;border-radius:15px 0 0 0"
                              >
                               <p
                                style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;letter-spacing:0;font-weight:normal;color:#333333;font-size:14px"
                               >
                                <strong style="font-weight:bolder !important">
                                 Correo electrónico
                                </strong>
                               </p>
                              </td>

                              <td
                               style="Margin:0;border-width:1px;border-style:solid;border-color:#6e797f;background-color:#ffffff;padding:10px;border-radius:0 15px 0 0"
                              >
                               <p
                                style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;letter-spacing:0;font-weight:normal;color:#333333;font-size:14px"
                               >
                                {email}
                               </p>
                              </td>
                             </tr>

                             <tr>
                              <td
                               style="Margin:0;border-width:1px;border-style:solid;border-color:#6e797f;width:187px;background-color:#b0dff3;padding:10px;border-radius:0 0 0 15px"
                              >
                               <p
                                style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;letter-spacing:0;font-weight:normal;color:#333333;font-size:14px"
                               >
                                <strong style="font-weight:bolder !important">
                                 Contraseña
                                </strong>
                               </p>
                              </td>

                              <td
                               style="Margin:0;border-width:1px;border-style:solid;border-color:#6e797f;background-color:#ffffff;padding:10px;border-radius:0 0 15px 0"
                              >
                               <p
                                style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;letter-spacing:0;font-weight:normal;color:#333333;font-size:14px"
                               >
                                {contrasena}
                               </p>
                              </td>
                             </tr>
                            </tbody>
                           </table>
                          </td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
              </td>
             </tr>

             <tr>
              <td style="padding:0;Margin:0">
               <table
                align="center"
                cellspacing="0"
                cellpadding="0"
                role="none"
                style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-right:1px solid #6e797f;border-left:1px solid #6e797f;width:600px"
               >
                <tbody>
                 <tr>
                  <td
                   align="left"
                   style="Margin:0;padding:10px 20px"
                  >
                   <table
                    cellspacing="0"
                    width="100%"
                    cellpadding="0"
                    role="none"
                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px"
                   >
                    <tbody>
                     <tr>
                      <td
                       align="left"
                       style="padding:0;Margin:0;width:558px"
                      >
                       <table
                        role="presentation"
                        cellpadding="0"
                        cellspacing="0"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:558px"
                       >
                        <tbody>
                         <tr>
                          <td
                           align="center"
                           style="padding:0;Margin:0"
                          >
                           <!--[if mso]>
                            <a href="{enlace}" target="_blank" hidden>
                             <v:roundrect
                              xmlns:v="urn:schemas-microsoft-com:vml"
                              xmlns:w="urn:schemas-microsoft-com:office:word"
                              href="{enlace}"
                              style="height:46px;v-text-anchor:middle;width:231px"
                              arcsize="33%"
                              strokecolor="#002a40"
                              strokeweight="2px"
                              fillcolor="#54c5f8"
                             >
                              <w:anchorlock></w:anchorlock>
                              <center
                               style="color:#002a40;font-family:arial, 'helvetica neue', helvetica, sans-serif;font-size:14px;font-weight:700;line-height:14px"
                              >
                               Ver mi tarjeta de socio
                              </center>
                             </v:roundrect>
                            </a>
                           <![endif]-->

                           <!--[if !mso]><!-- -->
                            <span
                             class="es-button-border msohide"
                             style="border-style:solid;border-color:#002a40;background:#54c5f8;border-width:0 0 2px 0;display:inline-block;border-radius:15px;width:auto;mso-hide:all"
                            >
                             <a
                              href="{enlace}"
                              target="_blank"
                              class="es-button"
                              style="mso-style-priority:100 !important;text-decoration:none !important;mso-line-height-rule:exactly;color:#002a40;font-size:14px;font-weight:bold;padding:15px 30px;display:inline-block;background:#54c5f8;border-radius:15px;font-family:arial, 'helvetica neue', helvetica, sans-serif;font-style:normal;line-height:17px;width:auto;text-align:center;letter-spacing:0;mso-padding-alt:0;mso-border-alt:10px solid #54c5f8;text-transform:none"
                             >
                              Ver mi tarjeta de socio
                             </a>
                            </span>
                           <!--<![endif]-->
                          </td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
              </td>
             </tr>

             <tr>
              <td style="padding:0;Margin:0">
               <table
                cellspacing="0"
                cellpadding="0"
                align="center"
                role="none"
                style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-right:1px solid #6e797f;border-left:1px solid #6e797f;width:600px"
               >
                <tbody>
                 <tr>
                  <td
                   align="left"
                   style="padding:20px 20px 0;Margin:0"
                  >
                   <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    role="none"
                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px"
                   >
                    <tbody>
                     <tr>
                      <td
                       align="left"
                       style="padding:0;Margin:0;width:558px"
                      >
                       <table
                        cellspacing="0"
                        role="presentation"
                        cellpadding="0"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:558px"
                       >
                        <tbody>
                         <tr>
                          <td
                           align="center"
                           class="es-m-text"
                           style="padding:0;Margin:0"
                          >
                           <p
                            class="es-text-mobile-size-12"
                            style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:18px;letter-spacing:0;font-weight:normal;color:#333333;font-size:12px"
                           >
                            Si el botón no funciona, copia este enlace:
                           </p>

                           <p
                            class="es-text-mobile-size-12"
                            style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:18px;letter-spacing:0;font-weight:normal;color:#333333;font-size:12px"
                           >
                            <a
                             target="_blank"
                             href="{enlace}"
                             style="mso-line-height-rule:exactly;text-decoration:underline;color:#1376C8;font-size:12px;font-weight:inherit"
                            >
                             {enlace}
                            </a>
                           </p>
                          </td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
              </td>
             </tr>

             <tr>
              <td style="padding:0;Margin:0">
               <table
                cellspacing="0"
                cellpadding="0"
                align="center"
                role="none"
                style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;border-radius:0 0 20px 20px;border-right:1px solid #6e797f;border-left:1px solid #6e797f;width:600px;border-collapse:separate;border-bottom:1px solid #6e797f"
               >
                <tbody>
                 <tr>
                  <td
                   align="left"
                   style="padding:20px;Margin:0"
                  >
                   <table
                    cellspacing="0"
                    width="100%"
                    cellpadding="0"
                    role="none"
                    style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px"
                   >
                    <tbody>
                     <tr>
                      <td
                       align="left"
                       style="padding:0;Margin:0;width:558px"
                      >
                       <table
                        cellspacing="0"
                        role="presentation"
                        cellpadding="0"
                        style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:558px"
                       >
                        <tbody>
                         <tr>
                          <td
                           align="center"
                           class="es-m-text"
                           style="padding:10px 0 0;Margin:0"
                          >
                           <p
                            class="es-m-txt-c"
                            style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;letter-spacing:0;font-weight:normal;color:#6e797f;font-size:14px"
                           >
                            © {año}&nbsp;C.B. Andratx
                           </p>

                           <p
                            class="es-m-txt-c es-text-mobile-size-8"
                            style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:12px;letter-spacing:0;font-weight:normal;color:#6e797f;font-size:8px"
                           >
                            <br>
                           </p>

                           <p
                            class="es-m-txt-c es-text-mobile-size-8"
                            style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:12px;letter-spacing:0;font-weight:normal;color:#6e797f;font-size:8px"
                           >
                            Has recibido este correo porque se ha activado tu cuenta de socio/a.
                           </p>
                          </td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
              </td>
             </tr>
            </tbody>
           </table>
          </td>
         </tr>
        </tbody>
       </table>
      </td>
     </tr>
    </tbody>
   </table>
  </div>
 </body>
</html>
  `.trim();

  const html =
    htmlBase
      .replaceAll(
        "{Nombre}",
        nombreSeguro,
      )
      .replaceAll(
        "{email}",
        emailSeguro,
      )
      .replaceAll(
        "{contrasena}",
        contrasenaSegura,
      )
      .replaceAll(
        "{enlace}",
        enlaceSeguro,
      )
      .replaceAll(
        "{urlEscudo}",
        urlEscudoSegura,
      )
      .replaceAll(
        "{año}",
        añoActual,
      );

  return {
    asunto,
    html,
  };
}