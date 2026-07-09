import React, { useEffect, useRef } from 'react';

const Globe3D = ({ size = 320 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const radius = size * 0.4;
    const cx = size / 2;
    const cy = size / 2;

    // Initial angles and rotation speed
    let rotationY = 0;
    let rotationX = 0.2; // slight tilt

    // Generate random static "city" nodes on the sphere surface
    const nodeCount = 35; 
    const rawNodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const y = 1 - (i / (nodeCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = 3.88 * i; // Golden angle distribution
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      rawNodes.push({ x, y, z });
    }

    // Define connection paths between nodes
    const connections = [];
    for (let i = 0; i < 15; i++) {
      const idxA = Math.floor(Math.random() * nodeCount);
      let idxB = Math.floor(Math.random() * nodeCount);
      while (idxA === idxB) {
        idxB = Math.floor(Math.random() * nodeCount);
      }
      connections.push({
        from: idxA,
        to: idxB,
        speed: 0.008 + Math.random() * 0.012, // speed of particle pulse
        progress: Math.random()
      });
    }

    const rotateY = (x, y, z, angle) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: x * cos - z * sin,
        y: y,
        z: x * sin + z * cos
      };
    };

    const rotateX = (x, y, z, angle) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: x,
        y: y * cos - z * sin,
        z: y * sin + z * cos
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Rotate nodes in 3D
      rotationY += 0.004; // slow elegant rotation
      rotationX = 0.2 + Math.sin(rotationY * 0.3) * 0.03; // subtle wobble

      // 1. Project all nodes to 2D screen coordinates
      const nodes = rawNodes.map((n, i) => {
        let p = rotateY(n.x, n.y, n.z, rotationY);
        p = rotateX(p.x, p.y, p.z, rotationX);
        return {
          id: i,
          x: cx + p.x * radius,
          y: cy - p.y * radius,
          z: p.z,
          opacity: Math.max(0.05, (p.z + 1.0) / 2.0) // occlusion fade for back side
        };
      });

      // 2. Draw connections (arcs + animating pulse particles)
      connections.forEach(conn => {
        const fromNode = nodes[conn.from];
        const toNode = nodes[conn.to];
        
        // Only render connection lines if they are somewhat on the front/visible side
        if (fromNode.z > -0.3 || toNode.z > -0.3) {
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          
          // Calculate midpoint and pull control point outward to make curved arc
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          
          const dx = midX - cx;
          const dy = midY - cy;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const offset = 18; // curve height
          const ctrlX = midX + (dx / (dist || 1)) * offset;
          const ctrlY = midY + (dy / (dist || 1)) * offset;

          ctx.quadraticCurveTo(ctrlX, ctrlY, toNode.x, toNode.y);
          
          const alpha = Math.min(fromNode.opacity, toNode.opacity) * 0.25;
          ctx.strokeStyle = `rgba(234, 179, 8, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Animate the connection light pulse particle
          conn.progress += conn.speed;
          if (conn.progress > 1) {
            conn.progress = 0;
          }

          // Bezier interpolation
          const t = conn.progress;
          const px = (1-t)*(1-t)*fromNode.x + 2*(1-t)*t*ctrlX + t*t*toNode.x;
          const py = (1-t)*(1-t)*fromNode.y + 2*(1-t)*t*ctrlY + t*t*toNode.y;
          const pz = (1-t)*fromNode.z + t*toNode.z;

          // Only show pulsing particle when it is on the visible front side
          if (pz > 0.1) {
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${pz * 0.95})`;
            ctx.shadowColor = '#eab308';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // 3. Draw city node dots
      nodes.forEach(node => {
        ctx.beginPath();
        const dotRadius = node.z > 0 ? 1.5 + node.z * 1.5 : 1.0;
        ctx.arc(node.x, node.y, dotRadius, 0, Math.PI * 2);
        
        if (node.z > 0) {
          ctx.fillStyle = `rgba(234, 179, 8, ${node.opacity * 0.9})`;
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = node.z * 5;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = `rgba(234, 179, 8, ${node.opacity * 0.3})`;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size]);

  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none" style={{ width: `${size}px`, height: `${size}px` }}>
      {/* Outer shadow glow */}
      <div 
        className="absolute rounded-full bg-yellow-500/5 blur-3xl pointer-events-none z-0" 
        style={{ width: `${size * 0.9}px`, height: `${size * 0.9}px` }} 
      />
      
      {/* Clean Realistic Earth Globe image (static, without connection lines) */}
      <div 
        className="absolute rounded-full overflow-hidden bg-no-repeat z-10 border border-yellow-500/10 shadow-[inset_-15px_-15px_30px_rgba(0,0,0,0.85),0_0_30px_rgba(234,179,8,0.25)]"
        style={{ 
          width: `${size * 0.8}px`, 
          height: `${size * 0.8}px`,
          backgroundImage: "url('/images/earth_clean_globe.png')",
          backgroundSize: "140% 140%",
          backgroundPosition: "center"
        }}
      />

      {/* Transparent canvas overlay for animated rotating lines and city dots */}
      <canvas ref={canvasRef} className="absolute z-20 block" />
    </div>
  );
};

export default Globe3D;
