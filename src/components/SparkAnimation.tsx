import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface SparkAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const SparkAnimation: React.FC<SparkAnimationProps> = ({ isVisible, onComplete }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate random particles
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5
      }));
      setParticles(newParticles);

      // Complete animation after duration
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Main heart */}
      <div className="relative">
        <Heart 
          size={80} 
          className="text-coral fill-current animate-pulse"
          style={{
            animation: 'sparkPulse 0.6s ease-out'
          }}
        />
        
        {/* Floating particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-coral rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `sparkFloat 1s ease-out ${particle.delay}s forwards`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes sparkPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes sparkFloat {
          0% { 
            transform: translate(0, 0) scale(1); 
            opacity: 1; 
          }
          100% { 
            transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) scale(0); 
            opacity: 0; 
          }
        }
      `}</style>
    </div>
  );
};