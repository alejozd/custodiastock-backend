# Instrucciones para el Frontend: Integración del campo "Documento Origen"

Se ha implementado un nuevo campo opcional en las Entradas (Entries) para registrar el número de factura o documento del proveedor.

## Cambios en la API

### 1. Crear Entrada (`POST /api/entries`)
Se ha añadido el campo `sourceDocument` (string, opcional) al cuerpo de la petición.

**Ejemplo de Payload:**
```json
{
  "documentNumber": "ENTR-000001",
  "sourceDocument": "FAC-12345",
  "items": [
    {
      "productId": 1,
      "quantity": 10
    }
  ],
  "entryDate": "2025-05-20"
}
```

### 2. Respuesta de Entradas (`GET /api/entries`, `GET /api/entries/:id`, `POST /api/entries`)
El campo `sourceDocument` ahora se incluye en la respuesta de los objetos de entrada.

**Ejemplo de Respuesta:**
```json
{
  "id": 1,
  "documentNumber": "ENTR-000001",
  "sourceDocument": "FAC-12345",
  "status": "ACTIVE",
  "items": [...],
  "entryDate": "2025-05-20T00:00:00.000Z",
  "createdAt": "2025-05-20T10:00:00.000Z",
  "createdBy": {...}
}
```

## Tareas para el Frontend

1.  **Formulario de Creación de Entradas:**
    *   Agregar un nuevo campo de texto etiquetado como "Documento Origen" o "Factura Proveedor".
    *   Este campo debe mapearse a la propiedad `sourceDocument` al enviar la petición al backend.
    *   El campo es opcional.

2.  **Lista de Entradas / Tabla:**
    *   Agregar una nueva columna "Doc. Origen" o similar para mostrar el valor de `sourceDocument`.

3.  **Detalle de Entrada:**
    *   Mostrar el campo `sourceDocument` en la vista de detalle de la entrada si tiene un valor asignado.

## Tipado Sugerido (TypeScript)
Si utilizas TypeScript, actualiza la interfaz de `Entry`:

```typescript
interface Entry {
  id: number;
  documentNumber: string;
  sourceDocument?: string | null;
  status: 'ACTIVE' | 'CANCELED';
  entryDate: string;
  // ... otros campos
}
```
