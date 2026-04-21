import React, { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';

const TRACKS = [
  { title: "NEON HORIZON [AI.GEN]", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "DIGITAL RAIN [AI.GEN]", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "VAPOR PULSE [AI.GEN]", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
];

const GRID_SIZE = 20;

export default function App() {
  // Game References & State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<{x: number, y: number}[]>([{x: 5, y: 10}, {x: 4, y: 10}, {x: 3, y: 10}]);
  const [food, setFood] = useState<{x: number, y: number}>({x: 15, y: 10});
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  
  const directionRef = useRef({x: 1, y: 0});
  const actionQueueRef = useRef<{x: number, y: number}[]>([]);
  const foodRef = useRef(food);

  // Audio State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');

  const speed = Math.max(50, 150 - score * 2);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  // --- Audio Player Logic ---
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Catch autoplay blocking or loading issues
    const playPromise = isPlaying ? audioRef.current.play() : undefined;
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("Audio playback blocked or failed:", error);
        setIsPlaying(false);
        setAudioError('AUDIO.SYS_ERR');
      });
    } else if (!isPlaying) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  const togglePlay = () => {
    setAudioError('');
    setIsPlaying(!isPlaying);
  };
  
  const handleTrackEnd = () => setCurrentTrack(prev => (prev + 1) % TRACKS.length);
  const skipForward = () => {
    setCurrentTrack(prev => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
    setAudioError('');
  };
  const skipBack = () => {
    setCurrentTrack(prev => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
    setAudioError('');
  };

  const handleSpace = () => {
    if (!gameStarted || gameOver) {
      resetGame();
      if(!isPlaying) setIsPlaying(true);
    }
  };

  // --- Game Controls Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ') {
        handleSpace();
        return;
      }

      const currentDir = actionQueueRef.current.length > 0 
        ? actionQueueRef.current[actionQueueRef.current.length - 1] 
        : directionRef.current;

      const newDir = { x: 0, y: 0 };
      switch(e.key.toLowerCase()) {
        case 'arrowup': case 'w': newDir.y = -1; break;
        case 'arrowdown': case 's': newDir.y = 1; break;
        case 'arrowleft': case 'a': newDir.x = -1; break;
        case 'arrowright': case 'd': newDir.x = 1; break;
        default: return; // Not a movement key
      }

      // Prevent 180 reversals
      if (
        (newDir.x !== 0 && currentDir.x !== 0) || 
        (newDir.y !== 0 && currentDir.y !== 0) ||
        (newDir.x === 0 && newDir.y === 0)
      ) return;

      // Queue the action
      if (actionQueueRef.current.length < 2) {
        actionQueueRef.current.push(newDir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, isPlaying]);

  // --- Game Loop Logic ---
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        if (actionQueueRef.current.length > 0) {
          directionRef.current = actionQueueRef.current.shift()!;
        }

        const head = prevSnake[0];
        const newHead = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y
        };

        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setGameOver(true);
          return prevSnake;
        }

        const checkTail = prevSnake.slice(0, -1);
        if (checkTail.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
          setScore(s => s + 10);
          spawnFood(newSnake);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, speed]);

  const spawnFood = (currentSnake: {x: number, y: number}[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!currentSnake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
    }
    foodRef.current = newFood;
    setFood(newFood);
  };

  const resetGame = () => {
    setSnake([{x: 5, y: 10}, {x: 4, y: 10}, {x: 3, y: 10}]);
    directionRef.current = {x: 1, y: 0};
    actionQueueRef.current = [];
    setScore(0);
    setGameOver(false);
    spawnFood([{x: 5, y: 10}, {x: 4, y: 10}, {x: 3, y: 10}]);
    setGameStarted(true);
  };

  // --- Rendering Canvas ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear bg
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glitchy grid lines
    ctx.strokeStyle = '#ff00ff';
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += cellSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Draw snake (cyan)
    ctx.shadowColor = '#00ffff';
    snake.forEach((segment, index) => {
      ctx.shadowBlur = index === 0 ? 15 : 0;
      ctx.fillStyle = index === 0 ? '#ffffff' : '#00ffff';
      ctx.fillRect(segment.x * cellSize, segment.y * cellSize, cellSize - 1, cellSize - 1);
    });

    // Draw food (magenta)
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize - 1, cellSize - 1);

    ctx.shadowBlur = 0; // reset
  }, [snake, food]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ffff] font-mono flex flex-col overflow-hidden p-4 md:p-6 tear relative select-none">
      <div className="crt-overlay"></div>
      <div className="static-noise"></div>
      
      {/* Content wrapper with higher z-index to stay above noise if needed, but we keep noise as pointer-events-none */}
      <div className="relative z-10 flex flex-col flex-1 h-full max-w-7xl w-full mx-auto">
        
        {/* Header Section */}
        <header className="flex justify-between items-end border-b-4 border-[#ff00ff] pb-4 mb-6 shrink-0">
          <div>
             <h1 
                className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none glitch drop-shadow-[2px_2px_0_#ff00ff]" 
                data-text="SYSTEM.REBOOT()"
             >
                SYSTEM.REBOOT()
             </h1>
            <p className="text-[12px] text-[#ff00ff] mt-2 uppercase tracking-widest bg-[#00ffff] text-black px-2 inline-block font-bold">STATUS: CRITICAL // AUDIO.LINK_ESTABLISHED</p>
          </div>
          <div className="flex gap-4 md:gap-8 text-right">
            <div className="flex flex-col hidden sm:flex">
              <span className="text-[12px] text-[#ff00ff] uppercase bg-[#ff00ff]/20 px-1">MAX_STACK</span>
              <span className="text-3xl md:text-4xl font-bold tracking-widest text-[#00ffff]">{highScore.toString().padStart(4, '0')}</span>
            </div>
            <div className="flex flex-col sm:border-l-4 border-dashed border-[#00ffff] sm:pl-8">
              <span className="text-[12px] text-[#00ffff] bg-black px-1 uppercase">CURR_MEM</span>
              <span className="text-3xl md:text-4xl font-bold text-white tracking-widest">{score.toString().padStart(4, '0')}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 overflow-y-auto overflow-x-hidden md:overflow-visible">
          {/* Left Panel: Playlist */}
          <aside className="md:col-span-3 flex flex-col gap-4">
            <div className="bg-[#050505] border-[3px] border-[#00ffff] p-4 flex-1 relative shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              <div className="absolute top-0 right-0 bg-[#00ffff] text-black text-[10px] px-2 py-0.5 uppercase font-bold">SEQ_DATA</div>
              <h2 className="text-lg font-bold uppercase mb-4 border-b-2 border-dotted border-[#ff00ff] pb-2 text-[#ff00ff] glitch" data-text="TRACK_LOGS">TRACK_LOGS</h2>
              <div className="space-y-4">
                {TRACKS.map((track, i) => (
                   <div 
                     key={i} 
                     onClick={() => { setCurrentTrack(i); setIsPlaying(true); }}
                     className={`group cursor-pointer ${currentTrack === i ? 'bg-[#ff00ff]/10 p-2 border-l-4 border-[#ff00ff]' : 'opacity-40 hover:opacity-80 transition-opacity p-2 border-l-4 border-transparent'}`}
                   >
                      <div className="flex justify-between text-[14px] mb-1">
                        <span className={currentTrack === i ? 'text-white font-bold tracking-widest' : 'text-[#00ffff] tracking-widest'}>
                          0{i + 1}_{track.title.replace(' [AI.GEN]', '')}
                        </span>
                      </div>
                      {currentTrack === i ? (
                        <>
                          <div className="text-[10px] text-[#ff00ff] uppercase bg-black inline-block px-1">CYBER_SYNTH // ACTIVE_STREAM</div>
                          <div className="h-1 bg-[#00ffff] mt-2 shadow-[0_0_5px_#00ffff]"></div>
                        </>
                      ) : (
                        <div className="text-[10px] text-[#00ffff] uppercase">STANDBY_MODE</div>
                      )}
                   </div>
                ))}
              </div>
              {audioError && <p className="text-[12px] text-black bg-[#ff00ff] font-bold inline-block px-2 mt-4 animate-pulse">{audioError}</p>}
            </div>

            <div className="bg-[#050505] border-[3px] border-[#ff00ff] p-4 flex-shrink-0 h-32 hidden md:block relative shadow-[0_0_15px_rgba(255,0,255,0.2)]">
              <h2 className="text-sm font-bold uppercase mb-2 text-[#ff00ff]">SIGNAL_OUT</h2>
              <div className="flex items-end gap-1 h-14 border-b-2 border-[#00ffff]">
                 <div className={`w-full bg-[#00ffff] opacity-80 ${isPlaying ? 'animate-[bounce_0.2s_infinite_alternate] h-[40%]' : 'h-[5%]'}`}></div>
                 <div className={`w-full bg-[#ff00ff] opacity-80 ${isPlaying ? 'animate-[bounce_0.4s_infinite_alternate-reverse] h-[80%]' : 'h-[5%]'}`}></div>
                 <div className={`w-full bg-[#00ffff] opacity-80 ${isPlaying ? 'animate-[bounce_0.3s_infinite_alternate] h-[60%]' : 'h-[5%]'}`}></div>
                 <div className={`w-full bg-[#ff00ff] opacity-80 ${isPlaying ? 'animate-[bounce_0.25s_infinite_alternate-reverse] h-[90%]' : 'h-[5%]'}`}></div>
                 <div className={`w-full bg-[#00ffff] opacity-80 ${isPlaying ? 'animate-[bounce_0.5s_infinite_alternate] h-[50%]' : 'h-[5%]'}`}></div>
                 <div className={`w-full bg-[#ff00ff] opacity-80 ${isPlaying ? 'animate-[bounce_0.35s_infinite_alternate-reverse] h-[70%]' : 'h-[5%]'}`}></div>
                 <div className={`w-full bg-[#00ffff] opacity-80 ${isPlaying ? 'animate-[bounce_0.2s_infinite_alternate] h-[40%]' : 'h-[5%]'}`}></div>
              </div>
            </div>
          </aside>

          {/* Center Panel: Game Window */}
          <section className="md:col-span-6 relative group flex w-full max-w-[600px] mx-auto flex-col items-center justify-center p-2 border-4 border-dashed border-[#ff00ff] bg-black/50 overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#ff00ff] text-black text-[12px] px-2 py-0.5 uppercase font-bold z-20">MAIN_THREAD</div>
            <div className="w-full aspect-square relative border-[4px] border-[#00ffff] bg-[#050505] p-0 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,255,255,0.2)]">
              
              <canvas
                ref={canvasRef}
                width={500}
                height={500}
                className="w-full h-full object-contain bg-[#050505]"
                style={{ imageRendering: 'pixelated' }}
              />
              
              {/* Overlays */}
              {!gameStarted && (
                 <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10 p-4 text-center border-4 border-[#00ffff]">
                    <div className="mb-6 opacity-100 glitch" data-text="AWAITING INPUT">
                      <p className="text-4xl text-[#ff00ff] tracking-widest font-bold">AWAITING INPUT</p>
                    </div>
                    <button 
                      onClick={handleSpace}
                      className="px-8 py-4 border-4 border-[#00ffff] text-[#00ffff] text-xl font-bold uppercase tracking-[0.2em] bg-black hover:bg-[#00ffff] hover:text-black transition-colors pointer-events-auto cursor-pointer shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                    >
                      EXECUTE [SPACE]
                    </button>
                    <p className="mt-8 text-[#ff00ff] bg-black px-2 tracking-widest border border-[#ff00ff]">CTRLS: W A S D</p>
                 </div>
              )}

              {gameOver && (
                 <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-10 border-8 border-red-600 p-4 text-center tear">
                    <p className="text-5xl md:text-6xl font-black text-[#ff00ff] mb-2 tracking-tight glitch drop-shadow-[5px_5px_0_#00ffff]" data-text="FATAL_ERROR">FATAL_ERROR</p>
                    <p className="text-white md:mb-8 mb-4 tracking-[0.3em] bg-red-600 px-4 text-xl">DUMP: {score.toString().padStart(4, '0')}</p>
                    <button 
                      onClick={handleSpace}
                      className="px-6 py-3 border-2 border-[#00ffff] text-[#00ffff] text-xl font-bold uppercase tracking-widest bg-black hover:bg-[#00ffff] hover:text-black transition-colors pointer-events-auto cursor-pointer"
                    >
                      [RESTART_SEQ]
                    </button>
                 </div>
              )}

              {/* HUD Elements */}
              <div className="absolute top-0 left-0 text-[10px] bg-black px-2 border-r-2 border-b-2 border-[#00ffff] z-20 pointer-events-none text-[#ff00ff] tracking-widest font-bold">
                PID: <span className="text-[#00ffff]">0x{gameStarted && !gameOver ? '1337' : '0000'}</span>
              </div>
              <div className="absolute bottom-0 right-0 text-[10px] bg-black px-2 border-l-2 border-t-2 border-[#00ffff] z-20 pointer-events-none text-[#ff00ff] tracking-widest">
                FPS: <span className="animate-pulse">{gameStarted && !gameOver ? '60.0' : '00.0'}</span>
              </div>
              
            </div>
          </section>

          {/* Right Panel: Stats */}
          <aside className="md:col-span-3 flex flex-col gap-4">
            <div className="bg-[#050505] border-[3px] border-[#00ffff] p-4 flex-1 relative shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              <div className="absolute top-0 left-0 bg-[#00ffff] text-black text-[10px] px-2 py-0.5 uppercase font-bold">DIAGNOSTICS</div>
              <h2 className="text-lg font-bold uppercase mb-4 border-b-2 border-dotted border-[#ff00ff] pb-2 text-[#ff00ff] mt-6 glitch" data-text="SYS_PARAMS">SYS_PARAMS</h2>
              <div className="space-y-6">
                <div className="border border-[#00ffff] p-2 bg-[#00ffff]/5">
                  <span className="block text-[12px] text-[#ff00ff] mb-1 uppercase tracking-widest font-bold">OVERCLOCKING</span>
                  <span className="text-3xl font-bold text-white tracking-widest">x{(1 + (score/10)*0.1).toFixed(1)}</span>
                </div>
                <div className="border border-[#00ffff] p-2 bg-[#00ffff]/5">
                  <span className="block text-[12px] text-[#ff00ff] mb-1 uppercase tracking-widest font-bold">DATA_PACKETS</span>
                  <span className="text-3xl font-bold text-white tracking-widest">{score / 10}</span>
                </div>
                <div className="border border-[#00ffff] p-2 bg-[#00ffff]/5">
                  <span className="block text-[12px] text-[#ff00ff] mb-1 uppercase tracking-widest font-bold">CYCLE_SPD</span>
                  <span className="text-3xl font-bold text-white tracking-widest">{speed}ms</span>
                </div>
                <div className="pt-2 hidden md:block">
                  <div className="h-32 border-2 border-dashed border-[#ff00ff] relative flex items-center justify-center bg-black">
                    <span className="text-[10px] text-black bg-[#ff00ff] absolute top-2 uppercase px-1 font-bold">CORE_LOAD</span>
                    <svg viewBox="0 0 100 100" className={`w-20 h-20 stroke-[#00ffff] fill-none ${gameStarted && !gameOver ? 'animate-[spin_0.5s_linear_infinite]' : 'opacity-20'}`}>
                      <rect x="20" y="20" width="60" height="60" strokeDasharray="10 5" strokeWidth="2" />
                      <rect x="35" y="35" width="30" height="30" stroke="#ff00ff" strokeWidth="4" />
                      <path d="M50 0 L50 100 M0 50 L100 50" strokeWidth="1" opacity="0.3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </main>

        {/* Footer: Music Controls */}
        <footer className="mt-6 shrink-0 bg-[#050505] border-[3px] border-[#ff00ff] p-4 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-[0_0_15px_rgba(255,0,255,0.2)]">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
            <div className="flex gap-2">
              <button onClick={skipBack} className="p-3 border-2 border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-black transition-colors focus:outline-none">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6L18 6v12z"/></svg>
              </button>
              <button onClick={togglePlay} className={`p-3 border-2 border-[#00ffff] transition-colors focus:outline-none ${isPlaying ? 'bg-[#ff00ff] border-[#ff00ff] text-black' : 'text-[#00ffff] hover:bg-[#00ffff] hover:text-black'}`}>
                {isPlaying ? (
                   <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                   <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button onClick={skipForward} className="p-3 border-2 border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-black transition-colors focus:outline-none">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            </div>
            <div className="w-full sm:w-96 text-center sm:text-left bg-black p-2 border-2 border-[#00ffff] relative overflow-hidden">
              <div className="text-[12px] font-bold text-white mb-2 tracking-widest truncate relative z-10">
                O/P: <span className="text-[#ff00ff] glitch" data-text={TRACKS[currentTrack].title}>{TRACKS[currentTrack].title}</span>
              </div>
              <div className="w-full h-2 bg-[#1a1a1a] relative z-10">
                <div 
                   className="absolute left-0 top-0 h-full bg-[#00ffff] shadow-[0_0_10px_#00ffff]"
                   style={{
                     width: isPlaying ? '100%' : '0%',
                     transition: isPlaying ? 'width 60s linear' : 'none'
                   }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between w-full lg:w-auto gap-8">
            <div className="text-right flex-1 lg:flex-none">
              <div className="text-[12px] text-[#ff00ff] uppercase mb-1 flex items-center justify-end gap-2 font-bold tracking-widest">
                 <Volume2 size={14} className="text-[#00ffff]" /> OUTPUT_VOL
              </div>
              <div className="w-full lg:w-32 h-2 bg-[#1a1a1a] relative border border-[#00ffff]">
                <div className="absolute left-0 top-0 h-full w-[80%] bg-[#ff00ff]"></div>
              </div>
            </div>
            <div className="text-[14px] text-black bg-[#00ffff] px-2 py-1 font-bold tracking-widest hidden sm:block animate-pulse">
              SYS.OK
            </div>
          </div>
        </footer>
      </div>
      
      <audio 
        ref={audioRef}
        src={TRACKS[currentTrack].url}
        onEnded={handleTrackEnd}
        loop={false}
      />
    </div>
  );
}

