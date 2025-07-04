import { CircularBoundary, CommunityBoundary } from './domain';

export interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export function isCircularBoundary(
  b: CommunityBoundary,
): b is CircularBoundary {
  return b.type === 'circular';
}
