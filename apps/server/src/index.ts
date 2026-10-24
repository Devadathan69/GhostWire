import 'dotenv/config';
import { makeServer } from './server';
const server = makeServer();
const port = Number(process.env.PORT || 3001);
server.http.listen(port, '0.0.0.0', () =>
  console.log(`GHOSTWIRE online at http://localhost:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
