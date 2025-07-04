/**
 * OpenAPI/Swagger configuration for Splitwise API
 */

import swaggerJSDoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Splitwise MVP API',
      version: '1.0.0',
      description: `
        A comprehensive expense splitting application API that helps users track, visualize, and settle shared expenses transparently and automatically.
        
        ## Core Features
        - **User Authentication**: JWT-based authentication with registration and login
        - **Group Management**: Create and manage expense-sharing groups with role-based access
        - **Expense Tracking**: Add, edit, and categorize expenses with flexible splitting methods
        - **Balance Calculation**: Real-time balance tracking with debt optimization
        - **Settlement System**: Complete settlement workflow with status management
        
        ## Authentication
        Most endpoints require authentication via JWT Bearer token. Include the token in the Authorization header:
        \`Authorization: Bearer your_jwt_token_here\`
        
        ## Error Handling
        All endpoints return consistent error responses with the format:
        \`\`\`json
        {
          "success": false,
          "error": "Error message description",
          "details": {} // Optional additional error details
        }
        \`\`\`
        
        ## Data Formats
        - All monetary amounts are decimal numbers with 2 decimal places
        - Dates are in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
        - User IDs and other identifiers use CUID format
      `,
      contact: {
        name: 'Splitwise Development Team',
        email: 'dev@splitwise.app'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.splitwise.app/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication. Include "Bearer " prefix.'
        }
      },
      schemas: {
        // Base response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            }
          },
          required: ['success']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message description'
            },
            details: {
              type: 'object',
              description: 'Additional error details (optional)'
            }
          },
          required: ['success', 'error']
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 20
            },
            total: {
              type: 'integer',
              minimum: 0,
              example: 150
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              example: 8
            }
          },
          required: ['page', 'limit', 'total', 'totalPages']
        },
        
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'John Doe'
            },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/avatar.jpg'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          },
          required: ['id', 'email', 'name', 'createdAt', 'updatedAt']
        },
        UserRegistration: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'John Doe'
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'securePassword123!'
            },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/avatar.jpg'
            }
          },
          required: ['email', 'name', 'password']
        },
        UserLogin: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              example: 'securePassword123!'
            }
          },
          required: ['email', 'password']
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
              },
              required: ['user', 'token']
            }
          },
          required: ['success', 'data']
        },
        
        // Group schemas
        GroupRole: {
          type: 'string',
          enum: ['ADMIN', 'MEMBER'],
          example: 'MEMBER'
        },
        GroupMember: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            userId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            groupId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            role: {
              $ref: '#/components/schemas/GroupRole'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            joinedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          },
          required: ['id', 'userId', 'groupId', 'role', 'user', 'joinedAt']
        },
        Group: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Weekend Trip to Mountains'
            },
            description: {
              type: 'string',
              maxLength: 500,
              nullable: true,
              example: 'Shared expenses for our weekend getaway'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            members: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/GroupMember'
              }
            }
          },
          required: ['id', 'name', 'createdAt', 'updatedAt', 'members']
        },
        CreateGroup: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Weekend Trip to Mountains'
            },
            description: {
              type: 'string',
              maxLength: 500,
              nullable: true,
              example: 'Shared expenses for our weekend getaway'
            }
          },
          required: ['name']
        },
        
        // Expense schemas
        ExpenseCategory: {
          type: 'string',
          enum: ['GENERAL', 'FOOD', 'TRANSPORTATION', 'ENTERTAINMENT', 'UTILITIES', 'SHOPPING', 'HEALTHCARE', 'TRAVEL', 'EDUCATION', 'OTHER'],
          example: 'FOOD'
        },
        ExpenseSplit: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            userId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            expenseId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            amountOwed: {
              type: 'number',
              multipleOf: 0.01,
              minimum: 0,
              example: 25.50
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          },
          required: ['id', 'userId', 'expenseId', 'amountOwed', 'user']
        },
        Expense: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            groupId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            amount: {
              type: 'number',
              multipleOf: 0.01,
              minimum: 0,
              example: 102.50
            },
            description: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'Dinner at Italian Restaurant'
            },
            category: {
              $ref: '#/components/schemas/ExpenseCategory'
            },
            paidBy: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            payer: {
              $ref: '#/components/schemas/User'
            },
            splits: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ExpenseSplit'
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          },
          required: ['id', 'groupId', 'amount', 'description', 'category', 'paidBy', 'payer', 'splits', 'createdAt', 'updatedAt']
        },
        CreateExpense: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            amount: {
              type: 'number',
              multipleOf: 0.01,
              minimum: 0,
              example: 102.50
            },
            description: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'Dinner at Italian Restaurant'
            },
            category: {
              $ref: '#/components/schemas/ExpenseCategory'
            },
            paidBy: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            splits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    pattern: '^c[a-z0-9]{24}$',
                    example: 'clm123abc456def789ghi012j'
                  },
                  amount: {
                    type: 'number',
                    multipleOf: 0.01,
                    minimum: 0,
                    example: 25.50
                  }
                },
                required: ['userId', 'amount']
              }
            }
          },
          required: ['groupId', 'amount', 'description', 'paidBy', 'splits']
        },
        
        // Settlement schemas
        SettlementStatus: {
          type: 'string',
          enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
          example: 'PENDING'
        },
        Settlement: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            groupId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            payerId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            recipientId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            amount: {
              type: 'number',
              multipleOf: 0.01,
              minimum: 0,
              example: 75.25
            },
            status: {
              $ref: '#/components/schemas/SettlementStatus'
            },
            payer: {
              $ref: '#/components/schemas/User'
            },
            recipient: {
              $ref: '#/components/schemas/User'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            confirmedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-15T11:00:00.000Z'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-15T11:30:00.000Z'
            }
          },
          required: ['id', 'groupId', 'payerId', 'recipientId', 'amount', 'status', 'payer', 'recipient', 'createdAt', 'updatedAt']
        },
        
        // Balance schemas
        Balance: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              pattern: '^c[a-z0-9]{24}$',
              example: 'clm123abc456def789ghi012j'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            amount: {
              type: 'number',
              example: -25.50,
              description: 'Positive values indicate user is owed money, negative values indicate user owes money'
            }
          },
          required: ['userId', 'user', 'amount']
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and account management'
      },
      {
        name: 'Groups',
        description: 'Group management and member operations'
      },
      {
        name: 'Expenses',
        description: 'Expense creation, editing, and management'
      },
      {
        name: 'Balances',
        description: 'Balance calculations and debt tracking'
      },
      {
        name: 'Settlements',
        description: 'Settlement workflow and debt resolution'
      }
    ]
  },
  apis: [
    './src/routes/*.ts', // Path to the API files
    './src/lib/swagger.ts' // Include this file for component definitions
  ]
};

const specs = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
  // Swagger page
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customfavIcon: '/favicon.ico',
    customSiteTitle: 'Splitwise API Documentation',
    customCss: `
      .topbar-wrapper .download-url-wrapper {
        display: none;
      }
      .swagger-ui .topbar {
        background-color: #2563eb;
      }
      .swagger-ui .topbar .download-url-wrapper .select-label {
        color: white;
      }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true,
      requestInterceptor: (req: any) => {
        // Log API requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Swagger API Request:', req.method, req.url);
        }
        return req;
      }
    }
  }));

  // Docs in JSON format
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 API Documentation available at: http://localhost:3001/api/docs');
}

export { specs };