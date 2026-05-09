# Documentación Completa de la API REST - CustodiaStock

## 1. Información General

### URL Base
```
http://localhost:3000/api
```

### Método de Autenticación
**JWT (JSON Web Token)** con esquema Bearer

- **Header requerido**: `Authorization: Bearer <token>`
- **Duración del token**: 8 horas (configurable via `JWT_EXPIRES_IN`)
- **Claims del token**: `sub` (id), `username`, `role`, `active`

### Roles de Usuario
- `ADMIN`: Acceso completo, incluyendo reportes y cancelaciones
- `OPERATOR`: Acceso limitado (no puede cancelar entradas/entregas ni ver reportes)

---

## 2. Endpoints

### 2.1 Health Check

#### GET /health
Verifica que el servidor esté funcionando.

**Respuesta exitosa (200):**
```json
{ "status": "ok" }
```

---

### 2.2 Autenticación

#### POST /auth/login
Login de usuario.

**Body esperado:**
```json
{
  "username": "alejo",
  "password": "Pascal123*"
}
```

**Respuesta exitosa (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": "8h",
  "user": {
    "id": 1,
    "username": "alejo",
    "fullName": "Carlos Rojas",
    "email": "carlos@empresa.com",
    "role": "ADMIN",
    "active": true
  }
}
```

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "Username and password are required" |
| 401 | "Invalid credentials" |
| 403 | "User is inactive" |
| 500 | "JWT_SECRET is not configured" |

---

### 2.3 Usuarios

#### GET /users
Lista todos los usuarios activos. Requiere autenticación.

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "username": "alejo",
    "fullName": "Carlos Rojas",
    "email": "carlos@empresa.com",
    "role": "ADMIN",
    "active": true,
    "createdAt": "2026-03-06T04:25:17.933Z",
    "deletedAt": null
  }
]
```

#### POST /users
Crea un nuevo usuario. Requiere autenticación.

**Body esperado:**
```json
{
  "username": "lady",
  "fullName": "Lady Real",
  "email": "lady@empresa.com",
  "password": "Secure123!",
  "role": "OPERATOR",
  "active": true
}
```

**Campos requeridos:** `username`, `fullName`, `password`, `role`

**Respuesta exitosa (201):**
```json
{
  "id": 2,
  "username": "lady",
  "fullName": "Lady Real",
  "email": "lady@empresa.com",
  "role": "OPERATOR",
  "active": true,
  "createdAt": "2026-03-06T04:25:17.933Z",
  "deletedAt": null
}
```

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "Missing required user fields" |
| 400 | "Invalid role" |
| 409 | "Username or email already in use" |

#### GET /users/:id
Obtiene un usuario por ID. Requiere autenticación.

**Path params:**
- `id` (integer): ID del usuario

**Respuesta exitosa (200):** Ver schema UserResponse

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 404 | "User not found" |

#### PUT /users/:id
Actualiza un usuario. Requiere autenticación.

**Path params:**
- `id` (integer): ID del usuario

**Body esperado (todos opcionales):**
```json
{
  "username": "nuevoUsuario",
  "fullName": "Nuevo Nombre",
  "email": "nuevo@empresa.com",
  "password": "NuevaPass123!",
  "role": "ADMIN",
  "active": false
}
```

**Respuesta exitosa (200):** Ver schema UserResponse

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "No supported fields sent for update" |
| 403 | "No tiene permisos para modificar este usuario." (usuario "alejo") |
| 404 | "User not found" |
| 409 | "Username or email already in use" |

#### DELETE /users/:id
Elimina lógicamente un usuario (soft delete). Requiere autenticación.

**Path params:**
- `id` (integer): ID del usuario

**Respuesta exitosa (204):** Sin contenido

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 404 | "User not found" |

---

### 2.4 Productos

#### GET /products
Lista todos los productos activos. Requiere autenticación.

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "Lavamanos Delta",
    "reference": "LVM-001",
    "description": "Lavamanos cerámico color blanco",
    "active": true,
    "createdAt": "2026-03-06T04:22:56.251Z",
    "deletedAt": null
  }
]
```

#### POST /products
Crea un nuevo producto. Requiere autenticación.

**Body esperado:**
```json
{
  "name": "Lavamanos Delta",
  "reference": "LVM-001",
  "description": "Lavamanos cerámico color blanco",
  "active": true
}
```

**Campos requeridos:** `name`, `reference`

**Respuesta exitosa (201):** Ver schema ProductResponse

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "Missing required product fields" |
| 409 | "Product reference already in use" |

#### GET /products/:id
Obtiene un producto por ID. Requiere autenticación.

**Path params:**
- `id` (integer): ID del producto

**Respuesta exitosa (200):** Ver schema ProductResponse

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 404 | "Product not found" |

#### PUT /products/:id
Actualiza un producto. Requiere autenticación.

**Path params:**
- `id` (integer): ID del producto

**Body esperado (todos opcionales):**
```json
{
  "name": "Nuevo Nombre",
  "reference": "NUEVA-REF",
  "description": "Nueva descripción",
  "active": false
}
```

**Respuesta exitosa (200):** Ver schema ProductResponse

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "No supported fields sent for update" |
| 404 | "Product not found" |
| 409 | "Product reference already in use" |

#### DELETE /products/:id
Elimina lógicamente un producto. Requiere autenticación.

**Path params:**
- `id` (integer): ID del producto

**Respuesta exitosa (204):** Sin contenido

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 404 | "Product not found" |

#### GET /products/stock-report
Reporte de stock por producto con filtro de fechas. **Solo ADMIN**.

**Query params (opcionales):**
- `startDate` (string, format date): Fecha de inicio (YYYY-MM-DD)
- `endDate` (string, format date): Fecha de fin (YYYY-MM-DD)

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "Lavamanos Delta",
    "reference": "LVM-001",
    "totalEntries": 10,
    "totalDeliveries": 3,
    "stock": 7
  }
]
```

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 403 | "Forbidden: Insufficient permissions" |

#### GET /products/:id/movements
Detalle de movimientos de un producto. **Solo ADMIN**.

**Path params:**
- `id` (integer): ID del producto

**Query params (opcionales):**
- `startDate` (string, format date): Fecha de inicio
- `endDate` (string, format date): Fecha de fin

**Respuesta exitosa (200):**
```json
[
  {
    "type": "ENTRY",
    "documentNumber": "ENTR-000001",
    "date": "2025-05-20T10:00:00.000Z",
    "quantity": 10,
    "user": "Diego",
    "details": "Entrada de producto"
  },
  {
    "type": "DELIVERY",
    "documentNumber": "ENT-000001",
    "date": "2025-05-21T14:30:00.000Z",
    "quantity": 3,
    "user": "Carlos",
    "details": "Entregado a: Juan Pérez"
  }
]
```

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 403 | "Forbidden: Insufficient permissions" |

#### POST /products/import
Importación masiva de productos desde archivo Excel. Requiere autenticación.

**Content-Type:** `multipart/form-data`

**Body esperado:**
- `file` (binary): Archivo Excel .xlsx (máximo 5MB)

**Formato del Excel:**
| Columna | Requerida | Descripción |
|---------|-----------|-------------|
| reference | Sí | Referencia del producto |
| name | Sí | Nombre del producto |
| description | No | Descripción |
| active | No | true/false (default: true) |

**Respuesta exitosa (201):**
```json
{
  "totalRows": 10,
  "validRows": 8,
  "importedCount": 6,
  "skippedCount": 2,
  "invalidRows": [
    {
      "row": 4,
      "reason": "reference is required"
    }
  ]
}
```

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "file is required (.xlsx)" |
| 400 | "Only .xlsx files are allowed" |

---

### 2.5 Entradas (Entry)

#### GET /entries/next-number
Obtiene el siguiente número de secuencia para entradas. Requiere autenticación.

**Respuesta exitosa (200):**
```json
{
  "nextNumber": "ENTR-000001"
}
```

#### POST /entries
Crea una nueva entrada. Requiere autenticación.

**Body esperado:**
```json
{
  "documentNumber": "ENTR-000001",
  "sourceDocument": "FAC-12345",
  "items": [
    {
      "productId": 1,
      "quantity": 10
    },
    {
      "productId": 2,
      "quantity": 5
    }
  ],
  "userId": 1,
  "entryDate": "2025-05-20"
}
```

**Campos requeridos:** `documentNumber`, `items`, `userId`, `entryDate`

**Validaciones:**
- `items` debe ser un array no vacío
- Cada item debe tener `productId` y `quantity > 0`
- Los productos deben existir y estar activos
- El usuario debe existir y estar activo

**Respuesta exitosa (201):**
```json
{
  "id": 1,
  "documentNumber": "ENTR-000001",
  "sourceDocument": "FAC-12345",
  "status": "ACTIVE",
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 10,
      "product": {
        "id": 1,
        "name": "Lavamanos Delta",
        "reference": "LVM-001",
        "active": true
      }
    }
  ],
  "userId": 1,
  "cancelReason": null,
  "canceledAt": null,
  "canceledById": null,
  "entryDate": "2025-05-20T00:00:00.000Z",
  "createdAt": "2025-05-20T10:00:00.000Z",
  "deletedAt": null,
  "createdBy": {
    "id": 1,
    "username": "diego",
    "fullName": "Diego",
    "email": "diego@empresa.com",
    "role": "OPERATOR",
    "active": true
  },
  "canceledBy": null
}
```

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "Missing required entry fields" |
| 400 | "Items must be a non-empty array" |
| 400 | "Each item must have a valid productId and quantity greater than 0" |
| 400 | "One or more products do not exist or are inactive" |
| 400 | "User does not exist or is inactive" |
| 409 | "Document number already exists" |

#### GET /entries
Lista todas las entradas. Requiere autenticación.

**Query params (opcionales):**
- `startDate` (string, format date): Fecha de inicio
- `endDate` (string, format date): Fecha de fin

**Respuesta exitosa (200):** Array de EntryResponse

#### GET /entries/:id
Obtiene una entrada por ID. Requiere autenticación.

**Path params:**
- `id` (integer): ID de la entrada

**Respuesta exitosa (200):** Ver schema EntryResponse

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 404 | "Entry not found" |

#### PATCH /entries/:id/cancel
Anula una entrada. **Solo ADMIN**. Requiere autenticación.

**Path params:**
- `id` (integer): ID de la entrada

**Body esperado:**
```json
{
  "adminUserId": 1,
  "reason": "Error en el registro"
}
```

**Campos requeridos:** `adminUserId`, `reason`

**Respuesta exitosa (200):** Ver schema EntryResponse (con status: "CANCELED")

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "adminUserId and reason are required" |
| 400 | "Admin user does not exist or is inactive" |
| 403 | "Only ADMIN users can cancel entries" |
| 404 | "Entry not found" |
| 409 | "Entry is already canceled" |

---

### 2.6 Entregas (Delivery)

#### GET /deliveries/next-number
Obtiene el siguiente número de secuencia para entregas. Requiere autenticación.

**Respuesta exitosa (200):**
```json
{
  "nextNumber": "ENT-000001"
}
```

#### POST /deliveries
Crea una nueva entrega. Requiere autenticación.

**Body esperado:**
```json
{
  "documentNumber": "ENT-000001",
  "items": [
    {
      "productId": 1,
      "quantity": 3
    }
  ],
  "deliveredById": 1,
  "receivedById": 2,
  "signatureImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "deliveryDate": "2025-05-20"
}
```

**Campos requeridos:** `documentNumber`, `items`, `deliveredById`, `receivedById`, `signatureImage`, `deliveryDate`

**Validaciones:**
- `items` debe ser un array no vacío
- Cada item debe tener `productId` y `quantity > 0`
- Los productos deben existir y estar activos
- Los usuarios (deliveredBy y receivedBy) deben existir y estar activos

**Respuesta exitosa (201):**
```json
{
  "id": 1,
  "documentNumber": "ENT-000001",
  "status": "ACTIVE",
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 3,
      "product": {
        "id": 1,
        "name": "Lavamanos Delta",
        "reference": "LVM-001",
        "active": true
      }
    }
  ],
  "deliveredById": 1,
  "receivedById": 2,
  "signatureImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "cancelReason": null,
  "canceledAt": null,
  "canceledById": null,
  "deliveryDate": "2025-05-20T00:00:00.000Z",
  "createdAt": "2025-05-20T10:00:00.000Z",
  "deletedAt": null,
  "deliveredBy": {
    "id": 1,
    "username": "carlos",
    "fullName": "Carlos Rojas",
    "email": "carlos@empresa.com",
    "role": "ADMIN",
    "active": true
  },
  "receivedBy": {
    "id": 2,
    "username": "juan",
    "fullName": "Juan Pérez",
    "email": "juan@empresa.com",
    "role": "OPERATOR",
    "active": true
  },
  "canceledBy": null
}
```

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "Missing required delivery fields" |
| 400 | "Items must be a non-empty array" |
| 400 | "Each item must have a valid productId and quantity greater than 0" |
| 400 | "One or more products do not exist or are inactive" |
| 400 | "DeliveredBy user does not exist or is inactive" |
| 400 | "ReceivedBy user does not exist or is inactive" |
| 409 | "Document number already exists" |

#### GET /deliveries
Lista todas las entregas. Requiere autenticación.

**Query params (opcionales):**
- `startDate` (string, format date): Fecha de inicio
- `endDate` (string, format date): Fecha de fin

**Respuesta exitosa (200):** Array de DeliveryResponse

#### GET /deliveries/:id
Obtiene una entrega por ID. Requiere autenticación.

**Path params:**
- `id` (integer): ID de la entrega

**Respuesta exitosa (200):** Ver schema DeliveryResponse

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 404 | "Delivery not found" |

#### PATCH /deliveries/:id/cancel
Anula una entrega. **Solo ADMIN**. Requiere autenticación.

**Path params:**
- `id` (integer): ID de la entrega

**Body esperado:**
```json
{
  "adminUserId": 1,
  "reason": "Error en la entrega"
}
```

**Campos requeridos:** `adminUserId`, `reason`

**Respuesta exitosa (200):** Ver schema DeliveryResponse (con status: "CANCELED")

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "adminUserId and reason are required" |
| 400 | "Admin user does not exist or is inactive" |
| 403 | "Only ADMIN users can cancel deliveries" |
| 404 | "Delivery not found" |
| 409 | "Delivery is already canceled" |

#### DELETE /deliveries/:id
Elimina lógicamente una entrega (soft delete). Requiere autenticación.

**Path params:**
- `id` (integer): ID de la entrega

**Respuesta exitosa (204):** Sin contenido

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 404 | "Delivery not found" |

---

### 2.7 Secuencias

#### GET /sequences
Lista todas las secuencias. Requiere autenticación.

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "ENTREGA",
    "prefix": "ENT-",
    "nextNumber": 2
  },
  {
    "id": 2,
    "name": "ENTRADA",
    "prefix": "ENTR-",
    "nextNumber": 1
  }
]
```

#### GET /sequences/:id
Obtiene una secuencia por ID. Requiere autenticación.

**Path params:**
- `id` (integer): ID de la secuencia

**Respuesta exitosa (200):** Ver schema Sequence

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 404 | "Sequence not found" |

#### POST /sequences
Crea una nueva secuencia. Requiere autenticación.

**Body esperado:**
```json
{
  "name": "OTRO_TIPO",
  "prefix": "OTRO-",
  "nextNumber": 1
}
```

**Campos requeridos:** `name`

**Respuesta exitosa (201):** Ver schema Sequence

**Posibles errores:**
| Código | Mensaje |
|--------|---------|
| 400 | "Sequence name is required" |
| 409 | "Sequence name already exists" |

#### PUT /sequences/:id
Actualiza una secuencia. Requiere autenticación.

**Path params:**
- `id` (integer): ID de la secuencia

**Body esperado (todos opcionales):**
```json
{
  "name": "NUEVO_NOMBRE",
  "prefix": "NEW-",
  "nextNumber": 100
}
```

**Respuesta exitosa (200):** Ver schema Sequence

#### DELETE /sequences/:id
Elimina una secuencia. Requiere autenticación.

**Path params:**
- `id` (integer): ID de la secuencia

**Respuesta exitosa (204):** Sin contenido

---

## 3. Modelos de Datos

### User
```typescript
{
  id: number;
  username: string;           // único
  fullName: string;
  email: string | null;       // único
  password: string;           // hasheada con bcrypt
  role: "OPERATOR" | "ADMIN";
  active: boolean;
  createdAt: Date;
  deletedAt: Date | null;
}
```

### Product
```typescript
{
  id: number;
  name: string;
  reference: string;          // único
  description: string | null;
  active: boolean;
  createdAt: Date;
  deletedAt: Date | null;
}
```

### Entry (Entrada)
```typescript
{
  id: number;
  documentNumber: string;     // único, formato: ENTR-XXXXXX
  sourceDocument: string | null;  // número de factura del proveedor
  userId: number;             // referencia a User (createdBy)
  status: "ACTIVE" | "CANCELED";
  canceledAt: Date | null;
  canceledById: number | null;
  cancelReason: string | null;
  entryDate: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  items: EntryItem[];
  createdBy: User;
  canceledBy: User | null;
}
```

### EntryItem
```typescript
{
  id: number;
  entryId: number;
  productId: number;
  quantity: number;
  deletedAt: Date | null;
  product: Product;
}
```

### Delivery (Entrega)
```typescript
{
  id: number;
  documentNumber: string;     // único, formato: ENT-XXXXXX
  deliveredById: number;      // referencia a User
  receivedById: number;       // referencia a User
  signatureImage: string;     // base64 o URL de la firma
  status: "ACTIVE" | "CANCELED";
  canceledAt: Date | null;
  canceledById: number | null;
  cancelReason: string | null;
  deliveryDate: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  items: DeliveryItem[];
  deliveredBy: User;
  receivedBy: User;
  canceledBy: User | null;
}
```

### DeliveryItem
```typescript
{
  id: number;
  deliveryId: number;
  productId: number;
  quantity: number;
  deletedAt: Date | null;
  product: Product;
}
```

### Sequence
```typescript
{
  id: number;
  name: string;               // único (ej: "ENTREGA", "ENTRADA")
  prefix: string;             // ej: "ENT-", "ENTR-"
  nextNumber: number;         // siguiente número a usar
}
```

---

## 4. Reglas de Negocio Importantes

### 4.1 Validaciones Generales

1. **Soft Delete**: Todas las entidades usan eliminación lógica (`deletedAt`). Los registros eliminados no se muestran en las listas.

2. **Unicidad**: 
   - `User.username` y `User.email` deben ser únicos
   - `Product.reference` debe ser único
   - `Entry.documentNumber` y `Delivery.documentNumber` deben ser únicos
   - `Sequence.name` debe ser único

3. **Estados Permitidos**:
   - Entry: `ACTIVE`, `CANCELED`
   - Delivery: `ACTIVE`, `CANCELED`

### 4.2 Reglas de Entrada (Entry)

1. **Creación**:
   - Requiere al menos un item
   - Cada item debe tener cantidad > 0
   - Todos los productos deben existir y estar activos
   - El usuario creador debe existir y estar activo

2. **Cancelación**:
   - Solo usuarios con rol `ADMIN` pueden cancelar
   - Se requiere un motivo obligatorio
   - Una entrada cancelada no puede volver a cancelarse

3. **Secuenciación**:
   - El sistema sugiere números automáticos (ENTR-000001, ENTR-000002, ...)
   - Se permite usar números personalizados
   - La secuencia se actualiza automáticamente si se usa un número mayor

### 4.3 Reglas de Entrega (Delivery)

1. **Creación**:
   - Requiere al menos un item
   - Cada item debe tener cantidad > 0
   - Se requiere firma digital (base64 o URL)
   - Ambos usuarios (entregador y receptor) deben existir y estar activos

2. **Cancelación**:
   - Solo usuarios con rol `ADMIN` pueden cancelar
   - Se requiere un motivo obligatorio
   - Una entrega cancelada no puede volver a cancelarse

3. **Eliminación**:
   - El soft delete también elimina los items asociados

### 4.4 Reglas de Stock

1. **Cálculo**: `stock = totalEntradas - totalSalidas`
2. **Filtro por fechas**: El reporte de stock puede filtrar movimientos por rango de fechas
3. **Timezone**: Todas las fechas se manejan en timezone `America/Bogota`

### 4.5 Reglas de Usuarios

1. **Roles**: Solo `OPERATOR` y `ADMIN` son válidos
2. **Protección especial**: El usuario "alejo" solo puede ser modificado por sí mismo
3. **Contraseñas**: 
   - Se almacenan hasheadas con bcrypt
   - Migración transparente: si se detecta hash legacy (SHA256), se rehashea en el login

### 4.6 Reglas de Secuencias

1. **Prefijos por defecto**:
   - ENTREGA → "ENT-"
   - ENTRADA → "ENTR-"

2. **Formato**: `{prefix}{numero con 6 dígitos}` (ej: ENT-000001)

3. **Auto-incremento**: La secuencia se incrementa automáticamente al obtener el siguiente número

---

## 5. Endpoints Específicos Solicitados

### 5.1 Login y Gestión de Sesión

**Endpoint**: `POST /api/auth/login`

Ver sección 2.2 para detalles completos.

**Notas**:
- No hay endpoint de logout (el token expira automáticamente)
- No hay refresh token (debe hacer login nuevamente)
- El token incluye información del usuario para evitar consultas adicionales

### 5.2 Obtener Siguiente Número de Secuencia

**Para Entradas**: `GET /api/entries/next-number`
**Para Entregas**: `GET /api/deliveries/next-number`

**Respuesta**:
```json
{ "nextNumber": "ENTR-000001" }
```

**Uso típico**:
1. El frontend llama a este endpoint antes de crear un documento
2. Muestra el número sugerido al usuario
3. El usuario puede aceptarlo o modificarlo
4. Al crear el documento, se valida que el número no exista

### 5.3 Cancelar Entrada/Entrega con Motivo

**Cancelar Entrada**: `PATCH /api/entries/:id/cancel`
**Cancelar Entrega**: `PATCH /api/deliveries/:id/cancel`

**Body requerido**:
```json
{
  "adminUserId": 1,
  "reason": "Motivo de la cancelación"
}
```

**Restricciones**:
- Solo administradores pueden cancelar
- El motivo es obligatorio
- No se puede cancelar un documento ya cancelado

### 5.4 Reporte de Stock con Filtro de Fechas

**Endpoint**: `GET /api/products/stock-report`

**Query params**:
- `startDate`: Fecha de inicio (YYYY-MM-DD)
- `endDate`: Fecha de fin (YYYY-MM-DD)

**Ejemplos**:
```
GET /api/products/stock-report?startDate=2025-01-01&endDate=2025-12-31
GET /api/products/stock-report?startDate=2025-01-01
GET /api/products/stock-report?endDate=2025-12-31
GET /api/products/stock-report
```

**Nota**: Si no se proporcionan fechas, retorna el stock histórico completo.

### 5.5 Importación Masiva de Productos

**Endpoint**: `POST /api/products/import`

**Formato**: `multipart/form-data`

**Archivo Excel requerido**:
- Extensión: `.xlsx`
- Tamaño máximo: 5MB
- Hoja: primera hoja del libro

**Columnas del Excel**:

| Columna | Alias | Requerida | Tipo | Default |
|---------|-------|-----------|------|---------|
| reference | referencia | Sí | Texto | - |
| name | nombre | Sí | Texto | - |
| description | descripcion | No | Texto | null |
| active | activo | No | Boolean/Texto | true |

**Valores válidos para `active`**:
- Boolean: `true`, `false`
- Número: `1`, `0`
- Texto: `"true"`, `"false"`, `"si"`, `"sí"`, `"yes"`, `"no"`, `"1"`, `"0"`

**Respuesta**:
```json
{
  "totalRows": 10,        // Total de filas en el Excel
  "validRows": 8,         // Filas que pasaron validación
  "importedCount": 6,     // Productos creados exitosamente
  "skippedCount": 2,      // Productos saltados (duplicados)
  "invalidRows": [        // Filas con errores
    {
      "row": 4,
      "reason": "reference is required"
    }
  ]
}
```

---

## 6. Códigos de Error Comunes

| Código | Significado | Ejemplo de uso |
|--------|-------------|----------------|
| 200 | OK | Operación exitosa |
| 201 | Created | Recurso creado exitosamente |
| 204 | No Content | Eliminación exitosa (sin body) |
| 400 | Bad Request | Datos inválidos o faltantes |
| 401 | Unauthorized | Token faltante, inválido o expirado |
| 403 | Forbidden | Permisos insuficientes |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto (ej: número duplicado) |
| 500 | Internal Server Error | Error interno del servidor |

---

## 7. Consideraciones Adicionales

### 7.1 Timezone
Todas las fechas se manejan en **America/Bogota (UTC-5)**. El backend convierte automáticamente las fechas usando dayjs con timezone.

### 7.2 Paginación
Actualmente **no hay paginación** implementada. Todas las listas retornan todos los registros.

### 7.3 Documentación Swagger
La API incluye documentación Swagger disponible en:
```
http://localhost:3000/api/docs
```

### 7.4 Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión a MySQL | Requerida |
| `JWT_SECRET` | Secreto para firmar tokens | Requerida en producción |
| `JWT_EXPIRES_IN` | Duración del token | "8h" |
| `PORT` | Puerto del servidor | 3000 |
| `NODE_ENV` | Entorno (development/production) | development |

### 7.5 Seed Inicial
Al iniciar el servidor, se crea automáticamente el usuario admin "alejo" si no existe.
