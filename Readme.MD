# @mini2/core

**Mini Express Framework** - Express.js tabanlı hafif ve modüler web framework'ü. TypeScript desteği, otomatik Swagger dokümantasyonu, dependency injection ve decorator tabanlı routing sistemi ile modern API geliştirme deneyimi sağlar.

## ✨ Özellikler

- 🚀 **Decorator Tabanlı Routing**: `@Get`, `@Post` gibi decorator'lar ile kolay route tanımlama
- 📝 **Otomatik Swagger Dokümantasyonu**: API dokümantasyonu otomatik oluşturulur
- 🔧 **Dependency Injection**: InversifyJS tabanlı güçlü DI container
- 🛡️ **Güvenlik Middleware'leri**: Authentication, authorization ve validation
- 📦 **Tam TypeScript Desteği**: Type-safe API geliştirme
- 🎯 **Response Builder**: Tutarlı API yanıtları
- ⚡ **Hızlı Kurulum**: Minimal konfigürasyon

## 📦 Kurulum

```bash
npm install @mini2/core
```

### Peer Dependencies (Opsiyonel)

```bash
# Eğer MongoDB kullanıyorsanız
npm install mongoose
```

## 🚀 Hızlı Başlangıç

### 1. Temel Konfigürasyon

```typescript
import { App, IConfig } from '@mini2/core';

const config: IConfig = {
	port: 3000,
	host: 'localhost',
	applicationName: 'My API',
};

// Controller'ları tanımlayın
const controllers = [
	// Controller sınıflarınız
];

const app = new App(controllers);
await app.init(config);
await app.afterInit();
```

### 2. Controller Oluşturma

```typescript
import {
	Controller,
	Get,
	Post,
	ResponseBuilder,
	validationMiddleware,
} from '@mini2/core';

@Controller('/api/users')
export class UserController {
	@Get('/')
	async getUsers() {
		const users = await this.userService.findAll();
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
		return new ResponseBuilder().ok(user);
	}
}
```

## 📚 API Referansı

### 🏗️ Ana Sınıflar

#### **App**

Ana uygulama sınıfı, Express server'ını yönetir.

```typescript
import { App, IConfig } from '@mini2/core';

const app = new App(controllers);
await app.init(config); // Server'ı başlat
await app.afterInit(); // Başlangıç sonrası işlemler
```

**Özellikler:**

- Express server yönetimi
- Middleware konfigürasyonu
- Swagger dokümantasyon entegrasyonu
- Controller routing sistemi

#### **Container & container**

Dependency injection için InversifyJS container'ları.

```typescript
import { Container, container } from '@mini2/core';

// Yeni container oluştur
const myContainer = new Container();
myContainer.bind('UserService').to(UserService);

// Hazır container kullan
container.bind('UserService').to(UserService);
```

### 📋 Arayüzler (Interfaces)

#### **IConfig**

```typescript
interface IConfig {
	host: string; // Server host adresi
	port: number; // Server portu
	applicationName: string; // Uygulama adı
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

Generic repository pattern interface'i.

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

### 🛡️ Middleware'ler

#### **validationMiddleware**

Class-validator tabanlı veri doğrulama.

```typescript
import { validationMiddleware } from '@mini2/core';

// Controller içinde
@Post('/users')
@Validation({ body: CreateUserDto })
async createUser(@Body() data: CreateUserDto) {
  // Doğrulanmış data burada kullanılabilir
}
```

**Desteklenen Validasyon Türleri:**

- `body` - Request body doğrulama
- `params` - URL parametreleri doğrulama
- `query` - Query parametreleri doğrulama

#### **authenticatedMiddleware**

Kimlik doğrulama kontrolü.

```typescript
import { authenticatedMiddleware, IAuthenticatedRequest } from '@mini2/core';

// Kullanım
@Get('/profile')
@Authenticated()
async getProfile(@Req() req: IAuthenticatedRequest) {
  // req.authenticated === true kontrolü yapılır
}
```

#### **authorizedMiddleware**

Yetkilendirme kontrolü.

```typescript
import { authorizedMiddleware } from '@mini2/core';

// Kullanım
@Delete('/admin/users/:id')
@Authenticated()
@Authorized(['admin', 'user:delete'])
async deleteUser(@Param('id') id: string) {
  // req.user.permissions kontrolü yapılır
}
```

### 🎯 Response Builder

HTTP yanıtlarını standardize etmek için kullanılır.

```typescript
import { ResponseBuilder } from '@mini2/core';

// Temel kullanım
return new ResponseBuilder().ok({ message: 'Success', data: users });

// Başarılı kayıt
return new ResponseBuilder()
	.created({ id: newUser.id })
	.setHeader('Location', `/users/${newUser.id}`);

// Dosya yanıtı
return new ResponseBuilder()
	.ok(fileBuffer)
	.setHeader('Content-Type', 'application/pdf')
	.asFile();

// Custom status ve header'lar
return new ResponseBuilder()
	.status(202)
	.setHeaders({
		'X-Process-Id': processId,
		'Cache-Control': 'no-cache',
	})
	.ok({ status: 'processing' });
```

### 🏷️ Decorator'lar

#### **HTTP Method Decorator'ları**

```typescript
@Get('/path')           // GET request
@Post('/path')          // POST request
@Put('/path')           // PUT request
@Delete('/path')        // DELETE request
@Patch('/path')         // PATCH request
```

#### **Parameter Decorator'ları**

```typescript
@Param('id') id: string              // URL parametresi
@Body() data: CreateUserDto          // Request body
@Query('page') page: number          // Query parametresi
@Req() request: Request              // Request objesi
@Res() response: Response            // Response objesi
@Next() next: NextFunction           // Next function
```

#### **Middleware Decorator'ları**

```typescript
@Authenticated()                     // Kimlik doğrulama gerekli
@Authorized(['admin'])              // Yetkilendirme kontrolü
@Validation({ body: UserDto })       // Veri doğrulama
@Middleware(customMiddleware)        // Custom middleware
```

### ⚠️ Exception Handling

Önceden tanımlanmış HTTP exception'ları.

```typescript
import {
	HttpException,
	BadRequestException,
	UnauthorizedException,
	ForbiddenException,
	NotFoundException,
	// ... diğer exception'lar
} from '@mini2/core';

// Temel kullanım
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
```

**Mevcut Exception'lar:**

- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `PaymentRequiredException` (402)
- `ForbiddenException` (403)
- `NotFoundException` (404)
- `MethodNotAllowedException` (405)
- `ConflictException` (409)
- `UnprocessableEntityException` (422)
- `TooManyRequestsException` (429)
- `InternalServerErrorException` (500)
- ve daha fazlası...

### 🛠️ Yardımcı Fonksiyonlar

#### **arrayUnify**

Dizi elemanlarını birleştirir ve tekrarları kaldırır.

```typescript
import { arrayUnify } from '@mini2/core';

const result = arrayUnify([1, 2, 2, 3, 1]); // [1, 2, 3]
```

#### **Math Utilities**

```typescript
import { sum } from '@mini2/core';

const result = sum(5, 3); // 8
```

### 📖 Swagger Entegrasyonu

Otomatik API dokümantasyonu oluşturulur.

```typescript
// Swagger dokümantasyonu şu adreslerde mevcut:
// http://localhost:3000/api-docs      - Swagger UI
// http://localhost:3000/api-docs.json - OpenAPI JSON
```

**Swagger Konfigürasyonu:**

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

### 📝 TypeScript Desteği

Tam TypeScript desteği ile type-safe API geliştirme:

```typescript
// DTO sınıfları
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

// Controller'da kullanım
@Post('/users')
@Validation({ body: CreateUserDto })
async createUser(@Body() userData: CreateUserDto): Promise<ResponseBuilder<User>> {
  const user = await this.userService.create(userData);
  return new ResponseBuilder<User>().created(user);
}
```

## 🔧 Gelişmiş Kullanım

### Custom Middleware Ekleme

```typescript
import { middleware } from '@mini2/core';

const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
};

@Get('/users')
@Middleware(loggerMiddleware)
async getUsers() {
  // Logger middleware otomatik çalışır
}
```

### Dependency Injection

```typescript
import { Container, injectable, inject } from '@mini2/core';

@injectable()
export class UserService {
	constructor(@inject('UserRepository') private userRepo: IUserRepository) {}
}

// Container konfigürasyonu
container.bind('UserRepository').to(UserRepository);
container.bind('UserService').to(UserService);
```

## 📋 Tam Export Listesi

```typescript
// Ana sınıflar
export { App } from '@mini2/core';
export { Container, container } from '@mini2/core';

// Interfaces
export { IApp, IConfig, IRepository, IResponseBuilder } from '@mini2/core';

// Middleware'ler
export {
	validationMiddleware,
	authenticatedMiddleware,
	authorizedMiddleware,
} from '@mini2/core';

// Utilities
export { arrayUnify, sum, ResponseBuilder } from '@mini2/core';

// Exception'lar
export {
	HttpException,
	BadRequestException,
	UnauthorizedException,
	// ... tüm exception'lar
} from '@mini2/core';

// Types ve decorators
export { MINI_TYPES } from '@mini2/core';
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
```

## 📄 Lisans

ISC

## 👨‍💻 Yazar

**Mustafa Çolakoğlu**  
Email: mustafacolakoglu94@gmail.com  
GitHub: https://github.com/mustafa-colakoglu

---

**Not:** Bu framework aktif olarak geliştirilmektedir. Öneriler ve katkılar için GitHub repository'sini ziyaret edin.
