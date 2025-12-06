
import React, { useRef, useState, useEffect } from 'react';

interface HoloCardProps {
  score: number;
  distance: number;
  date: string;
  isNewRecord: boolean;
  rank?: number;
}

export const HoloCard: React.FC<HoloCardProps> = ({ score, distance, date, isNewRecord, rank }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentage (0 to 100)
    const px = Math.abs(Math.floor(100 / rect.width * x) - 100);
    const py = Math.abs(Math.floor(100 / rect.height * y) - 100);
    
    // Calculate rotation (-1 to 1 range approx, scaled later by CSS)
    const tpX = 50 + (px - 50) / 1.5;
    const tpY = 50 + (py - 50) / 1.5;
    
    const rx = -((py - 50) / 3.5); // x rotation
    const ry = (px - 50) / 3.5;    // y rotation
    
    setRotation({ x: rx, y: ry });
    setActive(true);

    cardRef.current.style.setProperty('--mx', `${px}%`);
    cardRef.current.style.setProperty('--my', `${py}%`);
    cardRef.current.style.setProperty('--tx', `${tpX}%`);
    cardRef.current.style.setProperty('--ty', `${tpY}%`);
    cardRef.current.style.setProperty('--rx', `${rx}deg`);
    cardRef.current.style.setProperty('--ry', `${ry}deg`);
    cardRef.current.style.setProperty('--pos', `${px}% ${py}%`);
    cardRef.current.style.setProperty('--posx', `${px}%`);
    cardRef.current.style.setProperty('--posy', `${py}%`);
    cardRef.current.style.setProperty('--hyp', `${Math.sqrt((px - 50) * (px - 50) + (py - 50) * (py - 50)) / 50}`);
  };

  const handleMouseLeave = () => {
    setActive(false);
    if (!cardRef.current) return;
    
    setRotation({ x: 0, y: 0 });
    cardRef.current.style.setProperty('--mx', '50%');
    cardRef.current.style.setProperty('--my', '50%');
    cardRef.current.style.setProperty('--rx', '0deg');
    cardRef.current.style.setProperty('--ry', '0deg');
    cardRef.current.style.setProperty('--pos', '50% 50%');
    cardRef.current.style.setProperty('--hyp', '0');
  };

  // Determine card rarity style based on score
  let rarity = "common";
  if (score > 1000) rarity = "rare holo";
  if (score > 2500) rarity = "super rare holo";
  if (score > 5000 || isNewRecord) rarity = "ultra rare holo";
  if (rank === 1) rarity = "secret rare holo";

  // Use a random chihuahua image for the card art
  const dogImage = `https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=400&auto=format&fit=crop`;

  return (
    <div className="card-container" style={{ perspective: '2000px', margin: '20px auto' }}>
      <div 
        ref={cardRef}
        className={`card ${rarity} ${active ? 'active' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="card__front">
          <div className="card__shine" />
          <div className="card__glare" />
          
          {/* Card Content Structure similar to Pokemon */}
          <div className="absolute inset-0 p-3 flex flex-col text-black font-sans pointer-events-none select-none">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs uppercase tracking-tight text-gray-700">Basic Pokémon</span>
              <div className="flex items-center gap-1">
                 <span className="text-red-600 font-bold text-lg">{score}</span>
                 <span className="text-[8px] font-bold">HP</span>
              </div>
            </div>

            {/* Image Frame */}
            <div className="relative border-[4px] border-yellow-400 bg-white shadow-inner mb-2 overflow-hidden aspect-[4/3]">
               <img src={dogImage} className="w-full h-full object-cover" alt="Chihuahua" />
               {isNewRecord && (
                 <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-bold px-1 py-0.5">NEW RECORD</div>
               )}
            </div>

            {/* Title / Info */}
            <div className="flex justify-between items-center px-1 mb-1">
               <span className="font-bold text-sm">Runner Dog</span>
               <span className="text-[8px] italic text-gray-500">{distance.toFixed(0)}m Run</span>
            </div>

            {/* Ability / Attacks */}
            <div className="flex-1 border-t-2 border-gray-200 pt-1 space-y-2">
               <div className="flex gap-2 items-center">
                  <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-400"></div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                       <span className="font-bold text-xs">Dodge</span>
                       <span className="font-bold text-xs">10+</span>
                    </div>
                    <p className="text-[8px] leading-tight text-gray-600">Flip a coin. If heads, prevent all effects of an attack, including damage.</p>
                  </div>
               </div>

               <div className="flex gap-2 items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div>
                  <div className="flex-1">
                     <div className="flex justify-between">
                       <span className="font-bold text-xs">Zoomies</span>
                       <span className="font-bold text-xs">{(score / 10).toFixed(0)}</span>
                    </div>
                     <p className="text-[8px] leading-tight text-gray-600">This attack does 10 damage times the number of meters run.</p>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="mt-1 flex justify-between text-[6px] text-gray-500 font-mono">
               <span>weakness: Gorilla</span>
               <span>resistance: -20</span>
               <span>retreat: 1</span>
            </div>
            <div className="text-[6px] text-right text-gray-400 mt-0.5">
               {date.split('T')[0]} • #{rank ?? '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
