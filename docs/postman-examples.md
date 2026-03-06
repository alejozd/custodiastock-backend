# Postman Request Examples

Base URL:

```text
http://localhost:3000/api
```

## First run checklist

1. Ensure `.env` has a valid `DATABASE_URL` (MySQL).
2. Stop any running Node process before generating Prisma client (important on Windows to avoid file lock / EPERM).
3. Run:

```bash
npm run prisma:generate
npm run prisma:sync
npm run dev
```

## Users

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

## Products

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

## Deliveries

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
