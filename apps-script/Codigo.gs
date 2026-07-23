/**
 * CAPILARIS & CARE — GOOGLE APPS SCRIPT WEB APP
 * Módulo 2: Integración con Google Sheets
 * 
 * INSTRUCCIONES DE INSTALACIÓN Y DESPLIEGUE:
 * 1. Crea una Hoja de Cálculo en Google Sheets (ej. "Pedidos Capilaris").
 * 2. Renombra la primera pestaña como "Pedidos".
 * 3. En la Fila 1 de "Pedidos", coloca exactamente estos encabezados en las columnas A hasta M:
 *    Columna A: Número de pedido
 *    Columna B: Fecha
 *    Columna C: Nombre
 *    Columna D: WhatsApp
 *    Columna E: Email
 *    Columna F: Ciudad
 *    Columna G: Producto
 *    Columna H: Cantidad
 *    Columna I: Precio unitario
 *    Columna J: Total
 *    Columna K: Notas
 *    Columna L: Método de pago
 *    Columna M: Estado
 * 
 * 4. Copia el ID de tu Hoja de Cálculo desde la URL:
 *    https://docs.google.com/spreadsheets/d/{{REEMPLAZAR_ESTE_ID}}/edit
 *    Y reemplázalo abajo en la constante ID_HOJA.
 * 
 * 5. Ve a Extensiones -> Apps Script en la Hoja de Cálculo, borra todo y pega este archivo completo.
 * 6. Haz clic en "Implementar" -> "Nueva implementación".
 * 7. Tipo de implementación: "Aplicación web".
 * 8. Ejecutar como: "Yo" (tu cuenta de Google).
 * 9. Quién tiene acceso: "Cualquier usuario" (Anyone).
 * 10. Haz clic en "Implementar", autoriza los permisos y copia la URL que termina en /exec.
 * 11. Pega esa URL en la variable de entorno VITE_SHEETS_ENDPOINT de tu archivo .env.
 */

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
// Reemplaza con el ID de tu hoja de cálculo
var ID_HOJA = 'TU_ID_DE_HOJA_AQUI'; 

// Opcional: Tu correo para recibir alertas inmediatas de nuevos pedidos
var CORREO_NOTIFICACION = Session.getActiveUser().getEmail();

// ============================================================================
// RECEPCIÓN DE PEDIDOS DESDE LA APP (POST)
// ============================================================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respuestaJSON({ ok: false, error: 'No se recibieron datos en el cuerpo de la petición.' });
    }

    var datos = JSON.parse(e.postData.contents);

    // 1. Validación de campos obligatorios
    var camposRequeridos = ['numero_pedido', 'nombre', 'whatsapp', 'email', 'ciudad', 'producto', 'cantidad', 'precio_unitario', 'total', 'metodo_pago'];
    for (var i = 0; i < camposRequeridos.length; i++) {
      var campo = camposRequeridos[i];
      if (datos[campo] === undefined || datos[campo] === null || datos[campo] === '') {
        return respuestaJSON({
          ok: false,
          error: 'Campo obligatorio faltante: ' + campo
        });
      }
    }

    // 2. Abrir hoja de cálculo
    var ss = SpreadsheetApp.openById(ID_HOJA);
    var hojaPedidos = ss.getSheetByName('Pedidos');

    if (!hojaPedidos) {
      return respuestaJSON({ ok: false, error: 'La pestaña "Pedidos" no existe en la hoja de cálculo.' });
    }

    // 3. Protección contra duplicados (Idempotencia)
    var numeroPedidoNuevo = String(datos.numero_pedido).trim();
    var ultimaFila = hojaPedidos.getLastRow();

    if (ultimaFila > 1) {
      // Leer valores de la Columna A (Números de Pedido)
      var numerosExistentes = hojaPedidos.getRange(2, 1, ultimaFila - 1, 1).getValues();
      for (var r = 0; r < numerosExistentes.length; r++) {
        if (String(numerosExistentes[r][0]).trim() === numeroPedidoNuevo) {
          // Ya existe registrado previamente (reintento exitoso anterior)
          return respuestaJSON({
            ok: true,
            numero_pedido: numeroPedidoNuevo,
            mensaje: 'El pedido ya estaba registrado previamente en la hoja.'
          });
        }
      }
    }

    // 4. Preparar fecha e inserción
    var fechaPedido = datos.fecha ? new Date(datos.fecha) : new Date();
    
    // Asegurar que el teléfono mantenga el prefijo con comilla simple
    var whatsappTexto = "'" + String(datos.whatsapp).replace(/^'+/, '');

    var nuevaFila = [
      numeroPedidoNuevo,
      fechaPedido,
      datos.nombre,
      whatsappTexto,
      datos.email,
      datos.ciudad,
      datos.producto,
      Number(datos.cantidad),
      Number(datos.precio_unitario),
      Number(datos.total),
      datos.notas || '',
      datos.metodo_pago,
      datos.estado || 'Pendiente de pago'
    ];

    // Insertar fila
    hojaPedidos.appendRow(nuevaFila);

    // 5. Aplicar formato automático de moneda a las columnas I (Precio Unitario) y J (Total)
    var filaInsertada = hojaPedidos.getLastRow();
    hojaPedidos.getRange(filaInsertada, 9).setNumberFormat('$#,##0');  // Columna I
    hojaPedidos.getRange(filaInsertada, 10).setNumberFormat('$#,##0'); // Columna J
    hojaPedidos.getRange(filaInsertada, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss'); // Columna B (Fecha)

    // 6. Enviar notificación por correo electrónico
    notificarPorCorreo(datos);

    return respuestaJSON({
      ok: true,
      numero_pedido: numeroPedidoNuevo,
      mensaje: 'Pedido registrado exitosamente en Google Sheets.'
    });

  } catch (err) {
    return respuestaJSON({
      ok: false,
      error: 'Error interno en Google Apps Script: ' + err.toString()
    });
  }
}

// ============================================================================
// LECTURA DE CONFIGURACIÓN Y PRUEBA DE ESTADO (GET)
// ============================================================================
function doGet(e) {
  try {
    var accion = e && e.parameter ? e.parameter.accion : '';

    if (accion === 'config') {
      var ss = SpreadsheetApp.openById(ID_HOJA);
      var hojaConfig = ss.getSheetByName('Configuración');

      if (!hojaConfig) {
        return respuestaJSON({ ok: true, config: null, mensaje: 'Sin pestaña Configuración.' });
      }

      var datosConfig = hojaConfig.getRange(1, 1, hojaConfig.getLastRow(), 2).getValues();
      var configObj = {};
      for (var i = 0; i < datosConfig.length; i++) {
        var clave = String(datosConfig[i][0]).trim();
        var valor = datosConfig[i][1];
        if (clave) {
          configObj[clave] = valor;
        }
      }

      return respuestaJSON({ ok: true, config: configObj });
    }

    return respuestaJSON({
      ok: true,
      mensaje: 'Servicio Web App de Capilaris & Care activo y listo para recibir POST.'
    });

  } catch (err) {
    return respuestaJSON({ ok: false, error: err.toString() });
  }
}

// ============================================================================
// NOTIFICACIÓN AUTOMÁTICA POR CORREO
// ============================================================================
function notificarPorCorreo(datos) {
  try {
    if (!CORREO_NOTIFICACION) return;

    var asunto = '🛍️ Nuevo pedido recibido: ' + datos.numero_pedido;
    var cuerpo = 
      'Se ha registrado un nuevo pedido en la tienda online:\n\n' +
      '📌 Número de Pedido: ' + datos.numero_pedido + '\n' +
      '👤 Cliente: ' + datos.nombre + '\n' +
      '📱 WhatsApp: ' + datos.whatsapp + '\n' +
      '✉️ Email: ' + datos.email + '\n' +
      '🏠 Ciudad / Dirección: ' + datos.ciudad + '\n\n' +
      '🛍️ Producto: ' + datos.producto + '\n' +
      '🔢 Cantidad: ' + datos.cantidad + '\n' +
      '💰 Total: $' + Number(datos.total).toLocaleString('es-CO') + ' COP\n' +
      '💳 Método de Pago: ' + datos.metodo_pago + '\n' +
      '📝 Notas: ' + (datos.notas || 'Sin notas') + '\n\n' +
      'Revisa tu Hoja de Cálculo para gestionar la entrega y seguimiento.';

    MailApp.sendEmail(CORREO_NOTIFICACION, asunto, cuerpo);
  } catch (err) {
    Logger.log('Error enviando correo de notificación: ' + err.toString());
  }
}

// ============================================================================
// HELPER PARA RESPUESTA JSON CON CABECERAS CORS
// ============================================================================
function respuestaJSON(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
