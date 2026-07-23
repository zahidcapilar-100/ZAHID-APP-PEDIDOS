/**
 * CAPILARIS & CARE — GOOGLE APPS SCRIPT WEB APP (MÓDULO 3)
 * Integración bidireccional con Google Sheets (Base de Datos Única) y Panel de Administración
 * 
 * INSTRUCCIONES DE CONFIGURACIÓN DE LA CLAVE DE ADMINISTRACIÓN:
 * 1. En la ventana de Apps Script, ve a "Configuración del proyecto" (icono de engranaje a la izquierda).
 * 2. En la sección "Propiedades del script", haz clic en "Añadir propiedad del script".
 * 3. Nombre (Propiedad): CLAVE_ADMIN
 * 4. Valor: Tu clave secreta deseada (ej. Capilaris2026* Admin).
 * 5. Haz clic en "Guardar propiedades del script".
 * 6. Publica/Implementa como Aplicación Web:
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario (Anyone)
 */

// ============================================================================
// OBTENER Y VALIDAR CLAVE ADMIN
// ============================================================================
function obtenerClaveAdmin() {
  var props = PropertiesService.getScriptProperties();
  var clave = props.getProperty('CLAVE_ADMIN');
  if (!clave) {
    // Clave predeterminada si no se ha configurado la propiedad del script
    clave = 'admin123';
    props.setProperty('CLAVE_ADMIN', clave);
  }
  return clave;
}

function esClaveValida(claveProporcionada) {
  if (!claveProporcionada) return false;
  var claveReal = obtenerClaveAdmin();
  return String(claveProporcionada).trim() === String(claveReal).trim();
}

// Helper para obtener una pestaña por nombre o crearla con sus encabezados
function obtenerOCrearHoja(ss, nombreHoja, encabezadosPorDefecto) {
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) {
    hoja = ss.insertSheet(nombreHoja);
    if (encabezadosPorDefecto && encabezadosPorDefecto.length > 0) {
      hoja.appendRow(encabezadosPorDefecto);
      hoja.getRange(1, 1, 1, encabezadosPorDefecto.length).setFontWeight('bold');
    }
  }
  return hoja;
}

// ============================================================================
// RECEPCIÓN DE SOLICITUDES POST
// ============================================================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respuestaJSON({ ok: false, error: 'No se recibieron datos en el cuerpo de la petición.' });
    }

    var datos = JSON.parse(e.postData.contents);
    var accion = datos.accion || (datos.numero_pedido ? 'crear_pedido' : '');

    // Acciones públicas (No requieren clave)
    if (accion === 'crear_pedido') {
      return crearPedido(datos);
    }

    // Acciones administrativas (Exigen clave_admin)
    if (!esClaveValida(datos.clave)) {
      return respuestaJSON({ ok: false, error: 'no_autorizado', mensaje: 'Clave de administración incorrecta o no proporcionada.' }, 401);
    }

    if (accion === 'actualizar_estado') {
      return actualizarEstadoPedido(datos);
    } else if (accion === 'actualizar_notas') {
      return actualizarNotasPedido(datos);
    } else if (accion === 'guardar_producto') {
      return guardarProducto(datos);
    } else if (accion === 'eliminar_producto') {
      return eliminarProducto(datos);
    } else if (accion === 'guardar_config') {
      return guardarConfiguracion(datos);
    } else if (accion === 'cambiar_clave') {
      return cambiarClaveAdmin(datos);
    } else {
      return respuestaJSON({ ok: false, error: 'Acción POST no reconocida: ' + accion });
    }

  } catch (err) {
    return respuestaJSON({ ok: false, error: 'Error procesando solicitud POST: ' + err.toString() });
  }
}

// ============================================================================
// RECEPCIÓN DE SOLICITUDES GET
// ============================================================================
function doGet(e) {
  try {
    var accion = e && e.parameter ? e.parameter.accion : '';
    var clave = e && e.parameter ? e.parameter.clave : '';

    // 1. Validar acceso de prueba / Login
    if (accion === 'login' || accion === 'validar_clave') {
      if (esClaveValida(clave)) {
        return respuestaJSON({ ok: true, mensaje: 'Acceso concedido.' });
      } else {
        return respuestaJSON({ ok: false, error: 'no_autorizado' }, 401);
      }
    }

    // 2. Cargar lista de productos públicos (Sin clave requerida para el formulario de compra)
    if (accion === 'productos') {
      return obtenerProductosPublicos();
    }

    // 3. Cargar configuración pública
    if (accion === 'config_publica') {
      return obtenerConfiguracion(false);
    }

    // ------------------------------------------------------------------------
    // RUTA ADMIN EXIGEN CLAVE
    // ------------------------------------------------------------------------

    if (accion === 'pedidos' || accion === 'productos_admin' || accion === 'config') {
      if (!esClaveValida(clave)) {
        return respuestaJSON({ ok: false, error: 'no_autorizado' }, 401);
      }

      if (accion === 'pedidos') {
        return obtenerPedidosAdmin();
      } else if (accion === 'productos_admin') {
        return obtenerProductosAdmin();
      } else if (accion === 'config') {
        return obtenerConfiguracion(true);
      }
    }

    return respuestaJSON({
      ok: true,
      mensaje: 'Servidor Capilaris & Care (Apps Script Web App) en línea.'
    });

  } catch (err) {
    return respuestaJSON({ ok: false, error: err.toString() });
  }
}

// ============================================================================
// FUNCIONES DE PEDIDOS
// ============================================================================

function crearPedido(datos) {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var encabezados = [
    'Número de pedido', 'Fecha', 'Nombre', 'WhatsApp', 'Email', 'Ciudad',
    'Producto', 'Cantidad', 'Precio unitario', 'Total', 'Notas',
    'Método de pago', 'Estado', 'Notas internas'
  ];
  var hoja = obtenerOCrearHoja(ss, 'Pedidos', encabezados);

  var numeroPedido = String(datos.numero_pedido).trim();
  var dataMatriz = hoja.getDataRange().getValues();

  // Verificación de duplicados
  for (var r = 1; r < dataMatriz.length; r++) {
    if (String(dataMatriz[r][0]).trim() === numeroPedido) {
      return respuestaJSON({
        ok: true,
        numero_pedido: numeroPedido,
        mensaje: 'El pedido ya estaba registrado previamente.'
      });
    }
  }

  var fechaPedido = datos.fecha ? new Date(datos.fecha) : new Date();
  var whatsappTexto = "'" + String(datos.whatsapp || '').replace(/^'+/, '');

  var fila = [
    numeroPedido,
    fechaPedido,
    datos.nombre || '',
    whatsappTexto,
    datos.email || '',
    datos.ciudad || '',
    datos.producto || '',
    Number(datos.cantidad || 1),
    Number(datos.precio_unitario || 0),
    Number(datos.total || 0),
    datos.notas || '',
    datos.metodo_pago || 'Transferencia',
    datos.estado || 'Pendiente de pago',
    '' // Notas internas por defecto vacías
  ];

  hoja.appendRow(fila);
  var ultimaFila = hoja.getLastRow();

  // Formato
  hoja.getRange(ultimaFila, 9).setNumberFormat('$#,##0');  // Precio unitario
  hoja.getRange(ultimaFila, 10).setNumberFormat('$#,##0'); // Total
  hoja.getRange(ultimaFila, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');

  return respuestaJSON({
    ok: true,
    numero_pedido: numeroPedido,
    mensaje: 'Pedido registrado en Google Sheets.'
  });
}

function obtenerPedidosAdmin() {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var hoja = ss.getSheetByName('Pedidos');

  if (!hoja) {
    return respuestaJSON({ ok: true, pedidos: [] });
  }

  var matriz = hoja.getDataRange().getValues();
  if (matriz.length <= 1) {
    return respuestaJSON({ ok: true, pedidos: [] });
  }

  var pedidos = [];
  // Fila 0 es el encabezado
  for (var i = matriz.length - 1; i >= 1; i--) {
    var row = matriz[i];
    if (!row[0]) continue; // Saltar filas vacías

    var fechaFormatted = row[1] instanceof Date ? row[1].toISOString() : String(row[1]);

    pedidos.push({
      numero_pedido: String(row[0]),
      fecha: fechaFormatted,
      nombre: String(row[2] || ''),
      whatsapp: String(row[3] || '').replace(/^'/, ''),
      email: String(row[4] || ''),
      ciudad: String(row[5] || ''),
      producto: String(row[6] || ''),
      cantidad: Number(row[7] || 1),
      precio_unitario: Number(row[8] || 0),
      total: Number(row[9] || 0),
      notas: String(row[10] || ''),
      metodo_pago: String(row[11] || 'Transferencia'),
      estado: String(row[12] || 'Pendiente de pago'),
      notas_internas: String(row[13] || '')
    });
  }

  return respuestaJSON({ ok: true, pedidos: pedidos });
}

function actualizarEstadoPedido(datos) {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var hoja = ss.getSheetByName('Pedidos');

  if (!hoja) return respuestaJSON({ ok: false, error: 'No existe la pestaña Pedidos.' });

  var numeroBuscado = String(datos.numero_pedido).trim();
  var nuevoEstado = String(datos.estado).trim();

  var matriz = hoja.getDataRange().getValues();
  var filaEncontrada = -1;

  for (var i = 1; i < matriz.length; i++) {
    if (String(matriz[i][0]).trim() === numeroBuscado) {
      filaEncontrada = i + 1; // 1-based index
      break;
    }
  }

  if (filaEncontrada === -1) {
    return respuestaJSON({ ok: false, error: 'Pedido no encontrado: ' + numeroBuscado });
  }

  // Columna M (13) es Estado
  hoja.getRange(filaEncontrada, 13).setValue(nuevoEstado);

  return respuestaJSON({ ok: true, numero_pedido: numeroBuscado, estado: nuevoEstado });
}

function actualizarNotasPedido(datos) {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var hoja = ss.getSheetByName('Pedidos');

  if (!hoja) return respuestaJSON({ ok: false, error: 'No existe la pestaña Pedidos.' });

  var numeroBuscado = String(datos.numero_pedido).trim();
  var nuevasNotas = String(datos.notas_internas || '').trim();

  // Asegurar encabezado "Notas internas" en Columna N (14)
  var encabezadoNotas = hoja.getRange(1, 14).getValue();
  if (!encabezadoNotas) {
    hoja.getRange(1, 14).setValue('Notas internas').setFontWeight('bold');
  }

  var matriz = hoja.getDataRange().getValues();
  var filaEncontrada = -1;

  for (var i = 1; i < matriz.length; i++) {
    if (String(matriz[i][0]).trim() === numeroBuscado) {
      filaEncontrada = i + 1;
      break;
    }
  }

  if (filaEncontrada === -1) {
    return respuestaJSON({ ok: false, error: 'Pedido no encontrado: ' + numeroBuscado });
  }

  hoja.getRange(filaEncontrada, 14).setValue(nuevasNotas);

  return respuestaJSON({ ok: true, numero_pedido: numeroBuscado, notas_internas: nuevasNotas });
}

// ============================================================================
// FUNCIONES DE PRODUCTOS
// ============================================================================

function obtenerProductosPublicos() {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var hoja = ss.getSheetByName('Productos');

  if (!hoja) {
    return respuestaJSON({ ok: true, productos: [] });
  }

  var matriz = hoja.getDataRange().getValues();
  if (matriz.length <= 1) return respuestaJSON({ ok: true, productos: [] });

  var productos = [];
  for (var i = 1; i < matriz.length; i++) {
    var nombre = String(matriz[i][0] || '').trim();
    var precio = Number(matriz[i][1] || 0);
    var activoVal = String(matriz[i][2]).toLowerCase().trim();

    var esActivo = activoVal === 'true' || activoVal === 'si' || activoVal === 'sí' || activoVal === '1';

    if (nombre && esActivo) {
      productos.push({
        id: 'prod-' + i,
        nombre: nombre,
        precio: precio,
        activo: true
      });
    }
  }

  return respuestaJSON({ ok: true, productos: productos });
}

function obtenerProductosAdmin() {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var encabezados = ['Nombre', 'Precio', 'Activo'];
  var hoja = obtenerOCrearHoja(ss, 'Productos', encabezados);

  var matriz = hoja.getDataRange().getValues();
  var productos = [];

  for (var i = 1; i < matriz.length; i++) {
    var nombre = String(matriz[i][0] || '').trim();
    if (!nombre) continue;

    var precio = Number(matriz[i][1] || 0);
    var activoVal = String(matriz[i][2]).toLowerCase().trim();
    var esActivo = activoVal === 'true' || activoVal === 'si' || activoVal === 'sí' || activoVal === '1';

    productos.push({
      id: 'prod-' + i,
      nombre: nombre,
      precio: precio,
      activo: esActivo
    });
  }

  return respuestaJSON({ ok: true, productos: productos });
}

function guardarProducto(datos) {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var encabezados = ['Nombre', 'Precio', 'Activo'];
  var hoja = obtenerOCrearHoja(ss, 'Productos', encabezados);

  var nombre = String(datos.nombre || '').trim();
  var originalNombre = String(datos.original_nombre || nombre).trim();
  var precio = Number(datos.precio || 0);
  var activo = datos.activo ? 'TRUE' : 'FALSE';

  if (!nombre) {
    return respuestaJSON({ ok: false, error: 'El nombre del producto es obligatorio.' });
  }

  var matriz = hoja.getDataRange().getValues();
  var filaEncontrada = -1;

  for (var i = 1; i < matriz.length; i++) {
    var currentNombre = String(matriz[i][0] || '').trim();
    if (currentNombre === originalNombre || currentNombre === nombre) {
      filaEncontrada = i + 1;
      break;
    }
  }

  if (filaEncontrada > -1) {
    // Actualizar producto existente
    hoja.getRange(filaEncontrada, 1).setValue(nombre);
    hoja.getRange(filaEncontrada, 2).setValue(precio).setNumberFormat('$#,##0');
    hoja.getRange(filaEncontrada, 3).setValue(activo);
  } else {
    // Crear nuevo producto
    hoja.appendRow([nombre, precio, activo]);
    var newRow = hoja.getLastRow();
    hoja.getRange(newRow, 2).setNumberFormat('$#,##0');
  }

  return respuestaJSON({ ok: true, mensaje: 'Producto guardado con éxito.' });
}

function eliminarProducto(datos) {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var hoja = ss.getSheetByName('Productos');

  if (!hoja) return respuestaJSON({ ok: false, error: 'No existe la pestaña Productos.' });

  var nombre = String(datos.nombre || '').trim();
  var matriz = hoja.getDataRange().getValues();

  for (var i = 1; i < matriz.length; i++) {
    if (String(matriz[i][0] || '').trim() === nombre) {
      hoja.deleteRow(i + 1);
      return respuestaJSON({ ok: true, mensaje: 'Producto eliminado.' });
    }
  }

  return respuestaJSON({ ok: false, error: 'Producto no encontrado.' });
}

// ============================================================================
// FUNCIONES DE CONFIGURACIÓN
// ============================================================================

function obtenerConfiguracion(esAdmin) {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var encabezados = ['Clave', 'Valor'];
  var hoja = obtenerOCrearHoja(ss, 'Configuración', encabezados);

  var matriz = hoja.getDataRange().getValues();
  var configObj = {};

  for (var i = 1; i < matriz.length; i++) {
    var clave = String(matriz[i][0] || '').trim();
    var valor = String(matriz[i][1] || '').trim();
    if (clave) {
      configObj[clave] = valor;
    }
  }

  return respuestaJSON({ ok: true, config: configObj });
}

function guardarConfiguracion(datos) {
  var idHoja = obtenerIdHoja();
  var ss = SpreadsheetApp.openById(idHoja);
  var encabezados = ['Clave', 'Valor'];
  var hoja = obtenerOCrearHoja(ss, 'Configuración', encabezados);

  var configMap = datos.config || {};
  var keysToUpdate = Object.keys(configMap);

  var matriz = hoja.getDataRange().getValues();
  var existingKeysMap = {};

  for (var i = 1; i < matriz.length; i++) {
    var keyInRow = String(matriz[i][0] || '').trim();
    if (keyInRow) {
      existingKeysMap[keyInRow] = i + 1; // Row index 1-based
    }
  }

  for (var k = 0; k < keysToUpdate.length; k++) {
    var kName = keysToUpdate[k];
    var kVal = String(configMap[kName] || '');

    if (existingKeysMap[kName]) {
      // Actualizar celda existente
      hoja.getRange(existingKeysMap[kName], 2).setValue(kVal);
    } else {
      // Insertar nueva fila de configuración
      hoja.appendRow([kName, kVal]);
    }
  }

  return respuestaJSON({ ok: true, mensaje: 'Configuración actualizada en Google Sheets.' });
}

function cambiarClaveAdmin(datos) {
  var nuevaClave = String(datos.nueva_clave || '').trim();
  if (!nuevaClave || nuevaClave.length < 4) {
    return respuestaJSON({ ok: false, error: 'La nueva clave debe tener al menos 4 caracteres.' });
  }

  PropertiesService.getScriptProperties().setProperty('CLAVE_ADMIN', nuevaClave);

  return respuestaJSON({ ok: true, mensaje: 'Clave de administración actualizada exitosamente.' });
}

// ============================================================================
// HELPERS AUXILIARES
// ============================================================================

function obtenerIdHoja() {
  // Intenta leer de Script Properties o usa la ID actual del contenedor
  var props = PropertiesService.getScriptProperties();
  var idGuardada = props.getProperty('ID_HOJA');
  if (idGuardada) return idGuardada;

  try {
    return SpreadsheetApp.getActiveSpreadsheet().getId();
  } catch (err) {
    throw new Error('Debes configurar la propiedad ID_HOJA en las Propiedades del Script o asociar el script a la hoja.');
  }
}

function respuestaJSON(objeto, codigoHttp) {
  var output = ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
