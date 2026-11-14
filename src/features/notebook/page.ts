import { methodInfo } from '../../core/methods';
import type { Problem } from '../../core/numerics/types';
import type { SavedProblem } from '../../shared/storage';

export function pageTitle(entry: SavedProblem): string {
  return entry.title?.trim() || methodInfo(entry.problem.method).title;
}

export function problemPreview(problem: Problem): string {
  return problem.kind === 'root'
    ? problem.expression
    : `${problem.points.length} points · target x = ${problem.targetX}`;
}

export function matchesPage(entry: SavedProblem, query: string): boolean {
  const problem = entry.problem;
  const text = [
    pageTitle(entry),
    entry.notes ?? '',
    ...(entry.tags ?? []),
    methodInfo(problem.method).title,
    problem.method,
    problem.kind === 'root'
      ? `${problem.expression} ${problem.gExpression ?? ''}`
      : problem.points.map(point => `${point.x} ${point.y}`).join(' '),
  ]
    .join(' ')
    .toLocaleLowerCase();
  return text.includes(query.trim().toLocaleLowerCase());
}
