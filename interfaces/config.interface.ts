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

export interface IConfig {
	host: string;
	port: number;
	applicationName: string;
	docs?: IDocsConfig;
	swaggerDocsPath?: string;
	swaggerJsonPath?: string;
	swaggerServers?: ISwaggerServer[];
	swaggerBasicAuth?: ISwaggerBasicAuth;
	postmanJsonPath?: string;
}
