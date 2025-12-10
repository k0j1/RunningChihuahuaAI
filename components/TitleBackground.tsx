
import React, { useEffect, useRef } from 'react';

export const TitleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number;
    let height: number;
    let cx: number;
    let cy: number;
    let stars: Star[] = [];
    let animationFrameId: number;

    const numStars = 400;
    const speed = 25; // Warp speed constant

    class Star {
      x: number;
      y: number;
      z: number;
      pz: number; // Previous Z for trails
      color: string;

      constructor() {
        this.x = (Math.random() - 0.5) * width * 3; // Spread wider than screen to avoid empty center gap
        this.y = (Math.random() - 0.5) * height * 3;
        this.z = Math.random() * width; // Random depth
        this.pz = this.z;
        
        // Colors: White, Cyan, Blue for Sci-Fi feel
        const colors = ['#FFFFFF', '#E0F7FA', '#80DEEA', '#4DD0E1', '#00BCD4'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        // Move star closer
        this.z = this.z - speed;
        
        // If star passes camera, reset to back
        if (this.z < 1) {
          this.z = width;
          this.x = (Math.random() - 0.5) * width * 3;
          this.y = (Math.random() - 0.5) * height * 3;
          this.pz = this.z;
        }
      }

      show() {
        if (!ctx) return;

        // Perspective projection: x' = x / z
        const sx = (this.x / this.z) * width + cx;
        const sy = (this.y / this.z) * height + cy;

        // Previous position for trail calculation
        const px = (this.x / this.pz) * width + cx;
        const py = (this.y / this.pz) * height + cy;

        // Update previous Z for next frame
        this.pz = this.z;

        // Don't draw if weirdly out of bounds or calculation glitch
        if (this.z >= width) return;

        // Calculate visual properties
        const radius = (1 - this.z / width) * 3; // Larger when closer
        const opacity = (1 - this.z / width);

        // Draw the streak
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(0.5, radius); // Ensure visible
        ctx.lineCap = 'round';
        ctx.globalAlpha = opacity;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      cx = width / 2;
      cy = height / 2;
      canvas.width = width;
      canvas.height = height;

      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
      }
    };

    const animate = () => {
      // Clear screen
      ctx.fillStyle = '#111827'; // Match app theme background (Gray-900)
      ctx.fillRect(0, 0, width, height);

      stars.forEach(star => {
        star.update();
        star.show();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
      init();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />;
};
