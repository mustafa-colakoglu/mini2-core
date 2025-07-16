import type { Response } from 'express';

export interface IResponseBuilder<T = any> {
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

export class ResponseBuilder<T> implements IResponseBuilder<T> {
	public status: number = 200;
	public data!: T;
	public headers: Record<string, string> = {};
	public isFile: boolean = false;

	ok(data: T): ResponseBuilder<T> {
		this.status = 200;
		this.data = data;
		return this;
	}

	created(data: T): ResponseBuilder<T> {
		this.status = 201;
		this.data = data;
		return this;
	}

	setHeader(key: string, value: string): ResponseBuilder<T> {
		this.headers[key] = value;
		return this;
	}

	setHeaders(headers: Record<string, string>): ResponseBuilder<T> {
		this.headers = { ...this.headers, ...headers };
		return this;
	}

	asFile(): ResponseBuilder<T> {
		this.isFile = true;
		return this;
	}

	build(res: Response): void {
		Object.entries(this.headers).forEach(([key, value]) => {
			res.setHeader(key, value);
		});

		if (this.isFile && this.data) {
			res.status(this.status).send(this.data);
		} else {
			res.status(this.status).json(this.data);
		}
	}
}
