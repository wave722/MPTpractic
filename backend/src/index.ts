import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth';
import organizationsRoutes from './routes/organizations';
import modulesRoutes from './routes/modules';
import practicesRoutes from './routes/practices';
import groupsRoutes from './routes/groups';
import studentsRoutes from './routes/students';
import techSupervisorsRoutes from './routes/techSupervisors';
import assignmentsRoutes from './routes/assignments';
import reportsRoutes from './routes/reports';
import groupIndexLabelsRoutes from './routes/groupIndexLabels';
import qualificationPracticeOffersRoutes from './routes/qualificationPracticeOffers';
import analyticsRoutes from './routes/analytics';
import studentProfileRoutes from './routes/studentProfile';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/practices', practicesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/tech-supervisors', techSupervisorsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/group-index-labels', groupIndexLabelsRoutes);
app.use('/api/qualification-practice-offers', qualificationPracticeOffersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/student-profile', studentProfileRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера', details: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
