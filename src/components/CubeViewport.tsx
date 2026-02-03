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
    <div id="cube-viewport" ref={containerRef} className={props.className}>
      <Canvas
        shadows
        camera={{ position: [4.2, 3.6, 4.6], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#0b1020"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 10, 8]} intensity={1.2} castShadow />
        <Suspense fallback={null}>
          <CubeScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
