import { useState, useEffect } from 'react';

interface Star {
  id: string;
  x: number;
  y: number;
  label: string;
  active: boolean;
  color: string;
}

interface Connection {
  from: string;
  to: string;
  active: boolean;
}

interface ConstellationMapProps {
  activeStars?: string[];
}

export default function ConstellationMap({ activeStars = [] }: ConstellationMapProps) {
  const [stars, setStars] = useState<Star[]>([
    { id: 'culto', x: 150, y: 80, label: 'Via del Culto', active: false, color: '#8b1a1a' },
    { id: 'rivolta', x: 320, y: 120, label: 'Via della Rivolta', active: false, color: '#c4421a' },
    { id: 'salvati', x: 200, y: 200, label: 'Via dei Salvati', active: false, color: '#2dd4bf' },
    { id: 'ceneri', x: 400, y: 60, label: 'Via delle Ceneri', active: false, color: '#b45309' },
    { id: 'silenzio', x: 80, y: 250, label: 'Via del Silenzio', active: false, color: '#a855f7' },
    { id: 'sangue', x: 350, y: 280, label: 'Via del Sangue Nero', active: false, color: '#ef4444' },
    { id: 'centro', x: 240, y: 170, label: 'Hondovalle', active: true, color: '#e8dcc8' },
    { id: 'dungeon_complete', x: 280, y: 240, label: 'Cimitero Completato', active: false, color: '#22c55e' },
    { id: 'father_echo', x: 120, y: 180, label: 'Eco del Padre', active: false, color: '#f59e0b' },
  ]);

  const [connections] = useState<Connection[]>([
    { from: 'centro', to: 'culto', active: true },
    { from: 'centro', to: 'rivolta', active: true },
    { from: 'centro', to: 'ceneri', active: true },
    { from: 'centro', to: 'salvati', active: false },
    { from: 'centro', to: 'silenzio', active: false },
    { from: 'centro', to: 'sangue', active: false },
    { from: 'culto', to: 'ceneri', active: true },
    { from: 'rivolta', to: 'sangue', active: false },
    { from: 'salvati', to: 'silenzio', active: false },
  ]);

  const [hoveredStar, setHoveredStar] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const getStarPos = (id: string) => {
    const s = stars.find(s => s.id === id);
    return s ? { x: s.x, y: s.y } : { x: 0, y: 0 };
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <svg viewBox="0 0 500 350" className="w-full h-auto">
        {/* Background nebula */}
        <defs>
          <radialGradient id="nebula1" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#4a0e4e" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula2" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#c4421a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="250" cy="175" r="150" fill="url(#nebula1)" />
        <circle cx="180" cy="120" r="100" fill="url(#nebula2)" />

        {/* Connections */}
        {connections.map((conn, i) => {
          const from = getStarPos(conn.from);
          const to = getStarPos(conn.to);
          const fromStar = stars.find(s => s.id === conn.from);
          const toStar = stars.find(s => s.id === conn.to);
          const fromActive = fromStar?.active || activeStars.includes(conn.from);
          const toActive = toStar?.active || activeStars.includes(conn.to);
          const isConnActive = fromActive && toActive;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isConnActive ? 'rgba(196, 66, 26, 0.5)' : 'rgba(100, 100, 100, 0.15)'}
              strokeWidth={isConnActive ? 1.5 : 0.5}
              className={isConnActive ? 'constellation-line' : ''}
              strokeDasharray={isConnActive ? '5 5' : '2 8'}
            />
          );
        })}

        {/* Stars */}
        {stars.map((star) => {
          const isActive = star.active || activeStars.includes(star.id);
          return (
            <g
              key={star.id}
              onMouseEnter={() => setHoveredStar(star.id)}
              onMouseLeave={() => setHoveredStar(null)}
              className="cursor-pointer"
            >
              {/* Outer glow */}
              {isActive && (
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={hoveredStar === star.id ? 12 : 8}
                  fill="none"
                  stroke={star.color}
                  strokeWidth="0.5"
                  opacity={0.3 + Math.sin(tick + stars.indexOf(star)) * 0.2}
                />
              )}
              {/* Core */}
              <circle
                cx={star.x}
                cy={star.y}
                r={star.id === 'centro' ? 5 : 3}
                fill={isActive ? star.color : 'rgba(100,100,100,0.4)'}
                filter={isActive ? 'url(#glow)' : undefined}
                opacity={isActive ? 1 : 0.4}
              />
              {/* Label */}
              <text
                x={star.x}
                y={star.y + (star.id === 'centro' ? -15 : 18)}
                textAnchor="middle"
                fill={isActive ? '#e8dcc8' : 'rgba(150,150,150,0.5)'}
                fontSize="9"
                fontFamily="Georgia, serif"
              >
                {star.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-ember inline-block"></span>
          <span className="text-mist">Attive</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-600 inline-block"></span>
          <span className="text-mist">Latenti</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-bone inline-block"></span>
          <span className="text-mist">Centro</span>
        </span>
      </div>
    </div>
  );
}
