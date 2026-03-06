# Postman Request Examples

Base URL:

```text
http://localhost:3000/api
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

### List users
`GET /users`

### Get user by id
`GET /users/1`

### Update user
`PUT /users/1`

```json
{
  "name": "Carlos Rojas Perez",
  "role": "SUPERVISOR",
  "active": true
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

### List products
`GET /products`

### Get product by id
`GET /products/1`

### Update product
`PUT /products/1`

```json
{
  "description": "Lavamanos cerámico color blanco mate",
  "active": true
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
