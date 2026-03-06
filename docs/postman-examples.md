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

### Windows EPERM quick fix (`query_engine-windows.dll.node`)

If you get `EPERM: operation not permitted, rename ...query_engine-windows.dll.node`:

- Close terminal sessions running Node/Nodemon.
- Stop the backend process from VSCode/PowerShell.
- Optionally delete `node_modules/.prisma/client`.
- Run again:

```bash
npm run prisma:generate
```

## Users

### Create user
`POST /users`

```json
{
  "name": "Carlos Rojas",
  "email": "carlos@empresa.com",
  "password": "Secure123!",
  "role": "WAREHOUSE",
  "active": true
}
```

> Note: with the current legacy DB schema, `role` and `active` are accepted in API contracts but not persisted in DB yet.

### List users
`GET /users`

### Get user by id
`GET /users/1`

### Update user
`PUT /users/1`

```json
{
  "name": "Carlos Rojas Perez",
  "password": "NewSecure123!"
}
```

### Delete user
`DELETE /users/1`

## Products

### Create product
`POST /products`

```json
{
  "name": "Lavamanos Delta",
  "code": "LVM-001",
  "description": "Lavamanos cerámico color blanco",
  "active": true
}
```

> Note: with the current legacy DB schema, `active` is accepted in API contracts but not persisted in DB yet.

### List products
`GET /products`

### Get product by id
`GET /products/1`

### Update product
`PUT /products/1`

```json
{
  "description": "Lavamanos cerámico color blanco mate"
}
```

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

### List deliveries
`GET /deliveries`

### Get delivery by id
`GET /deliveries/1`
