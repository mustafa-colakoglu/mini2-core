export interface ISwaggerServer {
	url: string;
	description: string;
}

export interface ISwaggerBasicAuth {
	username: string;
	password: string;
}

export interface IDocsConfig {
	/** When true, registers Swagger and/or Postman documentation endpoints. Default: off. */
	enabled?: boolean;
	swaggerEnabled?: boolean;
	postmanEnabled?: boolean;
}

export interface IMiddlewareConfig {
	/** Default: true. Set false to skip default cors() middleware. */
	cors?: boolean;
	/** Default: true. Set false to skip default morgan request logging. */
	morgan?: boolean;
	/** Morgan format when morgan is enabled. Default: 'dev'. */
	morganFormat?: string;
}

export interface IConfig {
	host: string;
	port: number;
	applicationName: string;
	docs?: IDocsConfig;
	middleware?: IMiddlewareConfig;
	swaggerDocsPath?: string;
	swaggerJsonPath?: string;
	swaggerServers?: ISwaggerServer[];
	swaggerBasicAuth?: ISwaggerBasicAuth;
	postmanJsonPath?: string;
}
