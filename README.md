# Derecho de Petición Sabaneta Mod - CustodiaStock

Sistema web para **registro y trazabilidad de entregas de productos en custodia** dentro de una empresa.

Permite registrar quién entrega, quién recibe, qué producto se entrega y almacenar la **firma digital del receptor**, funcionando como una **bitácora digital de custodia de inventario**.

Este sistema está pensado para empresas donde los productos se mueven entre personas (bodega, técnicos, vendedores, instaladores, etc.) y se necesita saber **quién tiene cada elemento en cada momento**.

---

# Problema que resuelve

En muchas empresas pequeñas o medianas:

* los productos se entregan verbalmente
* se anotan en cuadernos
* no se sabe quién tiene el producto
* se pierden elementos
* no hay trazabilidad

CustodiaStock permite registrar digitalmente cada entrega y conservar evidencia mediante **firma del receptor**.

---

# Características principales

* Autenticación con **JWT**
* Registro de **usuarios** (Admin y Operadores)
* Gestión de **productos** con referencias únicas
* Registro de **entradas** (compras/ingresos) y **entregas** (salidas a personal)
* Soporte para múltiples productos por documento
* Firma digital del receptor (imagen base64)
* Historial cronológico de movimientos por producto
* Reporte de stock actual por producto
* Gestión de **secuencias de numeración** de documentos
* Cancelación de documentos con motivo de anulación (solo administrador)
* Importación masiva de productos desde Excel
* Documentación automática con **Swagger**

---

# Arquitectura del sistema

El proyecto está construido con una arquitectura moderna basada en servicios.

```
Frontend (React + Vite)
        │
        │ HTTP REST API
        ▼
Backend (Node.js + Express)
        │
        │ ORM
        ▼
Prisma
        │
        ▼
MySQL Database
```

---

# Stack tecnológico

**Backend**
* Node.js (ES Modules)
* Express
* Prisma ORM
* MySQL
* JWT Authentication
* Swagger API Docs
* Jest & Supertest (Testing)

**Frontend**
* React
* Vite

**Infraestructura**
* Docker
* Docker Compose

---

# Instalación y Configuración

## 1. Requisitos previos

* Node.js (v18+)
* MySQL
* npm o yarn

## 2. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/custodiastock-backend
cd custodiastock-backend
```

## 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura tus credenciales:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/custodia_db"
JWT_SECRET=tu-llave-secreta-muy-larga
JWT_EXPIRES_IN=8h
PORT=3000
```

## 4. Instalar dependencias

```bash
npm install
```

## 5. Preparar la Base de Datos

```bash
# Generar el cliente de Prisma
npm run prisma:generate

# Sincronizar el esquema con la base de datos
npm run prisma:sync
```

## 6. Ejecutar en desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`.

---

# Testing

Para correr los tests:

```bash
npm test
```

---

# Documentación de la API

La documentación interactiva de Swagger está disponible en:

```
http://localhost:3000/api/docs
```

También puedes consultar ejemplos detallados de peticiones en [docs/postman-examples.md](docs/postman-examples.md).

---

# Roles de usuario

* **ADMIN**: Acceso total, puede anular documentos, ver reportes de stock, ver movimientos detallados, gestionar usuarios y gestionar secuencias de numeración.
* **OPERATOR**: Puede registrar entradas y entregas, y gestionar productos.

---

# Autor

Proyecto desarrollado por **Alejandro Zambrano**.

Ingeniero de Sistemas especializado en desarrollo backend y arquitectura de aplicaciones.
