import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "CustodiaStock API",
      version: "1.0.0",
      description: "API para gestión de custodias, productos y entregas.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "alejo" },
            password: { type: "string", example: "Pascal123*" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
            tokenType: { type: "string", example: "Bearer" },
            expiresIn: { type: "string", example: "8h" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                username: { type: "string", example: "alejo" },
                fullName: { type: "string", example: "Carlos Rojas" },
                email: { type: "string", nullable: true, example: "carlos@empresa.com" },
                role: { type: "string", enum: ["OPERATOR", "ADMIN"], example: "ADMIN" },
                active: { type: "boolean", example: true },
              },
            },
          },
        },
        UserRequest: {
          type: "object",
          required: ["username", "fullName", "password", "role"],
          properties: {
            username: { type: "string", example: "lady" },
            fullName: { type: "string", example: "Lady Real" },
            email: { type: "string", format: "email", nullable: true, example: "lady@empresa.com" },
            password: { type: "string", example: "Secure123!" },
            role: { type: "string", enum: ["OPERATOR", "ADMIN"], example: "OPERATOR" },
            active: { type: "boolean", example: true },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            id: { type: "integer", example: 2 },
            username: { type: "string", example: "lady" },
            fullName: { type: "string", example: "Lady Real" },
            email: { type: "string", format: "email", nullable: true, example: "lady@empresa.com" },
            role: { type: "string", enum: ["OPERATOR", "ADMIN"], example: "OPERATOR" },
            active: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time", example: "2026-03-06T04:25:17.933Z" },
            deletedAt: { type: "string", format: "date-time", nullable: true, example: null },
          },
        },
        ProductRequest: {
          type: "object",
          required: ["name", "reference"],
          properties: {
            name: { type: "string", example: "Lavamanos Delta" },
            reference: { type: "string", example: "LVM-001" },
            description: { type: "string", example: "Lavamanos cerámico color blanco" },
            active: { type: "boolean", example: true },
          },
        },
        ProductResponse: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Lavamanos Delta" },
            reference: { type: "string", example: "LVM-001" },
            description: { type: "string", example: "Lavamanos cerámico color blanco" },
            active: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time", example: "2026-03-06T04:22:56.251Z" },
            deletedAt: { type: "string", format: "date-time", nullable: true, example: null },
          },
        },
        DeliveryRequest: {
          type: "object",
          required: ["productId", "quantity", "deliveredById", "receivedById", "signatureImage"],
          properties: {
            productId: { type: "integer", example: 1 },
            quantity: { type: "integer", example: 3 },
            deliveredById: { type: "integer", example: 1 },
            receivedById: { type: "integer", example: 2 },
            signatureImage: { type: "string", example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." },
          },
        },
        DeliveryResponse: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            status: { type: "string", example: "ACTIVE" },
            productId: { type: "integer", example: 1 },
            quantity: { type: "integer", example: 3 },
            deliveredById: { type: "integer", example: 1 },
            receivedById: { type: "integer", example: 2 },
            signatureImage: { type: "string", example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." },
            createdAt: { type: "string", format: "date-time", example: "2026-03-06T04:25:24.971Z" },
            deletedAt: { type: "string", format: "date-time", nullable: true, example: null },
            product: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                name: { type: "string", example: "Lavamanos Delta" },
                reference: { type: "string", example: "LVM-001" },
                active: { type: "boolean", example: true },
              },
            },
          },
        },

        ProductImportResponse: {
          type: "object",
          properties: {
            totalRows: { type: "integer", example: 10 },
            validRows: { type: "integer", example: 8 },
            importedCount: { type: "integer", example: 6 },
            skippedCount: { type: "integer", example: 2 },
            invalidRows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  row: { type: "integer", example: 4 },
                  reason: { type: "string", example: "name and reference are required" },
                  reference: { type: "string", nullable: true, example: "LVM-001" },
                  value: { type: "string", nullable: true, example: "talvez" },
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Invalid credentials" },
          },
        },
      },
    },
    paths: {
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login de usuario",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Login exitoso",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginResponse" },
                },
              },
            },
            "401": {
              description: "Credenciales inválidas",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/users": {
        get: {
          tags: ["Users"],
          summary: "Listar usuarios",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Lista de usuarios",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/UserResponse" },
                  },
                },
              },
            },
            "401": {
              description: "No autorizado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        post: {
          tags: ["Users"],
          summary: "Crear usuario",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Usuario creado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserResponse" },
                },
              },
            },
          },
        },
      },
      "/api/products": {
        get: {
          tags: ["Products"],
          summary: "Listar productos",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Lista de productos",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ProductResponse" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Products"],
          summary: "Crear producto",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProductRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Producto creado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProductResponse" },
                },
              },
            },
          },
        },
      },

      "/api/products/import": {
        post: {
          tags: ["Products"],
          summary: "Importar productos masivamente desde archivo Excel (.xlsx)",
          description:
            "Sube un archivo .xlsx con encabezados: reference, name, description (opcional), active (opcional)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "Archivo Excel .xlsx",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Resultado de la importación",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProductImportResponse" },
                },
              },
            },
          },
        },
      },
      "/api/deliveries": {
        get: {
          tags: ["Deliveries"],
          summary: "Listar entregas",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Lista de entregas",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/DeliveryResponse" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Deliveries"],
          summary: "Crear entrega",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeliveryRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Entrega creada",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DeliveryResponse" },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
