import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import OpenAI from 'openai';

const t = initTRPC.create();

// Grid size constants
const GRID_SIZE = 20;

// Cell types for scoring
enum CellType {
  EMPTY = 0,
  SNAKE = -1,
  FOOD = 100,
  WALL = -100
}

// Direction vectors
const DIRECTIONS = [
  { x: 0, y: -1, name: 'up' },
  { x: 0, y: 1, name: 'down' },
  { x: -1, y: 0, name: 'left' },
  { x: 1, y: 0, name: 'right' }
];

// Calculate Manhattan distance between two points
function manhattanDistance(a: { x: number, y: number }, b: { x: number, y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Check if a position is valid (within bounds and not occupied by snake)
function isValidPosition(pos: { x: number, y: number }, snake: Array<{ x: number, y: number }>): boolean {
  // Check bounds
  if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) {
    return false;
  }
  
  // Check if position is occupied by the snake's body (excluding the tail, which will move)
  return !snake.slice(0, -1).some(segment => segment.x === pos.x && segment.y === pos.y);
}

// Get possible moves from current position
function getPossibleMoves(head: { x: number, y: number }, snake: Array<{ x: number, y: number }>): Array<{ x: number, y: number, direction: string }> {
  const moves: Array<{ x: number, y: number, direction: string }> = [];
  
  for (const dir of DIRECTIONS) {
    const newPos = { x: head.x + dir.x, y: head.y + dir.y };
    if (isValidPosition(newPos, snake)) {
      moves.push({ ...newPos, direction: dir.name });
    }
  }
  
  return moves;
}

// Flood fill to check for accessibility and dead ends
function floodFill(start: { x: number, y: number }, snake: Array<{ x: number, y: number }>): number {
  const queue = [start];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  let count = 0;

  while (queue.length > 0) {
    const pos = queue.shift()!;
    count++;
    
    for (const dir of DIRECTIONS) {
      const nextPos = { x: pos.x + dir.x, y: pos.y + dir.y };
      const key = `${nextPos.x},${nextPos.y}`;
      if (isValidPosition(nextPos, snake) && !visited.has(key)) {
        visited.add(key);
        queue.push(nextPos);
      }
    }
  }
  return count;
}

// Find the best move using a more robust scoring system
function findBestMove(snake: Array<{ x: number, y: number }>, food: { x: number, y: number }): { direction: string, score: number, targetCell: { x: number, y: number } } {
  const head = snake[0];
  const possibleMoves = getPossibleMoves(head, snake);
  
  let bestMove = { direction: 'up', score: -Infinity, targetCell: { x: 0, y: 0 } };
  
  if (possibleMoves.length === 0) {
    // No valid moves, but we must return something
    return bestMove;
  }
  
  for (const move of possibleMoves) {
    let score = 0;
    
    // Primary goal: Move towards food
    const currentDistanceToFood = manhattanDistance(head, food);
    const newDistanceToFood = manhattanDistance(move, food);
    score += (currentDistanceToFood - newDistanceToFood) * 10;
    
    // Secondary goal: Maximize space (survival)
    const space = floodFill(move, snake);
    score += space;
    
    // Tie-breaker: Prefer straight lines
    if (snake.length > 1) {
      const prevHead = snake[1];
      const moveDirection = { x: move.x - head.x, y: move.y - head.y };
      const lastMoveDirection = { x: head.x - prevHead.x, y: head.y - prevHead.y };
      if (moveDirection.x === lastMoveDirection.x && moveDirection.y === lastMoveDirection.y) {
        score += 0.1; // Small bonus for continuing in the same direction
      }
    }
    
    if (score > bestMove.score) {
      bestMove = {
        direction: move.direction,
        score: score,
        targetCell: { x: move.x, y: move.y }
      };
    }
  }
  
  return bestMove;
}

export const appRouter = t.router({
  hello: t.procedure.input(z.object({ name: z.string() })).query(({ input }) => {
    return { greeting: `Hello, ${input.name}!` };
  }),
  getNextMove: t.procedure.input(z.object({
    snake: z.array(z.object({ x: z.number(), y: z.number() })),
    food: z.object({ x: z.number(), y: z.number() }),
  })).mutation(async ({ input }) => {
    // Use advanced pathfinding algorithm
    const bestMove = findBestMove(input.snake, input.food);
    
    const head = input.snake[0];
    
    return {
      direction: bestMove.direction,
      targetCell: bestMove.targetCell,
      targetScore: bestMove.score,
      analysis: {
        snakeLength: input.snake.length,
        distanceToFood: manhattanDistance(head, input.food),
        possibleMoves: getPossibleMoves(head, input.snake).length,
      }
    };
  }),
});

export type AppRouter = typeof appRouter;
