export interface IValidationError {
	field: string;
	errors: string[];
}
export interface IErrorMessage {
	validationErrors?: IValidationError[];
	message?: string;
	errorId?: number;
}

export default class HttpException extends Error {
	code: number;
	message: string;
	messageJson: IErrorMessage;
	constructor(message: IErrorMessage, code = 500) {
		super(JSON.stringify(message));
		this.code = code;
		this.message = JSON.stringify(message);
		this.messageJson = message;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class BadRequestException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 400);
	}
}

export class UnauthorizedException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 401);
	}
}

export class PaymentRequiredException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 402);
	}
}

export class ForbiddenException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 403);
	}
}

export class NotFoundException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 404);
	}
}

export class MethodNotAllowedException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 405);
	}
}

export class NotAcceptableException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 406);
	}
}

export class ConflictException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 409);
	}
}

export class GoneException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 410);
	}
}

export class LengthRequiredException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 411);
	}
}

export class PreconditionFailedException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 412);
	}
}

export class PayloadTooLargeException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 413);
	}
}

export class UnsupportedMediaTypeException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 415);
	}
}

export class UnprocessableEntityException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 422);
	}
}

export class TooManyRequestsException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 429);
	}
}

export class InternalServerErrorException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 500);
	}
}

export class NotImplementedException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 501);
	}
}

export class BadGatewayException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 502);
	}
}

export class ServiceUnavailableException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 503);
	}
}

export class GatewayTimeoutException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 504);
	}
}
export class ExpiredException extends HttpException {
	constructor(error: IErrorMessage) {
		super(error, 410);
	}
}
