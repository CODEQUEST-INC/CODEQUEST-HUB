import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import groupRoutes from './routes/group.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'group-service' });
});

app.use('/api/groups', groupRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`group-service listening on port ${PORT}`);
});
