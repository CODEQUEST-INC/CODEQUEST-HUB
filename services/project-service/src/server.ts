import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import proposalRoutes from './routes/proposal.routes';
import taskRoutes from './routes/task.routes';
import communityRoutes from './routes/community.routes';
import resourceRoutes from './routes/resource.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'project-service' });
});

app.use('/api/proposals', proposalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/resources', resourceRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`project-service listening on port ${PORT}`);
});
