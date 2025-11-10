export interface PlayerLevel {
  level: number;
  emoji: string;
  name: string;
  pointsNeeded: number;
  unlockedPowers?: string[];
}

export interface LevelProgress {
  currentLevel: PlayerLevel;
  nextLevel?: PlayerLevel;
  currentScore: number;
  progress: number;
  pointsToNext?: number;
}