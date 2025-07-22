# @mini2/core

Mini Express Framework - Express.js tabanlı hafif ve modüler web framework'ü. TypeScript desteği, otomatik Swagger dokümantasyonu ve dependency injection özelliklerine sahiptir.

## Kurulum

```bash
npm install @mini2/core
```

## Temel Kullanım

```typescript
import { App, IConfig } from '@mini2/core';

// Konfigürasyon
const config: IConfig = {
	port: 3000,
	host: 'localhost',
	applicationName: 'My API',
};

// Controller'ları tanımlayın
const controllers = [
	// Controller sınıflarınız buraya gelecek
];

// Uygulamayı başlatın
const app = new App(controllers);
await app.init(config);
await app.afterInit();
```

## Özellikler

- 🚀 **Hızlı Kurulum**: Minimal konfigürasyon ile hızlıca başlayın
- 📝 **Otomatik Swagger**: API dokümantasyonu otomatik olarak oluşturulur
- 🔧 **Dependency Injection**: InversifyJS tabanlı DI container
- 🛡️ **Middleware Desteği**: Authentication, authorization ve validation
- 📦 **TypeScript**: Tam TypeScript desteği
- 🎯 **Response Builder**: Tutarlı API yanıtları için yardımcı fonksiyonlar

## API Referansı

### Ana Sınıflar

- **App**: Ana uygulama sınıfı
- **Container**: Dependency injection container'ı

### Arayüzler (Interfaces)

- **IApp**: Uygulama arayüzü
- **IConfig**: Konfigürasyon arayüzü
- **IAuthenticated**: Authentication arayüzü
- **IQueue**: Queue işlemleri arayüzü
- **IRepository**: Repository pattern arayüzü

### Middleware'ler

- **AuthenticatedMiddleware**: Kimlik doğrulama middleware'i
- **AuthorizedMiddleware**: Yetkilendirme middleware'i
- **ValidationMiddleware**: Veri validasyon middleware'i

### Yardımcı Fonksiyonlar

- **ArrayUnify**: Dizi birleştirme yardımcıları
- **Math**: Matematik işlemleri
- **ResponseBuilder**: API yanıt oluşturucu

## Lisans

ISC

## Yazar

Mustafa Çolakoglu <mustafacolakoglu94@gmail.com>
