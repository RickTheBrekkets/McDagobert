import { createApp } from './app.js';
import { createRepo } from './db.js';

const port = Number(process.env.PORT) || 3001;
const app = createApp(createRepo());

app.listen(port, () => {
  console.log(`McDagobert server listening on http://localhost:${port}`);
});
