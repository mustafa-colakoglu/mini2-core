import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/__tests__'],
	testMatch: ['**/*.test.ts'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.jest.json',
				diagnostics: true,
				isolatedModules: false,
			},
		],
	},
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	testTimeout: 20000,
};

export default config;
