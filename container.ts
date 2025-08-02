import { Container } from 'inversify';
import App from './app';
import { IApp } from './interfaces/app.interface';
import { MINI_TYPES } from './types';

const container = new Container();
container.bind<IApp>(MINI_TYPES.IApp).to(App).inSingletonScope();

export default container;
