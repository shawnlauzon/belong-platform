export interface PlayerLevel {
  index: number;
  emoji: string;
  name: string;
  minScore: number;
  maxScore?: number;
}

export interface LevelProgress {
  currentLevel: PlayerLevel;
  nextLevel?: PlayerLevel;
  currentScore: number;
  progress: number;
  pointsToNext?: number;
}