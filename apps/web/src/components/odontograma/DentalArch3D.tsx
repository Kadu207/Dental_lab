import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useMemo } from "react";
import {
  buildArch,
  CONDITION_MAP,
  type ToothConditionId,
  type ToothState,
} from "../../lib/odontograma";

type Props = {
  states: ToothState[];
  selectedFdi: number | null;
  onSelect: (fdi: number) => void;
  onConditionChange?: (fdi: number, condition: ToothConditionId) => void;
};

function ToothMesh({
  fdi,
  x,
  y,
  rotation,
  scale,
  condition,
  selected,
  onSelect,
}: {
  fdi: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  condition: ToothConditionId;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = CONDITION_MAP[condition]?.color ?? "#e2e8f0";
  const hidden = condition === "ausente";

  return (
    <group position={[x * 3.2, y * 1.8, 0]} rotation={[0, 0, (rotation * Math.PI) / 180]}>
      {!hidden && (
        <mesh
          scale={[0.22 * scale, 0.35 * scale, 0.18 * scale]}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <boxGeometry args={[1, 1.4, 0.6]} />
          <meshStandardMaterial
            color={color}
            emissive={selected ? "#a78bfa" : "#000000"}
            emissiveIntensity={selected ? 0.35 : 0}
          />
        </mesh>
      )}
      <Text
        position={[0, hidden ? 0 : -0.35, 0.2]}
        fontSize={0.14}
        color={selected ? "#7c3aed" : "#334155"}
        anchorX="center"
        anchorY="middle"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {String(fdi)}
      </Text>
    </group>
  );
}

function ArchScene({ states, selectedFdi, onSelect }: Props) {
  const layout = useMemo(() => buildArch(), []);
  const map = useMemo(() => Object.fromEntries(states.map((s) => [s.fdi, s])), [states]);

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 8]} intensity={0.9} />
      {layout.map((t) => {
        const st = map[t.fdi];
        const condition = st?.condition ?? "sadio";
        return (
          <ToothMesh
            key={t.fdi}
            fdi={t.fdi}
            x={t.x}
            y={t.y}
            rotation={t.rotation}
            scale={t.scale}
            condition={condition}
            selected={selectedFdi === t.fdi}
            onSelect={() => onSelect(t.fdi)}
          />
        );
      })}
      <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 1.8} minPolarAngle={0.2} />
    </>
  );
}

export function DentalArch3D(props: Props) {
  return (
    <div className="odontograma-canvas-wrap" style={{ height: 360, width: "100%", borderRadius: 12 }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 42 }} style={{ background: "var(--surface-2, #f8fafc)" }}>
        <ArchScene {...props} />
      </Canvas>
    </div>
  );
}
