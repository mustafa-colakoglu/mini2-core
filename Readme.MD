# @mini2/core

**Mini REST Framework** - A lightweight and modular web framework built on top of Express.js. Features TypeScript support, automatic Swagger documentation, dependency injection, and decorator-based routing system for modern API development experience.

## ✨ Features

- 🚀 **Decorator-Based Routing**: Easy route definition with decorators like `@get`, `@post`
- 📝 **Automatic Swagger Documentation**: API documentation generated automatically
- 🔧 **Dependency Injection**: Powerful DI container based on InversifyJS
- 🛡️ **Security Middlewares**: Authentication, authorization, and validation
- 📦 **Full TypeScript Support**: Type-safe API development
- 🎯 **Response Builder**: Consistent API responses
- ⚡ **Quick Setup**: Minimal configuration required

## 📦 Installation

```bash
npm install @mini2/core
```

## 🚀 Quick Start

### 1. Basic Configuration

```typescript
import { App, IConfig } from '@mini2/core';

const config: IConfig = {
	port: 3000,
	host: 'localhost',
	applicationName: 'My API',
};

// Define your controllers
const controllers = [
	// Your controller classes
];

const app = new App(controllers);
await app.init(config);
await app.afterInit();
```

### 2. Creating a Controller

```typescript
import {
	controller,
	get,
	post,
	put,
	del,
	req,
	res,
	ResponseBuilder,
	authenticated,
	authorized,
	validate,
} from '@mini2/core';

@controller('/api/users')
export class UserController {
	@get('/')
	async getUsers(@req() request: Request) {
		const page = Number(request.query.page) || 1;
		const users = await this.userService.findAll(page);
		return new ResponseBuilder().ok(users);
	}

	@post('/')
	@validate({ body: CreateUserDto })
	async createUser(@req() req: Request) {
		const userData = req.body;
		const user = await this.userService.create(userData);
		return new ResponseBuilder().created(user);
	}

	@get('/:id')
	@authenticated()
	@authorized(['user:read'])
	async getUser(@req() req: Request) {
		const id = req.params.id;
		const user = await this.userService.findById(id);
		if (!user) throw new NotFoundException({ message: 'User not found' });
		return new ResponseBuilder().ok(user);
	}

	@put('/:id')
	@authenticated()
	@authorized(['user:write'])
	@validate({ body: UpdateUserDto, params: UserParamsDto })
	async updateUser(@req() req: Request) {
		const id = req.params.id;
		const updateData = req.body;
		const user = await this.userService.update(id, updateData);
		return new ResponseBuilder().ok(user);
	}

	@del('/:id')
	@authenticated()
	@authorized(['admin', 'user:delete'])
	async deleteUser(@req() req: Request) {
		const id = req.params.id;
		await this.userService.delete(id);
		return new ResponseBuilder().ok({ message: 'User deleted successfully' });
	}
}
```

## 🎭 Decorators Deep Dive

Decorators are the core feature of @mini2/core, providing a clean and intuitive way to define routes, middleware, and validation rules.

### 🏷️ Class Decorators

#### **@controller(path?: string)**

Defines a controller class and optionally sets a base path for all routes in the controller.

```typescript
@controller('/api/v1/users')
export class UserController {
	// All routes will be prefixed with '/api/v1/users'
}

@controller('') // No base path
export class HomeController {
	@get('/') // Route: '/'
	home() {
		/* ... */
	}
}
```

**Features:**

- Sets base path for all routes in the controller
- Enables automatic route registration
- Integrates with Swagger documentation generation

### 🚦 HTTP Method Decorators

#### **@get(path: string)**

Defines a GET route handler.

```typescript
@get('/profile')
async getProfile(@req() req: Request) {
  // Handles GET /api/users/profile
  return new ResponseBuilder().ok(req.user);
}

@get('/:id/posts')
async getUserPosts(@req() req: Request) {
  const userId = req.params.id;
  // Handles GET /api/users/:id/posts
}

@get('/search')
async searchUsers(@req() req: Request) {
  const query = req.query.q;
  // Handles GET /api/users/search?q=searchterm
}
```

#### **@post(path: string)**

Defines a POST route handler.

```typescript
@post('/')
@validate({ body: CreateUserDto })
async createUser(@req() req: Request) {
  // Handles POST /api/users
  const userData = req.body;
  return new ResponseBuilder().created(userData);
}

@post('/:id/avatar')
@authenticated()
async uploadAvatar(@req() req: Request) {
  const id = req.params.id;
  // Handles POST /api/users/:id/avatar
}
```

#### **@put(path: string)**

Defines a PUT route handler for full resource updates.

```typescript
@put('/:id')
@authenticated()
@validate({ body: UpdateUserDto })
async updateUser(@req() req: Request) {
  const id = req.params.id;
  const data = req.body;
  // Handles PUT /api/users/:id
}
```

#### **@patch(path: string)**

Defines a PATCH route handler for partial resource updates.

```typescript
@patch('/:id')
@authenticated()
@validate({ body: PartialUserDto })
async patchUser(@req() req: Request) {
  const id = req.params.id;
  const data = req.body;
  // Handles PATCH /api/users/:id
}
```

#### **@del(path: string)**

Defines a DELETE route handler. Note: uses `@del` instead of `@delete` (reserved keyword).

```typescript
@del('/:id')
@authenticated()
@authorized(['admin'])
async deleteUser(@req() req: Request) {
  const id = req.params.id;
  // Handles DELETE /api/users/:id
}
```

### 📝 Parameter Decorators

Parameter decorators inject Express request/response objects into method parameters.

#### **@req()**

Injects the Express request object.

```typescript
@get('/:id')
async getUser(@req() request: Request) {
  const id = request.params.id;
  const userAgent = request.headers['user-agent'];
  const query = request.query;
  // Full access to Express Request object
}
```

#### **@res()**

Injects the Express response object. **Note: If you use @res(), you must handle the response manually.**

```typescript
@get('/download/:file')
async downloadFile(@req() req: Request, @res() res: Response) {
  const filename = req.params.file;

  // Manual response handling required
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.sendFile(path.join(__dirname, 'files', filename));

  // Don't return ResponseBuilder when using @res()
}
```

### 🛡️ Security Decorators

#### **@authenticated()**

Ensures the user is authenticated before accessing the route.

```typescript
@get('/profile')
@authenticated()
async getProfile(@req() req: Request) {
  // req.authenticated is guaranteed to be true
  // User must be logged in to access this route
  return new ResponseBuilder().ok(req.user);
}
```

**Requirements:**

- Request must have `authenticated: true` property
- Usually set by authentication middleware
- Throws `UnauthorizedException` if not authenticated

#### **@authorized(permissions: string | string[])**

Checks if the authenticated user has required permissions.

```typescript
@del('/:id')
@authenticated()
@authorized(['admin'])
async deleteUser(@req() req: Request) {
  // Only users with 'admin' permission can access
  const id = req.params.id;
}

@get('/reports')
@authenticated()
@authorized(['reports:read', 'admin'])
async getReports(@req() req: Request) {
  // Users need either 'reports:read' OR 'admin' permission
}
```

**Requirements:**

- User must be authenticated first
- Request must have `user.permissions: string[]` property
- Uses OR logic: user needs ANY of the specified permissions
- Throws `ForbiddenException` if insufficient permissions

### ✅ Validation Decorators

#### **@validate(options: ValidationOptions)**

Validates request data using class-validator.

```typescript
@post('/')
@validate({
  body: CreateUserDto,
  params: UserParamsDto,
  query: SearchQueryDto
})
async createUser(@req() req: Request) {
  // req.body, req.params, req.query are validated and transformed
  const userData = req.body as CreateUserDto; // Typed as CreateUserDto
  const params = req.params as UserParamsDto;  // Typed as UserParamsDto
  const query = req.query as SearchQueryDto;    // Typed as SearchQueryDto
}
```

**Options:**

- `body`: DTO class for request body validation
- `params`: DTO class for URL parameters validation
- `query`: DTO class for query parameters validation

**Example DTO Classes:**

```typescript
import {
	IsEmail,
	IsString,
	MinLength,
	IsOptional,
	IsNumber,
} from 'class-validator';

export class CreateUserDto {
	@IsEmail()
	email: string;

	@IsString()
	@MinLength(3)
	name: string;

	@IsOptional()
	@IsNumber()
	age?: number;
}

export class UserParamsDto {
	@IsString()
	id: string;
}

export class SearchQueryDto {
	@IsOptional()
	@IsString()
	q?: string;

	@IsOptional()
	@IsNumber()
	page?: number = 1;
}
```

### 🔧 Custom Middleware Decorators

#### **@middleware(middleware: RequestHandler)**

Adds custom Express middleware to a specific route.

```typescript
import rateLimit from 'express-rate-limit';
import multer from 'multer';

const uploadMiddleware = multer({ dest: 'uploads/' });
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

@post('/upload')
@middleware(uploadMiddleware.single('file'))
@middleware(limiter)
async uploadFile(@req() req: Request) {
  // Custom middleware applied before route handler
  const file = req.file;
  return new ResponseBuilder().created({ filename: file?.filename });
}
```

### 🔄 Decorator Combination and Order

Decorators can be combined and are executed in a specific order:

```typescript
@post('/:id/activate')
@middleware(loggingMiddleware)      // 1. Custom middleware first
@authenticated()                   // 2. Authentication check
@authorized(['admin'])             // 3. Authorization check
@validate({
  params: UserParamsDto,           // 4. Validation (params, query, body)
  body: ActivationDto
})
async activateUser(@req() req: Request) {
  // 5. Route handler executes last
  const id = req.params.id;
  const data = req.body;
}
```

**Execution Order:**

1. Custom middlewares (from `@middleware`)
2. Authentication middleware (from `@authenticated`)
3. Authorization middleware (from `@authorized`)
4. Validation middleware (from `@validate`)
5. Route handler method

### 🎯 Advanced Decorator Patterns

#### **Multiple HTTP Methods on Same Path**

```typescript
@controller('/api/users/:id')
export class UserDetailController {
	@get('/')
	async getUser(@req() req: Request) {
		// GET /api/users/:id
		const id = req.params.id;
	}

	@put('/')
	@validate({ body: UpdateUserDto })
	async updateUser(@req() req: Request) {
		// PUT /api/users/:id
		const id = req.params.id;
		const data = req.body;
	}

	@del('/')
	@authorized(['admin'])
	async deleteUser(@req() req: Request) {
		// DELETE /api/users/:id
		const id = req.params.id;
	}
}
```

#### **Conditional Decorators**

```typescript
export class UserController {
	@get('/public')
	async getPublicUsers(@req() req: Request) {
		// No authentication required
	}

	@get('/private')
	@authenticated()
	async getPrivateUsers(@req() req: Request) {
		// Authentication required
	}
}
```

## 📚 API Reference

### 🏗️ Core Classes

#### **App**

Main application class that manages the Express server.

```typescript
import { App, IConfig } from '@mini2/core';

const app = new App(controllers);
await app.init(config); // Start the server
await app.afterInit(); // Post-initialization tasks
```

**Properties:**

- Express server management
- Middleware configuration
- Swagger documentation integration
- Controller routing system

#### **Container & container**

InversifyJS containers for dependency injection.

```typescript
import { Container, container } from '@mini2/core';

// Create new container
const myContainer = new Container();
myContainer.bind('UserService').to(UserService);

// Use pre-configured container
container.bind('UserService').to(UserService);
```

### 📋 Interfaces

#### **IConfig**

```typescript
interface IConfig {
	host: string; // Server host address
	port: number; // Server port
	applicationName: string; // Application name
}
```

#### **IApp**

```typescript
interface IApp {
	init(config: IConfig): Promise<void>;
	afterInit(): Promise<void>;
}
```

#### **IRepository<IdentifierType, ModelType>**

Generic repository pattern interface.

```typescript
interface IRepository<IdentifierType, ModelType> {
	findAll(): Promise<(ModelType & TimestampFields)[]>;
	findById(id: IdentifierType): Promise<(ModelType & TimestampFields) | null>;
	create(item: ModelType): Promise<ModelType & TimestampFields>;
	update(
		id: IdentifierType,
		item: Partial<ModelType>
	): Promise<ModelType & TimestampFields>;
	delete(id: IdentifierType): Promise<void>;
	findPaginated(
		query: Partial<ModelType>,
		page: number,
		limit: number
	): Promise<(ModelType & TimestampFields)[]>;
	mapper(model: any): ModelType & TimestampFields;
}
```

#### **IResponseBuilder<T>**

```typescript
interface IResponseBuilder<T = any> {
	status: number;
	data: T;
	headers: Record<string, string>;
	isFile: boolean;

	ok(data: T): IResponseBuilder<T>;
	created(data: T): IResponseBuilder<T>;
	setHeader(key: string, value: string): IResponseBuilder<T>;
	setHeaders(headers: Record<string, string>): IResponseBuilder<T>;
	asFile(): IResponseBuilder<T>;
	build(res: Response): void;
}
```

### 🛡️ Middlewares

#### **validationMiddleware**

Class-validator based data validation.

```typescript
import { validationMiddleware } from '@mini2/core';

// Usage in controller
@post('/users')
@validate({ body: CreateUserDto })
async createUser(@req() req: Request) {
  // Validated data available in req.body
}
```

**Supported Validation Types:**

- `body` - Request body validation
- `params` - URL parameters validation
- `query` - Query parameters validation

#### **authenticatedMiddleware**

Authentication control middleware.

```typescript
import { authenticatedMiddleware, IAuthenticatedRequest } from '@mini2/core';

// Usage
@get('/profile')
@authenticated()
async getProfile(@req() req: IAuthenticatedRequest) {
  // req.authenticated === true is guaranteed
}
```

#### **authorizedMiddleware**

Authorization control middleware.

```typescript
import { authorizedMiddleware } from '@mini2/core';

// Usage
@del('/admin/users/:id')
@authenticated()
@authorized(['admin', 'user:delete'])
async deleteUser(@req() req: Request) {
  // req.user.permissions is checked
}
```

### 🎯 Response Builder

Standardizes HTTP responses with a fluent API.

```typescript
import { ResponseBuilder } from '@mini2/core';

// Basic usage
return new ResponseBuilder().ok({ message: 'Success', data: users });

// Created response
return new ResponseBuilder()
	.created({ id: newUser.id })
	.setHeader('Location', `/users/${newUser.id}`);

// File response
return new ResponseBuilder()
	.ok(fileBuffer)
	.setHeader('Content-Type', 'application/pdf')
	.asFile();

// Custom status and headers
return new ResponseBuilder()
	.status(202)
	.setHeaders({
		'X-Process-Id': processId,
		'Cache-Control': 'no-cache',
	})
	.ok({ status: 'processing' });
```

**Methods:**

- `ok(data)` - 200 OK response
- `created(data)` - 201 Created response
- `status(code)` - Set custom status code
- `setHeader(key, value)` - Set single header
- `setHeaders(headers)` - Set multiple headers
- `asFile()` - Mark response as file download
- `build(res)` - Build and send response

### ⚠️ Exception Handling

Pre-defined HTTP exceptions for common error scenarios.

```typescript
import {
	HttpException,
	BadRequestException,
	UnauthorizedException,
	ForbiddenException,
	NotFoundException,
	ConflictException,
	UnprocessableEntityException,
	InternalServerErrorException,
} from '@mini2/core';

// Basic usage
throw new BadRequestException({
	message: 'Invalid input data',
	validationErrors: [{ field: 'email', errors: ['Invalid email format'] }],
});

// Custom exception
throw new HttpException(
	{
		message: 'Custom error message',
		errorId: 1001,
	},
	422
);

// Not found
throw new NotFoundException({
	message: 'User not found',
	errorId: 404001,
});
```

**Available Exceptions:**

- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `PaymentRequiredException` (402)
- `ForbiddenException` (403)
- `NotFoundException` (404)
- `MethodNotAllowedException` (405)
- `NotAcceptableException` (406)
- `ConflictException` (409)
- `UnprocessableEntityException` (422)
- `TooManyRequestsException` (429)
- `InternalServerErrorException` (500)
- `NotImplementedException` (501)
- `BadGatewayException` (502)
- `ServiceUnavailableException` (503)
- `GatewayTimeoutException` (504)

### 🛠️ Utility Functions

#### **arrayUnify**

Merges array elements and removes duplicates.

```typescript
import { arrayUnify } from '@mini2/core';

const result = arrayUnify([1, 2, 2, 3, 1]); // [1, 2, 3]
const strings = arrayUnify(['a', 'b', 'a', 'c']); // ['a', 'b', 'c']
```

#### **Math Utilities**

```typescript
import { sum } from '@mini2/core';

const result = sum(5, 3); // 8
```

### 📖 Swagger Integration

@mini2/core automatically generates comprehensive API documentation using Swagger/OpenAPI 3.0 specification based on your decorators and DTOs.

#### **📍 API Documentation Endpoints**

When your application starts, Swagger documentation is automatically available at:

```typescript
// Interactive Swagger UI - Test your API directly in browser
http://localhost:3000/api-docs

// Raw OpenAPI JSON specification - For tools, imports, etc.
http://localhost:3000/api-docs.json
```

#### **🔧 Automatic Documentation Features**

- **Route Discovery**: All `@controller` and HTTP method decorators are automatically documented
- **Request/Response Schemas**: DTO classes with `class-validator` decorators generate JSON schemas
- **Security Requirements**: `@authenticated` and `@authorized` decorators add security info
- **Parameter Documentation**: Path parameters, query parameters, and request bodies are documented
- **HTTP Status Codes**: Response codes from `ResponseBuilder` and exceptions are included

#### **📋 Example Generated Documentation**

For this controller:

```typescript
@controller('/api/users')
export class UserController {
	@get('/:id')
	@authenticated()
	@authorized(['user:read'])
	@validate({ params: UserParamsDto })
	async getUser(@req() req: Request) {
		const id = req.params.id;
		const user = await this.userService.findById(id);
		return new ResponseBuilder().ok(user);
	}

	@post('/')
	@validate({ body: CreateUserDto })
	async createUser(@req() req: Request) {
		const userData = req.body;
		const user = await this.userService.create(userData);
		return new ResponseBuilder().created(user);
	}
}
```

Swagger will automatically generate:

- **GET /api/users/{id}** - Requires authentication and authorization
- **POST /api/users** - With CreateUserDto schema for request body
- Parameter definitions, security requirements, and response schemas

#### **🎯 DTO-Based Schema Generation**

Class-validator decorators automatically create OpenAPI schemas:

```typescript
export class CreateUserDto {
	@IsEmail()
	email: string;

	@IsString()
	@MinLength(2)
	name: string;

	@IsOptional()
	@IsNumber()
	@Min(0)
	age?: number;
}
```

#### **⚙️ Swagger Configuration**

Default configuration is applied automatically, but you can customize it:

```typescript
const swaggerOptions = {
	title: config.applicationName,
	description: `API documentation for ${config.applicationName}`,
	version: '1.0.0',
	servers: [{ url: `http://${config.host}:${config.port}` }],
	docsPath: '/api-docs', // Swagger UI endpoint
	jsonPath: '/api-docs.json', // OpenAPI JSON endpoint
	components: {
		securitySchemes: {
			bearerAuth: {
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
			},
		},
	},
};
```

#### **🔐 Security Documentation**

Security decorators automatically add authentication requirements:

```typescript
@get('/profile')
@authenticated()
@authorized(['user:profile'])
async getProfile(@req() req: Request) {
  // Swagger will show:
  // - 🔒 Authentication required
  // - 🛡️ Requires 'user:profile' permission
  // - 401 Unauthorized response possible
  // - 403 Forbidden response possible
}
```

#### **📊 Response Documentation**

ResponseBuilder methods automatically document response types:

```typescript
@post('/users')
async createUser(@req() req: Request) {
  const user = await this.userService.create(req.body);

  // Swagger documents:
  // - 201 Created status
  // - User object schema in response body
  // - Location header if set
  return new ResponseBuilder()
    .created(user)
    .setHeader('Location', `/users/${user.id}`);
}
```

#### **🚀 Production Usage**

- Swagger UI is automatically available in all environments
- For production, consider disabling Swagger UI and keeping only JSON endpoint
- OpenAPI JSON can be used with external documentation tools
- All validation errors are automatically documented with examples

### 📝 TypeScript Support

Full TypeScript support with type-safe API development:

```typescript
// Strong typing for DTOs
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsNumber()
  age?: number;
}

// Type-safe controller methods
@post('/users')
@validate({ body: CreateUserDto })
async createUser(@req() req: Request): Promise<ResponseBuilder<User>> {
  const userData = req.body as CreateUserDto; // Type-safe after validation
  const user = await this.userService.create(userData);
  return new ResponseBuilder<User>().created(user);
}
```

## 🔧 Advanced Usage

### Custom Middleware Creation

```typescript
import { RequestHandler } from 'express';
import { middleware } from '@mini2/core';

// Logging middleware
const loggingMiddleware: RequestHandler = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

// Rate limiting middleware
const createRateLimiter = (requests: number, windowMs: number): RequestHandler => {
  const requests_map = new Map();
  return (req, res, next) => {
    const clientId = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    const clientRequests = requests_map.get(clientId) || [];
    const recentRequests = clientRequests.filter((time: number) => time > windowStart);

    if (recentRequests.length >= requests) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    recentRequests.push(now);
    requests_map.set(clientId, recentRequests);
    next();
  };
};

// Usage in controller
@get('/users')
@middleware(loggingMiddleware)
@middleware(createRateLimiter(10, 60000))
async getUsers(@req() req: Request) {
  // Middleware chain: logging -> rate limiting -> route handler
}
```

### Dependency Injection Patterns

```typescript
import { Container, injectable, inject } from '@mini2/core';

// Service interfaces
interface IUserService {
	create(userData: CreateUserDto): Promise<User>;
	findById(id: string): Promise<User | null>;
}

// Service implementations
@injectable()
class UserService implements IUserService {
	constructor(@inject('UserRepository') private userRepo: IUserRepository) {}

	async create(userData: CreateUserDto): Promise<User> {
		return this.userRepo.create(userData);
	}

	async findById(id: string): Promise<User | null> {
		return this.userRepo.findById(id);
	}
}

// Container configuration
container.bind<IUserRepository>('UserRepository').to(UserRepository);
container.bind<IUserService>('UserService').to(UserService);

// Controller with dependency injection
@controller('/api/users')
@injectable()
export class UserController {
	constructor(@inject('UserService') private userService: IUserService) {}

	@post('/')
	@validate({ body: CreateUserDto })
	async createUser(@req() req: Request) {
		const userData = req.body;
		const user = await this.userService.create(userData);
		return new ResponseBuilder().created(user);
	}
}
```

## 📋 Complete Export List

```typescript
// Core classes
export { App } from '@mini2/core';
export { Container, container } from '@mini2/core';

// Interfaces
export {
	IApp,
	IConfig,
	IRepository,
	IResponseBuilder,
	IAuthenticatedRequest,
} from '@mini2/core';

// Middlewares
export {
	validationMiddleware,
	authenticatedMiddleware,
	authorizedMiddleware,
} from '@mini2/core';

// Utilities
export { arrayUnify, sum, ResponseBuilder } from '@mini2/core';

// Exceptions
export {
	HttpException,
	BadRequestException,
	UnauthorizedException,
	ForbiddenException,
	NotFoundException,
	MethodNotAllowedException,
	ConflictException,
	UnprocessableEntityException,
	TooManyRequestsException,
	InternalServerErrorException,
	// ... all other exceptions
} from '@mini2/core';

// Types and constants
export { MINI_TYPES } from '@mini2/core';

// Decorators
export {
	controller,
	get,
	post,
	put,
	del,
	patch,
	req,
	res,
	authenticated,
	authorized,
	validate,
	middleware,
} from '@mini2/core';

// Swagger
export { SwaggerIntegration, SwaggerOptions } from '@mini2/core';

// REST utilities
export { buildApp, Method, RouteOptions } from '@mini2/core';
```

## 📄 License

ISC

## 👨‍💻 Author

**Mustafa Çolakoğlu**  
Email: mustafacolakoglu94@gmail.com  
GitHub: https://github.com/mustafa-colakoglu

---

**Note:** This framework is actively maintained. Visit the GitHub repository for contributions and suggestions.
