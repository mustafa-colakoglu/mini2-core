export interface ISwaggerServer {
	url: string;
	description: string;
}

export interface ISwaggerBasicAuth {
	username: string;
	password: string;
}

export interface IConfig {
	host: string;
	port: number;
	applicationName: string;
	swaggerDocsPath?: string;
	swaggerJsonPath?: string;
	swaggerServers?: ISwaggerServer[];
	swaggerBasicAuth?: ISwaggerBasicAuth;
	postmanJsonPath?: string;
}
