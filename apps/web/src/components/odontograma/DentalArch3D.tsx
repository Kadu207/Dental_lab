import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox, OrbitControls, Html, ContactShadows } from "@react-three/drei";
import type { Group } from "three";
import {
  buildArch,
  CONDITION_MAP,
  toothName,
  type ToothConditionId,
  type ToothLayout,
  type ToothStateMap,
} from "../../lib/odontograma";

const tooltipStyle: CSSProperties = {
  pointerEvents: "none",
  whiteSpace: "nowrap",
  borderRadius: 8,
  background: "#0f172a",
  color: "#f8fafc",
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 500,
  boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
};

interface ToothProps {
  layout: ToothLayout;
  condition: ToothConditionId;
  selected: boolean;
  onSelect: (fdi: number) => void;
  onHover: (fdi: number | null) => void;
}

function cuspOffsets(type: ToothLayout["type"]): Array<[number, number]> {
  switch (type) {
    case "molar":
      return [
        [0.26, 0.26],
        [0.26, -0.26],
        [-0.26, 0.26],
        [-0.26, -0.26],
      ];
    case "premolar":
      return [
        [0.24, 0],
        [-0.24, 0],
      ];
    case "canino":
      return [[0, 0]];
    default:
      return [];
  }
}

function Tooth({ layout, condition, selected, onSelect, onHover }: ToothProps) {
  const meta = CONDITION_MAP[condition];
  const [w, h, d] = layout.size;
  const isUpper = layout.arch === "upper";
  const absent = condition === "ausente";
  const metalness = condition === "implante" || condition === "coroa" ? 0.6 : 0.05;
  const rootDir = isUpper ? 1 : -1;
  const occlDir = -rootDir;
  const rootHeight = h * 0.9;
  const rootY = rootDir * (h / 2 + rootHeight / 2 - 0.05);
  const crownH = h * 0.82;
  const occlY = occlDir * (crownH / 2);
  const cusps = cuspOffsets(layout.type);
  const cuspR = Math.min(w, d) * 0.22;
  const incisor = layout.type === "incisivo";
  const rootCount = layout.type === "molar" ? 2 : 1;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(layout.fdi);
  };
  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(layout.fdi);
    document.body.style.cursor = "pointer";
  };
  const handleOut = () => {
    onHover(null);
    document.body.style.cursor = "auto";
  };

  return (
    <group
      position={layout.position}
      rotation={[0, layout.rotationY, 0]}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      <RoundedBox
        args={[w, crownH, d]}
        radius={Math.min(w, crownH, d) * 0.3}
        smoothness={4}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={meta.color}
          roughness={0.32}
          metalness={metalness}
          transparent={absent}
          opacity={absent ? 0.16 : 1}
          emissive={selected ? "#a78bfa" : "#000000"}
          emissiveIntensity={selected ? 0.6 : 0}
        />
      </RoundedBox>

      {!absent && (
        <>
          {incisor && (
            <mesh position={[0, occlY, 0]} castShadow>
              <boxGeometry args={[w * 0.9, h * 0.12, d * 0.45]} />
              <meshStandardMaterial color={meta.color} roughness={0.3} metalness={metalness} />
            </mesh>
          )}
          {cusps.map(([ox, oz], i) => (
            <mesh key={i} position={[ox * w, occlY + occlDir * cuspR * 0.5, oz * d]} castShadow>
              <sphereGeometry args={[cuspR, 16, 16]} />
              <meshStandardMaterial
                color={meta.color}
                roughness={0.3}
                metalness={metalness}
                emissive={selected ? "#a78bfa" : "#000000"}
                emissiveIntensity={selected ? 0.4 : 0}
              />
            </mesh>
          ))}
        </>
      )}

      {!absent &&
        Array.from({ length: rootCount }).map((_, i) => {
          const spread = rootCount > 1 ? (i === 0 ? -1 : 1) : 0;
          return (
            <mesh
              key={`root-${i}`}
              position={[spread * w * 0.22, rootY, 0]}
              rotation={[isUpper ? 0 : Math.PI, 0, 0]}
              castShadow
            >
              <coneGeometry args={[w * (rootCount > 1 ? 0.2 : 0.32), rootHeight, 12]} />
              <meshStandardMaterial color={meta.color} roughness={0.6} metalness={0.02} />
            </mesh>
          );
        })}
    </group>
  );
}

function Scene({
  states,
  selected,
  onSelect,
  autoRotate,
}: {
  states: ToothStateMap;
  selected: number | null;
  onSelect: (fdi: number) => void;
  autoRotate: boolean;
}) {
  const arch = useMemo(() => buildArch(), []);
  const [hovered, setHovered] = useState<number | null>(null);
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current && hovered === null) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  const hoveredLayout = arch.find((t) => t.fdi === hovered) ?? null;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.4} />

      <group ref={groupRef}>
        {arch.map((layout) => (
          <Tooth
            key={layout.fdi}
            layout={layout}
            condition={states[layout.fdi]?.condition ?? "sadio"}
            selected={selected === layout.fdi}
            onSelect={onSelect}
            onHover={setHovered}
          />
        ))}

        {hoveredLayout && (
          <Html
            position={[
              hoveredLayout.position[0],
              hoveredLayout.position[1] + (hoveredLayout.arch === "upper" ? 2.2 : -2.2),
              hoveredLayout.position[2],
            ]}
            center
            distanceFactor={12}
          >
            <div style={tooltipStyle}>
              <strong>{hoveredLayout.fdi}</strong> · {toothName(hoveredLayout.fdi)}
              <span style={{ marginLeft: 6, opacity: 0.75 }}>
                ({CONDITION_MAP[states[hoveredLayout.fdi]?.condition ?? "sadio"].label})
              </span>
            </div>
          </Html>
        )}
      </group>

      <ContactShadows position={[0, -2.6, 0]} opacity={0.35} scale={18} blur={2.5} far={6} />

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={22}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
        makeDefault
      />
    </>
  );
}

type Props = {
  states: ToothStateMap;
  selected: number | null;
  onSelect: (fdi: number) => void;
  autoRotate?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

export function DentalArch3D({ states, selected, onSelect, autoRotate = true, onCanvasReady }: Props) {
  return (
    <div className="odontograma-canvas-wrap">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.5, 14], fov: 42 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => onCanvasReady?.(gl.domElement)}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#0c0f1a"]} />
        <fog attach="fog" args={["#0c0f1a", 16, 30]} />
        <Scene states={states} selected={selected} onSelect={onSelect} autoRotate={autoRotate} />
      </Canvas>
    </div>
  );
}
