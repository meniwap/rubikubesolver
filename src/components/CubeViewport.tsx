import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { CubeScene } from "../render/CubeScene";

export function CubeViewport(props: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key.toLowerCase() !== "f") return;
      e.preventDefault();
      const target = containerRef.current;
      if (!target) return;
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void target.requestFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      id="cube-viewport"
      ref={containerRef}
      className={`relative overflow-hidden ${props.className ?? ""}`}
    >
      {/* Subtle corner glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
      
      <Canvas
        shadows
        camera={{ position: [4.2, 3.6, 4.6], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={["#0a0f1a"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 10, 8]} intensity={1.2} castShadow />
        <Suspense fallback={null}>
          <CubeScene />
        </Suspense>
      </Canvas>

      {/* Fullscreen hint */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/40 px-2 py-1 text-[10px] text-white/40 backdrop-blur-sm">
        <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/60">F</kbd>
        <span>מסך מלא</span>
      </div>
    </div>
  );
}
