import { RoomSessionServer } from './session/RoomSessionServer';

const port = Number(process.env.ROOMLAB_PORT ?? 8787);
const server = new RoomSessionServer({ port });

server.start();
