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
  "email": "carlos@empresa.com",
  "password": "Secure123!"
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

### Create user
`POST /users`

```json
{
  "name": "Carlos Rojas",
  "email": "carlos@empresa.com",
  "password": "Secure123!",
  "role": "ADMIN",
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


### Import products from Excel CSV
`POST /products/import`

Headers:

```text
Content-Type: text/csv
```

Body (raw):

```csv
name,reference,description,active
Lavamanos Delta,LVM-001,Lavamanos cerámico,true
Grifería Nova,GRF-002,Monomando,1
```

> Tip: desde Excel usa **Guardar como CSV (UTF-8)** para importar rápidamente.


## Deliveries (Protected)

### Create delivery
`POST /deliveries`

```json
{
  "productId": 1,
  "quantity": 3,
  "deliveredById": 1,
  "receivedById": 2,
  "signatureImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
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
