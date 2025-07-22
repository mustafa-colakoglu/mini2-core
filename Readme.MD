# @mini2/core

**Mini REST Framework** - A lightweight and modular web framework built on top of Express.js. Features TypeScript support, automatic Swagger documentation, dependency injection, and decorator-based routing system for modern API development experience.

## ✨ Features

- 🚀 **Decorator-Based Routing**: Easy route definition with decorators like `@Get`, `@Post`
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

### Peer Dependencies (Optional)

```bash
# If using MongoDB
npm install mongoose
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
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	ResponseBuilder,
	Authenticated,
	Authorized,
	Validation,
} from '@mini2/core';

@Controller('/api/users')
export class UserController {
	@Get('/')
	async getUsers(@Query('page') page: number = 1) {
		const users = await this.userService.findAll(page);
		return new ResponseBuilder().ok(users);
	}

	@Post('/')
	@Validation({ body: CreateUserDto })
	async createUser(@Body() userData: CreateUserDto) {
		const user = await this.userService.create(userData);
		return new ResponseBuilder().created(user);
	}

	@Get('/:id')
	@Authenticated()
	@Authorized(['user:read'])
	async getUser(@Param('id') id: string) {
		const user = await this.userService.findById(id);
		if (!user) throw new NotFoundException({ message: 'User not found' });
		return new ResponseBuilder().ok(user);
	}

	@Put('/:id')
	@Authenticated()
	@Authorized(['user:write'])
	@Validation({ body: UpdateUserDto, params: UserParamsDto })
	async updateUser(@Param('id') id: string, @Body() updateData: UpdateUserDto) {
		const user = await this.userService.update(id, updateData);
		return new ResponseBuilder().ok(user);
	}

	@Delete('/:id')
	@Authenticated()
	@Authorized(['admin', 'user:delete'])
	async deleteUser(@Param('id') id: string) {
		await this.userService.delete(id);
		return new ResponseBuilder().ok({ message: 'User deleted successfully' });
	}
}
```

## 🎭 Decorators Deep Dive

Decorators are the core feature of @mini2/core, providing a clean and intuitive way to define routes, middleware, and validation rules.

### 🏷️ Class Decorators

#### **@Controller(path?: string)**

Defines a controller class and optionally sets a base path for all routes in the controller.

```typescript
@Controller('/api/v1/users')
export class UserController {
	// All routes will be prefixed with '/api/v1/users'
}

@Controller() // No base path
export class HomeController {
	@Get('/') // Route: '/'
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

#### **@Get(path: string)**

Defines a GET route handler.

```typescript
@Get('/profile')
async getProfile() {
  // Handles GET /api/users/profile
}

@Get('/:id/posts')
async getUserPosts(@Param('id') userId: string) {
  // Handles GET /api/users/:id/posts
}

@Get('/search')
async searchUsers(@Query('q') query: string) {
  // Handles GET /api/users/search?q=searchterm
}
```

#### **@Post(path: string)**

Defines a POST route handler.

```typescript
@Post('/')
@Validation({ body: CreateUserDto })
async createUser(@Body() userData: CreateUserDto) {
  // Handles POST /api/users
}

@Post('/:id/avatar')
@Authenticated()
async uploadAvatar(@Param('id') id: string, @Body() file: any) {
  // Handles POST /api/users/:id/avatar
}
```

#### **@Put(path: string)**

Defines a PUT route handler for full resource updates.

```typescript
@Put('/:id')
@Authenticated()
@Validation({ body: UpdateUserDto, params: UserParamsDto })
async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) {
  // Handles PUT /api/users/:id
}
```

#### **@Patch(path: string)**

Defines a PATCH route handler for partial resource updates.

```typescript
@Patch('/:id')
@Authenticated()
@Validation({ body: PartialUserDto })
async patchUser(@Param('id') id: string, @Body() data: PartialUserDto) {
  // Handles PATCH /api/users/:id
}
```

#### **@Delete(path: string)**

Defines a DELETE route handler.

```typescript
@Delete('/:id')
@Authenticated()
@Authorized(['admin'])
async deleteUser(@Param('id') id: string) {
  // Handles DELETE /api/users/:id
}
```

### 📝 Parameter Decorators

Parameter decorators extract data from the HTTP request and inject it into method parameters.

#### **@Param(name?: string)**

Extracts URL parameters from the route path.

```typescript
@Get('/:id')
async getUser(@Param('id') id: string) {
  // Extracts 'id' from URL: /api/users/123 -> id = '123'
}

@Get('/:userId/posts/:postId')
async getUserPost(
  @Param('userId') userId: string,
  @Param('postId') postId: string
) {
  // Extracts multiple parameters
}

@Get('/:id')
async getUser(@Param() params: { id: string }) {
  // Extracts all parameters as an object
}
```

#### **@Body()**

Extracts the request body.

```typescript
@Post('/')
async createUser(@Body() userData: CreateUserDto) {
  // Gets the entire request body
}

@Post('/bulk')
async createUsers(@Body() users: CreateUserDto[]) {
  // Handles arrays in request body
}
```

#### **@Query(name?: string)**

Extracts query parameters from the URL.

```typescript
@Get('/search')
async searchUsers(@Query('q') searchTerm: string) {
  // From: /api/users/search?q=john -> searchTerm = 'john'
}

@Get('/')
async getUsers(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
  @Query('sort') sort?: string
) {
  // Multiple query parameters with defaults
}

@Get('/')
async getUsers(@Query() query: { page: number; limit: number }) {
  // All query parameters as an object
}
```

#### **@Header(name?: string)**

Extracts headers from the request.

```typescript
@Get('/protected')
async getProtectedResource(@Header('authorization') auth: string) {
  // Extracts Authorization header
}

@Post('/upload')
async uploadFile(@Header('content-type') contentType: string) {
  // Extracts Content-Type header
}
```

#### **@Req(), @Res(), @Next()**

Injects Express request, response, and next function objects.

```typescript
@Get('/custom')
async customHandler(
  @Req() req: Request,
  @Res() res: Response,
  @Next() next: NextFunction
) {
  // Direct access to Express objects
  console.log(req.ip, req.method, req.path);
  // Note: If you use @Res(), you must handle the response manually
}
```

### 🛡️ Security Decorators

#### **@Authenticated()**

Ensures the user is authenticated before accessing the route.

```typescript
@Get('/profile')
@Authenticated()
async getProfile(@Req() req: IAuthenticatedRequest) {
  // req.authenticated is guaranteed to be true
  // User must be logged in to access this route
}
```

**Requirements:**

- Request must have `authenticated: true` property
- Usually set by authentication middleware
- Throws `UnauthorizedException` if not authenticated

#### **@Authorized(permissions: string[])**

Checks if the authenticated user has required permissions.

```typescript
@Delete('/:id')
@Authenticated()
@Authorized(['admin'])
async deleteUser(@Param('id') id: string) {
  // Only users with 'admin' permission can access
}

@Get('/reports')
@Authenticated()
@Authorized(['reports:read', 'admin'])
async getReports() {
  // Users need either 'reports:read' OR 'admin' permission
}
```

**Requirements:**

- User must be authenticated first
- Request must have `user.permissions: string[]` property
- Uses OR logic: user needs ANY of the specified permissions
- Throws `ForbiddenException` if insufficient permissions

### ✅ Validation Decorators

#### **@Validation(options: ValidationOptions)**

Validates request data using class-validator.

```typescript
@Post('/')
@Validation({
  body: CreateUserDto,
  params: UserParamsDto,
  query: SearchQueryDto
})
async createUser(
  @Body() userData: CreateUserDto,
  @Param() params: UserParamsDto,
  @Query() query: SearchQueryDto
) {
  // All parameters are validated and transformed
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

#### **@Middleware(middleware: RequestHandler | RequestHandler[])**

Adds custom Express middleware to a specific route.

```typescript
import rateLimit from 'express-rate-limit';
import multer from 'multer';

const uploadMiddleware = multer({ dest: 'uploads/' });
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

@Post('/upload')
@Middleware([uploadMiddleware.single('file'), limiter])
async uploadFile(@Body() file: Express.Multer.File) {
  // Custom middleware applied before route handler
}

@Get('/limited')
@Middleware(limiter)
async limitedEndpoint() {
  // Rate limiting applied
}
```

### 🔄 Decorator Combination and Order

Decorators can be combined and are executed in a specific order:

```typescript
@Post('/:id/activate')
@Middleware(loggingMiddleware)      // 1. Custom middleware first
@Authenticated()                   // 2. Authentication check
@Authorized(['admin'])             // 3. Authorization check
@Validation({
  params: UserParamsDto,           // 4. Validation (params, query, body)
  body: ActivationDto
})
async activateUser(
  @Param('id') id: string,
  @Body() data: ActivationDto
) {
  // 5. Route handler executes last
}
```

**Execution Order:**

1. Custom middlewares (from `@Middleware`)
2. Authentication middleware (from `@Authenticated`)
3. Authorization middleware (from `@Authorized`)
4. Validation middleware (from `@Validation`)
5. Route handler method

### 🎯 Advanced Decorator Patterns

#### **Multiple HTTP Methods on Same Path**

```typescript
@Controller('/api/users/:id')
export class UserDetailController {
	@Get('/')
	async getUser(@Param('id') id: string) {
		// GET /api/users/:id
	}

	@Put('/')
	@Validation({ body: UpdateUserDto })
	async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) {
		// PUT /api/users/:id
	}

	@Delete('/')
	@Authorized(['admin'])
	async deleteUser(@Param('id') id: string) {
		// DELETE /api/users/:id
	}
}
```

#### **Conditional Decorators**

```typescript
export class UserController {
	@Get('/public')
	async getPublicUsers() {
		// No authentication required
	}

	@Get('/private')
	@Authenticated()
	async getPrivateUsers() {
		// Authentication required
	}
}
```

#### **Decorator Inheritance**

```typescript
@Controller('/api/admin')
@Authenticated() // Applied to all methods
@Authorized(['admin']) // Applied to all methods
export class AdminController {
	@Get('/users')
	async getUsers() {
		// Inherits @Authenticated and @Authorized
	}

	@Post('/settings')
	@Validation({ body: SettingsDto })
	async updateSettings(@Body() settings: SettingsDto) {
		// Inherits authentication + adds validation
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
@Post('/users')
@Validation({ body: CreateUserDto })
async createUser(@Body() data: CreateUserDto) {
  // Validated data available here
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
@Get('/profile')
@Authenticated()
async getProfile(@Req() req: IAuthenticatedRequest) {
  // req.authenticated === true is guaranteed
}
```

#### **authorizedMiddleware**

Authorization control middleware.

```typescript
import { authorizedMiddleware } from '@mini2/core';

// Usage
@Delete('/admin/users/:id')
@Authenticated()
@Authorized(['admin', 'user:delete'])
async deleteUser(@Param('id') id: string) {
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

// Error responses
return new ResponseBuilder().status(400).ok({
	error: 'Invalid input',
	code: 'VALIDATION_ERROR',
});
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

// Validation error
throw new UnprocessableEntityException({
	message: 'Validation failed',
	validationErrors: [
		{ field: 'age', errors: ['Must be at least 18'] },
		{ field: 'email', errors: ['Email already exists'] },
	],
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

Automatic API documentation is generated based on your decorators and DTOs.

```typescript
// Swagger documentation available at:
// http://localhost:3000/api-docs      - Swagger UI
// http://localhost:3000/api-docs.json - OpenAPI JSON spec
```

**Swagger Configuration:**

```typescript
const swaggerOptions = {
	title: config.applicationName,
	description: `API documentation for ${config.applicationName}`,
	version: '1.0.0',
	servers: [{ url: `http://${config.host}:${config.port}` }],
	docsPath: '/api-docs',
	jsonPath: '/api-docs.json',
};
```

**Enhanced Documentation:**

```typescript
// DTOs automatically generate Swagger schemas
export class CreateUserDto {
	@ApiProperty({
		description: 'User email address',
		example: 'user@example.com',
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: 'User full name',
		minLength: 3,
		example: 'John Doe',
	})
	@IsString()
	@MinLength(3)
	name: string;

	@ApiPropertyOptional({ description: 'User age', minimum: 0, example: 25 })
	@IsOptional()
	@IsNumber()
	age?: number;
}
```

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
@Post('/users')
@Validation({ body: CreateUserDto })
async createUser(@Body() userData: CreateUserDto): Promise<ResponseBuilder<User>> {
  const user = await this.userService.create(userData);
  return new ResponseBuilder<User>().created(user);
}

// Generic repository usage
interface User {
  name: string;
  email: string;
  age?: number;
}

class UserRepository implements IRepository<string, User> {
  async create(user: User): Promise<User & { id: string; createdAt: Date; updatedAt: Date }> {
    // Implementation
  }
  // ... other methods
}
```

## 🔧 Advanced Usage

### Custom Middleware Creation

```typescript
import { RequestHandler } from 'express';
import { Middleware } from '@mini2/core';

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
@Get('/users')
@Middleware([loggingMiddleware, createRateLimiter(10, 60000)])
async getUsers() {
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

interface IEmailService {
	sendWelcomeEmail(user: User): Promise<void>;
}

// Service implementations
@injectable()
class UserService implements IUserService {
	constructor(
		@inject('UserRepository') private userRepo: IUserRepository,
		@inject('EmailService') private emailService: IEmailService
	) {}

	async create(userData: CreateUserDto): Promise<User> {
		const user = await this.userRepo.create(userData);
		await this.emailService.sendWelcomeEmail(user);
		return user;
	}

	async findById(id: string): Promise<User | null> {
		return this.userRepo.findById(id);
	}
}

@injectable()
class EmailService implements IEmailService {
	async sendWelcomeEmail(user: User): Promise<void> {
		// Email sending logic
		console.log(`Welcome email sent to ${user.email}`);
	}
}

// Container configuration
container.bind<IUserRepository>('UserRepository').to(UserRepository);
container.bind<IEmailService>('EmailService').to(EmailService);
container.bind<IUserService>('UserService').to(UserService);

// Controller with dependency injection
@Controller('/api/users')
@injectable()
export class UserController {
	constructor(@inject('UserService') private userService: IUserService) {}

	@Post('/')
	@Validation({ body: CreateUserDto })
	async createUser(@Body() userData: CreateUserDto) {
		const user = await this.userService.create(userData);
		return new ResponseBuilder().created(user);
	}
}
```

### Error Handling Patterns

```typescript
// Global error handler
const globalErrorHandler: RequestHandler = (err, req, res, next) => {
	if (err instanceof HttpException) {
		return res.status(err.code).json(err.messageJson);
	}

	console.error('Unhandled error:', err);
	res.status(500).json({
		message: 'Internal server error',
		errorId: 500000,
	});
};

// Custom exception classes
export class UserNotFoundError extends NotFoundException {
	constructor(userId: string) {
		super({
			message: `User with ID ${userId} not found`,
			errorId: 404001,
		});
	}
}

export class DuplicateEmailError extends ConflictException {
	constructor(email: string) {
		super({
			message: `User with email ${email} already exists`,
			errorId: 409001,
		});
	}
}

// Usage in service
@injectable()
class UserService {
	async findById(id: string): Promise<User> {
		const user = await this.userRepo.findById(id);
		if (!user) {
			throw new UserNotFoundError(id);
		}
		return user;
	}

	async create(userData: CreateUserDto): Promise<User> {
		const existingUser = await this.userRepo.findByEmail(userData.email);
		if (existingUser) {
			throw new DuplicateEmailError(userData.email);
		}
		return this.userRepo.create(userData);
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
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	Header,
	Req,
	Res,
	Next,
	Authenticated,
	Authorized,
	Validation,
	Middleware,
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
