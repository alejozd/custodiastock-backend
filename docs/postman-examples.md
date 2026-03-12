# Postman Request Examples

Base URL:

```text
http://localhost:3000/api
```

Swagger UI:

```text
http://localhost:3000/api/docs
```

## First run checklist

1. Ensure `.env` has a valid `DATABASE_URL` (MySQL).
2. Configure JWT secret:

```env
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=8h
```

> If `JWT_SECRET` is missing in development, the API uses a temporary fallback secret and logs a warning.
> In production, you must define `JWT_SECRET`.

3. Stop any running Node process before generating Prisma client (important on Windows to avoid file lock / EPERM).
4. Run:

```bash
npm run prisma:generate
npm run prisma:sync
npm run dev
```

## Auth

### Login
`POST /auth/login`

```json
{
  "username": "alejo",
  "password": "Pascal123*"
}
```

Save `token` from response and send in all protected endpoints:

```text
Authorization: Bearer <token>
```

## Users (Protected)

Allowed roles:
- `OPERATOR`
- `ADMIN`

### List users
`GET /users`

### Get user by ID
`GET /users/1`

### Create user
`POST /users`

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

### Update user
`PUT /users/1`

```json
{
  "role": "OPERATOR",
  "active": false
}
```

### Soft delete user
`DELETE /users/1`

## Products (Protected)

### List products
`GET /products`

### Get product by ID
`GET /products/1`

### Create product
`POST /products`

```json
{
  "name": "Lavamanos Delta",
  "reference": "LVM-001",
  "description": "Lavamanos cerámico color blanco",
  "active": true
}
```

### Update product
`PUT /products/1`

```json
{
  "reference": "LVM-001-A",
  "active": false
}
```

### Soft delete product
`DELETE /products/1`

### Stock Report (ADMIN only)
`GET /products/stock-report`
`GET /products/stock-report?startDate=2025-05-01&endDate=2025-05-31`

### Product Movements (ADMIN only)
`GET /products/1/movements`
`GET /products/1/movements?startDate=2025-05-01&endDate=2025-05-31`

### Import products from Excel (.xlsx)
`POST /products/import`

Body → `form-data`

- key: `file`
- type: `File`
- value: `products.xlsx`

Estructura esperada del Excel (primera fila: headers):

| reference | name      | description      | active |
| --------- | --------- | ---------------- | ------ |
| REF001    | Product A | Some description | true   |


## Deliveries (Protected)

### Get next delivery document number
`GET /deliveries/next-number`

### List deliveries
`GET /deliveries`
`GET /deliveries?startDate=2025-05-01&endDate=2025-05-31`

### Get delivery by ID
`GET /deliveries/1`

### Create delivery
`POST /deliveries`

```json
{
  "items": [
    { "productId": 1, "quantity": 3 }
  ],
  "deliveredById": 1,
  "receivedById": 2,
  "signatureImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "deliveryDate": "2025-05-20"
}
```

### Cancel delivery (ADMIN only)
`PATCH /deliveries/1/cancel`

```json
{
  "adminUserId": 1,
  "reason": "Cantidad incorrecta en documento original"
}
```

### Soft delete delivery
`DELETE /deliveries/1`

## Entries (Protected)

### Get next entry document number
`GET /entries/next-number`

### List entries
`GET /entries`
`GET /entries?startDate=2025-05-01&endDate=2025-05-31`

### Get entry by ID
`GET /entries/1`

### Create entry
`POST /entries`

```json
{
  "documentNumber": "ENTR-000001",
  "items": [
    { "productId": 1, "quantity": 10 }
  ],
  "userId": 1,
  "entryDate": "2025-05-20"
}
```

### Cancel entry (ADMIN only)
`PATCH /entries/1/cancel`

```json
{
  "adminUserId": 1,
  "reason": "Error en el conteo de unidades"
}
```

## Sequences (Protected - ADMIN)

### List sequences
`GET /sequences`

### Get sequence by ID
`GET /sequences/1`

### Create sequence
`POST /sequences`

```json
{
  "name": "NUEVA_SECUENCIA",
  "prefix": "NS-",
  "nextNumber": 1
}
```

### Update sequence
`PUT /sequences/1`

```json
{
  "prefix": "ABC-",
  "nextNumber": 100
}
```

### Delete sequence
`DELETE /sequences/1`
