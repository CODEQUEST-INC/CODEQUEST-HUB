import { Request, Response } from 'express';

// TODO: implement — admin configures criteria before event day
export async function createCriteria(req: Request, res: Response) {
  res.status(501).json({ error: 'not_implemented', message: 'createCriteria not yet built' });
}

// TODO: implement — judge submits scorecard per group (upsert on group+judge+criteria)
export async function submitScorecard(req: Request, res: Response) {
  res.status(501).json({ error: 'not_implemented', message: 'submitScorecard not yet built' });
}

// TODO: implement — weighted sum aggregation across judges, ordered desc
export async function getLeaderboard(req: Request, res: Response) {
  res.status(501).json({ error: 'not_implemented', message: 'getLeaderboard not yet built' });
}