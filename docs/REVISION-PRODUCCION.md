# FempApp: revisión para uso real en octubre de 2026

Revisión: 10 de septiembre de 2026. Código de referencia: `luisoguti09/SkateManagerLocal`, rama `develop`, commit `39f52a5b804b94698b0d376d4b15bc924c41d106`, más los ocho archivos de registro y servicios adjuntados por Iván.

## Conclusión

No está verificada la aptitud para abrir el registro masivo. Se encontraron fallos funcionales y controles de acceso incompletos en el código revisado. El frontend local usa la API Railway develop existente. No se cambió SERVER_API, no se escribió en Railway ni se publicó ningún cambio durante esta revisión.

Esta revisión es de código y de comportamientos aislados. No certifica el estado del repositorio separado de producción, ni que Railway esté ejecutando exactamente este commit. Las correcciones adjuntas constituyen un primer lote de frontend; no resuelven los bloqueos del backend que se enumeran a continuación.

## Resuelto previamente

- Origen de categoría y selector de clubes/sedes en Mi perfil.
- Bordes internos de Mi perfil: verificados visualmente por Iván y subidos en `39f52a5`.
- Unificación confirmada en la base develop: Maipú ID 1 con 66 registros de padrón y dos perfiles; Guaymallén ID 2 con 77 registros de padrón. IDs 6 y 19 desactivados. No se modificó la base separada de producción.

## Lote adjunto: registro y cierre de sesión

Archivos para reemplazar:

| Archivo | Destino en FempApp |
|---|---|
| registro.component.ts | src/app/components/registro/registro.component.ts |
| registro.component.html | src/app/components/registro/registro.component.html |
| registro.component.scss | src/app/components/registro/registro.component.scss |
| auth.service.ts | src/app/services/auth.service.ts |

Cambios:

- La búsqueda de DNI libera el indicador de carga tanto al terminar como al fallar; permite reintentar.
- Los errores de búsqueda y de cuenta existente se muestran aunque esté oculto el formulario final.
- Cambiar el DNI invalida los datos de la consulta anterior. Una respuesta tardía no rellena otro DNI.
- Se limpian datos personales y club al hacer una nueva búsqueda.
- Se evita guardar un club seleccionado anteriormente si luego se escribe otro texto.
- La carga de clubes y roles muestra errores y permite reintentar.
- Se valida el formulario antes de enviar y se evita enviar dos veces mientras la primera petición está pendiente.
- Se completa el nombre desde el padrón y se muestra el campo de categoría/nivel cuando es requerido. Antes había validadores sobre campos ocultos y guardar() no comprobaba form.invalid.
- Se elimina la edad fija de 14 años. Se solicita la edad actual tanto a personas del padrón como a nuevas personas; no se agrega una columna ni se inventa una fecha de nacimiento.
- Los estilos de registro quedan limitados a su contenedor; sus paneles desplegables tienen clases propias. Los estilos anteriores podían modificar inputs, iconos y listas de otras pantallas.
- Al salir se limpian el usuario almacenado y el observable de sesión, además del token y rol.
- Se conserva la política existente de selección de roles. Su autorización en el backend requiere el trabajo prioritario siguiente.

Validación realizada: 10 comprobaciones de comportamiento con formularios reales de Angular 18 y RxJS, servicios simulados, análisis del template con el compilador Angular 18 y compilación SCSS. Casos: error de búsqueda, DNI existente, cambio de DNI, respuesta tardía, cambio de club, carga tardía de clubes, validación/contraseñas, edad declarada/envío único, reintento de guardado y limpieza de sesión. No se ejecutó el build completo de la aplicación ni una sesión real en navegador en esta revisión.

Aplicación: reemplazar estos cuatro archivos, ejecutar `npx ng build --configuration development` en FempApp y verificar Registro → Mi perfil → Registro, con la API ya configurada. No abrir el registro masivo hasta cerrar los bloqueos del backend.

## Bloqueos antes del alta masiva

### 1. Autorización de operaciones y datos personales — prioridad crítica

Evidencia en `FempApp-bck/routes/usuarios.router.js`: la ruta PUT de perfil por DNI no tiene verifyToken y entrega req.body completo a usuario.update(). También hay rutas de foto sin autenticación. El GET por DNI devuelve el modelo completo sin una selección de atributos seguros; el modelo incluye password y otros datos que no deben salir en una consulta pública.

Evidencia en `FempApp-bck/routes/eventos.router.js`: creación y edición de eventos no tienen comprobación de token o rol. `server.js` monta esos routers sin un middleware de autenticación general.

Corrección necesaria: autorización en servidor por operación, comprobación de titularidad, lista explícita de campos editables y respuestas con atributos mínimos. Conservar un mecanismo de consulta pública de DNI compatible con el registro, que no exponga el modelo completo. Revisar también inscripciones, perfiles deportivos y documentos; ocultar un botón o agregar solamente un guard Angular no reemplaza esto.

Cierre: sin sesión y con un usuario de otro rol, las operaciones deben rechazarse sin cambiar datos. Una persona no debe poder modificar el perfil de otra ni su propio rol/estado desde la edición de datos personales. Hacer estas verificaciones en datos controlados, no intentando modificar cuentas reales.

### 2. Cuenta pendiente, bloqueo y registro público — prioridad crítica

`auth.router.js` emite un token con el rol solicitado al terminar el registro aun cuando la cuenta queda pendiente. `auth.middleware.js` verifica firma y rol del token, pero no consulta el estado actual de la cuenta. Un bloqueo tampoco revoca por sí solo un token anterior. El login bloquea cuentas pendientes de administrador, técnico y tesorería, pero no aplica la misma condición al deportista.

El registro también contiene una autoaprobación del primer administrador. Debe sustituirse por un alta administrativa controlada antes de uso real. La consulta yaExiste de email/DNI se ejecuta pero su resultado no se comprueba antes de crear. Un rol inexistente se desreferencia sin comprobar null.

Cierre: definir si el deportista pendiente puede ingresar a una pantalla limitada o si debe esperar aprobación; comprobar que las cuentas bloqueadas y las cuentas privilegiadas pendientes no puedan operar, incluso con un token emitido antes. Email/DNI duplicados y rol inválido deben devolver mensajes específicos, sin crear registros.

### 3. Club elegido al registrarse — prioridad alta

El frontend envía clubId y club, pero el POST /auth/register revisado no los utiliza en Usuario.create(). Usuario tiene club como texto, pero no clubId en el modelo revisado. La selección puede no quedar guardada, especialmente fuera del padrón.

Cierre: validar el club en el servidor y persistirlo según la arquitectura elegida; comprobar mediante una lectura posterior al registro. No dar por resuelto porque el autocomplete muestre el nombre.

## Roles, tesorería y administración

### 4. Usuario del tesorero — síntoma pendiente de reproducir

El login Angular y la ruta dashboard-tesoreria reconocen tesoreria. La API de pagos exige administrador o tesoreria. Sin embargo, el fallback del middleware mapea rolId 4 a validador. Cuando el token ya contiene rol='tesoreria', ese fallback no se utiliza; por tanto, esto no prueba por sí solo la causa del error de la cuenta concreta.

Al aprobar y cambiar un rol, usuarios.router.js usa ROL_CANON sin declararlo en ese archivo, y actualiza rol sin sincronizar rolId. La pantalla de aprobación habitual envía sólo aprobar; el fallo de la constante se activa cuando se envía también rol.

Cierre: comprobar el síntoma de la cuenta concreta, rol/rolId/estado/aprobado contra la tabla de roles y la respuesta de login, sin compartir contraseñas o tokens. Aprobar como administrador, cerrar sesión, entrar como tesorería y verificar filtros, exportación y denegación de funciones administrativas.

### 5. Navegación del administrador y estados

El menú administrativo enlaza /admin/scanner, pero esa ruta no está definida; existe /asistencias/scanner. Las rutas de edición/listado de eventos están fuera del árbol protegido de admin y no tienen guard propio. También hay guards comentados en pantallas de otros roles.

La lista de pendientes consulta aprobado=false; los usuarios bloqueados también tienen aprobado=false, por lo que vuelven a esa lista. El componente de pendientes no comunica errores de carga/aprobación y no bloquea acciones repetidas mientras espera la respuesta.

Cierre: recorrer cada enlace del menú con una sesión de cada rol, ingreso por URL directa, refresco, salida y botón Atrás; distinguir pendiente, aprobado y bloqueado; mostrar errores de API en pantalla.

### 6. Cifras de tesorería

aplicarFiltros() inicia dos cálculos que escriben en resumen: uno con pagos filtrados y otro con el total del evento. El resultado puede depender de cuál respuesta llegue última. Los montos del cálculo local suman todos los estados; hay que rotularlos según su significado, sin presentarlos como recaudación efectivamente cobrada.

Cierre: elegir y comprobar el alcance de cada total con un conjunto conocido de pagos, incluyendo pendientes, aprobados, rechazados y devoluciones. Probar fechas, club/sede, exportación y respuesta de error. Confirmar las reglas comerciales antes de habilitar cobros reales.

## Eventos, certificados y QR

### 7. Fechas del certificado — causas comprobadas en código

En evento-detail.component.ts, descargarCertificado(e) usa e para título/lugar pero this.evento para fechaInicio. Las dos funciones de descarga sustituyen una fecha ausente por new Date(). El servicio certificado.service.ts también tiene ese reemplazo por la fecha actual.

Además, new Date('AAAA-MM-DD').toLocaleDateString('es-AR') puede mostrar el día anterior en Argentina. Debe distinguirse una fecha de calendario de un instante con zona horaria; falta comprobar los valores reales que recibe el frontend antes de normalizar registros existentes.

Cierre: tomar la fecha del evento seleccionado, eliminar el reemplazo silencioso por hoy y definir la presentación de eventos de varios días. Probar dos eventos distintos, un rango, una fecha ausente y un cambio de mes, usando la zona horaria del evento.

### 8. Emisión de certificados y configuración del evento

La descarga genera un certificado de asistencia desde el navegador. Una de las funciones comprueba inscripción; no se encontró allí una comprobación de asistencia real. El texto afirma asistencia y licencia durante el año corriente: debe concordar con los datos y el tipo de certificado autorizado.

El editor envía opciones como certificadoAuto y configuración de check-in, pero mapEventoPayload sólo recoge título, descripción, fechas y lugar. Algunas opciones pueden mostrarse sin persistir.

Cierre: decidir qué acredita cada documento, cuándo se habilita y qué validación hace el servidor; guardar y volver a abrir el evento para verificar que todas las opciones persistan.

### 9. QR

Pendiente anterior: el QR personal contiene una credencial JWT, mientras el lector revisado usa el flujo de código de evento. No son intercambiables. Debe probarse el flujo elegido de extremo a extremo: lector, endpoint, persona, evento, inscripción, duplicados y persistencia de asistencia. La renovación de QR personal además usa uuidv4 en usuarios.router.js sin importarlo.

## Orden de cierre por fases

| Fase | Alcance | Evidencia de cierre |
|---|---|---|
| Antes de convocar a registrarse | Permisos del backend, cuentas pendientes/bloqueadas, alta con/sin padrón, validaciones, persistencia de club | Pruebas de autorización y altas controladas; datos correctos al volver a ingresar |
| Antes de operar con la comisión | Administrador, técnico, deportista y tesorería; navegación y aprobación | Una cuenta de cada rol recorre sus funciones; funciones ajenas denegadas |
| Antes de abrir inscripciones | Eventos, perfiles múltiples, cupos/reglas/precios si corresponden y pagos | Inscripción persistida; duplicado rechazado; conciliación y totales consistentes |
| Antes del evento | QR, asistencia, certificados y fechas | Lectura con equipos que se usarán; asistencia guardada y certificado correcto |
| Antes de publicar cada lote | Build, revisión funcional y versión desplegada | Commit identificado, frontend/backend compatibles y revisión tras despliegue |

Octubre de 2026 es el objetivo de registro masivo; estos controles deben preceder a la convocatoria. No hay todavía una estimación fiable de plazo para cerrar todos los bloqueos.

## Identificación de la publicación

Está confirmado el MySQL de develop usado durante estas correcciones: conexión DBeaver railway 2. El usuario indicó que producción existe en otro repositorio. Antes de preparar el despliegue real hay que identificar el repositorio/rama del frontend, el del backend, el dominio que recibirán los usuarios y la base asociada. No se presupone que git push origin develop publique esa producción.

Para cada publicación: copia recuperable de la base antes de migraciones, cambios de esquema versionados, versión de código anterior identificada, persistencia de archivos subidos y verificación posterior del flujo afectado. Son controles operativos de esta puesta en marcha, no tareas que ya se hayan ejecutado.
