import express from 'express';
import ClassController from './controllers/ClassController';
import ConnectionController from './controllers/ConnectionController';

const routes  = express.Router();
const classController = new ClassController();
const connectionController = new ConnectionController();

routes.post('/class', classController.create);
routes.get('/class', classController.index);
routes.post('/connection', connectionController.create)
routes.get('/connection', connectionController.index)

export default routes;