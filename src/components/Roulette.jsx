import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';

const SEGMENTS = [
  { name: 'Prêmio 1', color: '#FF6B6B' },
  { name: 'Prêmio 2', color: '#4ECDC4' },
  { name: 'Prêmio 3', color: '#FFE66D' },
  { name: 'Prêmio 4', color: '#95E1D3' },
  { name: 'Prêmio 5', color: '#F38181' },
  { name: 'Prêmio 6', color: '#AA96DA' },
];

export default function Roulette() {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    drawRoulette(rotation);
  }, [rotation]);

  const drawRoulette = (angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((angle * Math.PI) / 180);

    const sliceAngle = 360 / SEGMENTS.length;

    SEGMENTS.forEach((segment, index) => {
      const startAngle = (index * sliceAngle * Math.PI) / 180;
      const endAngle = ((index + 1) * sliceAngle * Math.PI) / 180;

      ctx.fillStyle = segment.color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.lineTo(0, 0);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + (endAngle - startAngle) / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(segment.name, radius - 30, 5);
      ctx.restore();
    });

    ctx.restore();

    // Draw center circle
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pointer
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(centerX, 10);
    ctx.lineTo(centerX - 10, 30);
    ctx.lineTo(centerX + 10, 30);
    ctx.closePath();
    ctx.fill();
  };

  const spin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

    const randomSpin = Math.random() * 360 + 720;
    const finalRotation = randomSpin % 360;

    const spinDuration = 4000;
    const startRotation = rotation;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + randomSpin * easeOut;

      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(finalRotation);
        const winningIndex = Math.floor((360 - finalRotation) / (360 / SEGMENTS.length));
        setWinner(SEGMENTS[winningIndex]);
        setIsSpinning(false);
      }
    };

    animate();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-6 px-4">
      <h2 className="text-2xl font-bold">Roda da Sorte</h2>
      
      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="w-full max-w-xs"
        />
      </div>

      <Button
        onClick={spin}
        disabled={isSpinning}
        size="lg"
        className="gap-2"
      >
        <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
        {isSpinning ? 'Girando...' : 'Girar Roleta'}
      </Button>

      {winner && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-6 py-4 text-center w-full">
          <p className="text-sm text-emerald-700 font-medium">Parabéns! Você ganhou:</p>
          <p className="text-2xl font-bold text-emerald-900">{winner.name}</p>
        </div>
      )}
    </div>
  );
}