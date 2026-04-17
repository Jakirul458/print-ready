import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
}

const COLORS = [
  { r: 34, g: 197, b: 94 },   // green
  { r: 249, g: 115, b: 22 },  // orange
  { r: 16, g: 185, b: 129 },  // emerald
  { r: 251, g: 146, b: 60 },  // amber
];

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouse);

    const count = Math.min(100, Math.floor((window.innerWidth * window.innerHeight) / 10000));
    nodesRef.current = Array.from({ length: count }, () => {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1.5,
        color: `${c.r}, ${c.g}, ${c.b}`,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
      };
    });

    const maxDist = 150;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;

      for (const n of nodes) {
        n.pulse += n.pulseSpeed;
        n.x += n.vx;
        n.y += n.vy;

        // Mouse interaction
        const mdx = n.x - mouse.x;
        const mdy = n.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 120 && mDist > 0) {
          const force = (120 - mDist) / 120 * 0.3;
          n.vx += (mdx / mDist) * force;
          n.vy += (mdy / mDist) * force;
        }

        // Damping
        n.vx *= 0.99;
        n.vy *= 0.99;

        // Speed limit
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 1.5) {
          n.vx = (n.vx / speed) * 1.5;
          n.vy = (n.vy / speed) * 1.5;
        }

        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        n.x = Math.max(0, Math.min(canvas.width, n.x));
        n.y = Math.max(0, Math.min(canvas.height, n.y));
      }

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.2;
            const gradient = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            gradient.addColorStop(0, `rgba(${nodes[i].color}, ${alpha})`);
            gradient.addColorStop(1, `rgba(${nodes[j].color}, ${alpha})`);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Nodes with pulsing glow
      for (const n of nodes) {
        const pulseAlpha = 0.5 + Math.sin(n.pulse) * 0.2;
        const glowSize = n.radius + 4 + Math.sin(n.pulse) * 2;

        // Outer glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize + 6);
        grd.addColorStop(0, `rgba(${n.color}, ${pulseAlpha * 0.3})`);
        grd.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowSize + 6, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.color}, ${pulseAlpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "linear-gradient(135deg, hsl(220 20% 8%), hsl(220 18% 12%), hsl(220 15% 10%))" }}
    />
  );
}
