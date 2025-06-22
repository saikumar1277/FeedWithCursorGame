"use client";
import React, { useRef, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

type SnakeSegment = { x: number; y: number };

const BOARD_SIZE = 20;
const CELL_SIZE = 16;

function getNextHead(snake: SnakeSegment[], direction: string): SnakeSegment {
  const head = snake[0];
  switch (direction) {
    case "up": return { x: head.x, y: head.y - 1 };
    case "down": return { x: head.x, y: head.y + 1 };
    case "left": return { x: head.x - 1, y: head.y };
    case "right": return { x: head.x + 1, y: head.y };
    default: return head;
  }
}


export default function SnakeGame() {
  const [snake, setSnake] = useState([{ x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) }]);
  const [food, setFood] = useState<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [moving, setMoving] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastFood = useRef<{ x: number; y: number } | null>(null);

  const getNextMove = trpc.getNextMove.useMutation();

  // Handle mouse move over the board
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      setFood({ x, y });
      lastFood.current = { x, y };
      setMoving(true);
    } else {
      setFood(null);
      setMoving(false);
    }
  };

  // Move the snake toward the food using advanced pathfinding
  useEffect(() => {
    if (!food || !moving) return;

    const move = async () => {
      if (!lastFood.current) return;
      try {
        const res = await getNextMove.mutateAsync({ snake, food: lastFood.current });
        
        const nextHead = getNextHead(snake, res.direction);
        
        // Check for collision with walls
        if (
          nextHead.x < 0 ||
          nextHead.x >= BOARD_SIZE ||
          nextHead.y < 0 ||
          nextHead.y >= BOARD_SIZE
        ) {
          setMoving(false);
          return;
        }
        
        // Check for collision with self
        if (snake.some(seg => seg.x === nextHead.x && seg.y === nextHead.y)) {
          setMoving(false);
          return;
        }
        
        // Check if snake eats food
        if (food && nextHead.x === food.x && nextHead.y === food.y) {
          setSnake([nextHead, ...snake]);
          setScore(s => s + 1);
          setMoving(false);
          return;
        }
        
        setSnake([nextHead, ...snake.slice(0, -1)]);
      } catch (error) {
        console.error('Error getting next move:', error);
        setMoving(false);
      }
    };

    const interval = setInterval(move, 300); // Slightly slower for better analysis visibility
    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food, moving, snake]);

  // Reset game when user leaves the board
  const handleMouseLeave = () => {
    setFood(null);
    setMoving(false);
    setSnake([{ x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) }]);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center text-lime-400">
      <div className="flex justify-between w-full px-1 mb-2 text-lg">
        <span>SCORE</span>
        <span>{String(score).padStart(3, '0')}</span>
      </div>
      <div
        ref={boardRef}
        className="relative bg-lime-300/80"
        style={{ width: BOARD_SIZE * CELL_SIZE, height: BOARD_SIZE * CELL_SIZE }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Snake */}
        {snake.map((segment, idx) => (
          <div
            key={idx}
            className="absolute bg-neutral-800"
            style={{
              left: segment.x * CELL_SIZE,
              top: segment.y * CELL_SIZE,
              width: CELL_SIZE - 1,
              height: CELL_SIZE - 1,
              zIndex: 3,
            }}
          />
        ))}
        
        {/* Food (cursor) */}
        {food && (
          <div
            className="absolute text-neutral-800"
            style={{
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              zIndex: 2,
            }}
          >
            <div style={{width: CELL_SIZE, height: CELL_SIZE}} className="relative">
              <div className="absolute bg-neutral-800" style={{left: CELL_SIZE/2 - 1, top: CELL_SIZE/4, width: 2, height: CELL_SIZE/2}} />
              <div className="absolute bg-neutral-800" style={{left: CELL_SIZE/4, top: CELL_SIZE/2 - 1, width: CELL_SIZE/2, height: 2}} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 