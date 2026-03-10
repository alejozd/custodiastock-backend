# Prompt para Jules: Implementar el módulo de Entradas en el Frontend

Hola Jules, necesito que implementes el módulo de **Entradas** en el frontend. Este módulo debe permitir registrar la entrada de productos al inventario, siguiendo un flujo similar al de Entregas pero adaptado para Entradas.

### Tareas a realizar:

1.  **Navegación:**
    - Agregar una nueva opción "Entradas" en el menú principal.

2.  **Pantalla de Listado de Entradas:**
    - Crear una tabla que liste todas las entradas registradas.
    - Campos a mostrar: Número de Documento, Fecha de Entrada, Producto, Cantidad, Usuario que registró, Estado (Activo/Anulado).
    - Agregar filtros por rango de fechas (startDate, endDate).
    - Botón para ver detalles de una entrada.
    - Botón para anular una entrada (solo si está activa).
    - Botón "Nueva Entrada" para abrir el formulario de creación.

3.  **Pantalla/Modal de Nueva Entrada:**
    - **Fecha:** Campo de fecha pre-establecido con la fecha actual, pero editable.
    - **Consecutivo:** Obtener el siguiente número de documento llamando a `GET /api/entries/next-number`. Mostrar este número (puede ser de solo lectura o editable si el backend lo permite, pero idealmente se obtiene automáticamente).
    - **Producto:** Selector (dropdown o buscador) para elegir un producto de la lista existente.
    - **Cantidad:** Campo numérico para ingresar la cantidad de unidades que entran.
    - **Guardar:** Al hacer clic, enviar los datos al endpoint `POST /api/entries`.

4.  **Pantalla/Modal de Detalle de Entrada:**
    - Mostrar toda la información de la entrada seleccionada.
    - Si la entrada fue anulada, mostrar el motivo, la fecha de anulación y quién la anuló.

5.  **Anulación de Entrada:**
    - Al hacer clic en anular, solicitar un motivo de anulación.
    - Llamar al endpoint `PATCH /api/entries/:id/cancel` enviando el `adminUserId` y el `reason`.

### Información Técnica:

- **Endpoints del Backend (ya implementados):**
    - `GET /api/entries`: Listar entradas (soporta queries `startDate` y `endDate`).
    - `POST /api/entries`: Crear una nueva entrada.
    - `GET /api/entries/:id`: Ver detalle de una entrada.
    - `PATCH /api/entries/:id/cancel`: Anular una entrada.
    - `GET /api/entries/next-number`: Obtener el siguiente número de documento.

- **Estructura del Objeto Entry para POST:**
  ```json
  {
    "documentNumber": "ENTR-000001",
    "productId": 1,
    "quantity": 10,
    "userId": 1,
    "entryDate": "2025-05-20"
  }
  ```

Por favor, sigue los patrones de diseño y las librerías ya utilizadas en el frontend (React, librerías de componentes, manejo de estado, etc.).
