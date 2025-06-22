import SnakeGame from "@/components/SnakeGame";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="bg-black border-[12px] border-neutral-800 rounded-2xl p-4 ">
        <SnakeGame />
       
      </div>
      <div className="flex flex-col items-center text-center pt-4 justify-center w-full px-1 mb-2 text-lg">
          <p>Feed the snake by moving the cursor over the board</p>
        </div>
    </main>
  );
}
