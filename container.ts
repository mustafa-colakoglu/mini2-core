import { Container } from 'inversify';
import App from './app';

const container = new Container();
container.bind(App).toSelf();

export default container;
