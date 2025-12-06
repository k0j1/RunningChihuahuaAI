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
    let particles: Particle[] = [];
    let field: Vector[][] = [];
    const columns = 50;
    const rows = 50;
    let animationFrameId: number;

    // Vector Helper
    class Vector {
      x: number;
      y: number;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
      add(v: Vector) {
        this.x += v.x;
        this.y += v.y;
      }
    }

    // Particle Class
    class Particle {
      pos: Vector;
      vel: Vector;
      acc: Vector;
      maxSpeed: number;
      color: string;
      prevPos: Vector;

      constructor(w: number, h: number) {
        this.pos = new Vector(Math.random() * w, Math.random() * h);
        this.prevPos = new Vector(this.pos.x, this.pos.y);
        this.vel = new Vector(0, 0);
        this.acc = new Vector(0, 0);
        this.maxSpeed = 2 + Math.random() * 2;
        
        // Colors matching the game theme (Yellow/Orange/Red/Blue)
        const colors = ['#FFD700', '#FF4500', '#1E90FF', '#00CED1', '#FF69B4'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      follow(vectors: Vector[][], cols: number, rows: number, w: number, h: number) {
        const x = Math.floor(this.pos.x / (w / cols));
        const y = Math.floor(this.pos.y / (h / rows));
        
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          const force = vectors[x][y];
          this.applyForce(force);
        }
      }

      applyForce(force: Vector) {
        this.acc.x += force.x;
        this.acc.y += force.y;
      }

      update() {
        this.prevPos.x = this.pos.x;
        this.prevPos.y = this.pos.y;

        this.vel.add(this.acc);
        
        // Limit speed
        const mag = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
        if (mag > this.maxSpeed) {
          this.vel.x = (this.vel.x / mag) * this.maxSpeed;
          this.vel.y = (this.vel.y / mag) * this.maxSpeed;
        }

        this.pos.add(this.vel);
        this.acc.x = 0;
        this.acc.y = 0;
      }

      edges(w: number, h: number) {
        if (this.pos.x > w) { this.pos.x = 0; this.prevPos.x = 0; }
        if (this.pos.x < 0) { this.pos.x = w; this.prevPos.x = w; }
        if (this.pos.y > h) { this.pos.y = 0; this.prevPos.y = 0; }
        if (this.pos.y < 0) { this.pos.y = h; this.prevPos.y = h; }
      }

      show(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.moveTo(this.prevPos.x, this.prevPos.y);
        ctx.lineTo(this.pos.x, this.pos.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Noise function (Simple pseudo-random noise)
    const noise = (x: number, y: number) => {
      const sin = Math.sin(x * 0.1 + y * 0.1);
      const cos = Math.cos(x * 0.05 - y * 0.05);
      return (sin + cos) * Math.PI * 2;
    };

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      // Initialize Field
      field = [];
      for (let x = 0; x < columns; x++) {
        field[x] = [];
        for (let y = 0; y < rows; y++) {
          const angle = noise(x, y);
          // Create vector from angle
          const v = new Vector(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5); // 0.5 magnitude
          field[x][y] = v;
        }
      }

      // Initialize Particles
      particles = [];
      const particleCount = width < 768 ? 300 : 800; // Less particles on mobile
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(width, height));
      }

      // Fill background black initially
      ctx.fillStyle = '#111827'; // Tailwind gray-900
      ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      // Trail effect: Draw semi-transparent rect to fade previous frames
      ctx.fillStyle = 'rgba(17, 24, 39, 0.1)'; // Gray-900 with alpha
      ctx.fillRect(0, 0, width, height);

      // Time evolution for field (slowly changing noise)
      const time = Date.now() * 0.0002;
      for (let x = 0; x < columns; x++) {
        for (let y = 0; y < rows; y++) {
          const angle = noise(x + time, y + time);
          field[x][y] = new Vector(Math.cos(angle) * 0.1, Math.sin(angle) * 0.1);
        }
      }

      particles.forEach(p => {
        p.follow(field, columns, rows, width, height);
        p.update();
        p.edges(width, height);
        p.show(ctx);
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

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 opacity-80" />;
};
