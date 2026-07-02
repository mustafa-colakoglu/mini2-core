import { Response } from 'express';
import { controller, Controller, get, res } from '../../notations';

@controller('/hello')
export class HelloController extends Controller {
	constructor() {
		super();
	}

	@get('/', 'Hello World')
	public hello(@res() response: Response): void {
		response.json({ message: 'hello from v2' });
	}
}
