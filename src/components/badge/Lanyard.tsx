"use client";
// Kartu ID bergantung tali — fisika Rapier (rope + spherical joint), tali MeshLine, bisa ditarik & dilempar.
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, extend, useFrame, useThree, type ThreeElement } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { CARD_H, CARD_W, drawBand, drawCardFaces, type BadgeData } from "./textures";

extend({ MeshLineGeometry, MeshLineMaterial });
declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>;
  }
}

// Jarak kamera per breakpoint = ukuran kartu di layar; jangkar = persen lebar layar.
function camZ(w: number) {
  return w < 810 ? 25 : w < 1200 ? 19 : 13;
}

function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.z = camZ(size.width);
    camera.updateProjectionMatrix();
  }, [camera, size.width]);
  return null;
}

function useAnchorX() {
  const { size, camera } = useThree();
  const persp = camera as THREE.PerspectiveCamera;
  const z = camZ(size.width);
  const vh = 2 * z * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2));
  const vw = vh * (size.width / size.height);
  const frac = size.width < 810 ? 0.76 : size.width < 1200 ? 0.1 : 0.15;
  return { x: (frac - 0.5) * vw, top: vh / 2 };
}

function Band({ data, active }: { data: BadgeData; active: boolean }) {
  const band = useRef<THREE.Mesh<MeshLineGeometry, MeshLineMaterial>>(null);
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const { size } = useThree();
  const { x, top } = useAnchorX();
  const y = top + 1.2;

  const vec = useMemo(() => new THREE.Vector3(), []);
  const ang = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
    [],
  );
  curve.curveType = "chordal";

  const [dragged, drag] = useState<THREE.Vector3 | false>(false);
  const [hovered, hover] = useState(false);
  const [tex, setTex] = useState<{ front: THREE.Texture; back: THREE.Texture; band: THREE.Texture } | null>(null);

  useEffect(() => {
    let alive = true;
    drawCardFaces(data).then(({ front, back }) => {
      if (!alive) return;
      const mk = (cv: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      };
      const band = mk(drawBand(data.idLabel));
      band.wrapS = band.wrapT = THREE.RepeatWrapping;
      setTex({ front: mk(front), back: mk(back), band });
    });
    return () => {
      alive = false;
    };
  }, [data]);

  const segment = { type: "dynamic" as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, CARD_H / 2 + 0.33, 0]]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, dragged]);

  // geser jangkar saat ukuran layar berubah
  useEffect(() => {
    fixed.current?.setTranslation({ x, y, z: 0 }, true);
    [j1, j2, j3, card].forEach((r, i) => r.current?.setTranslation({ x: x + 0.5 * (i + 1), y, z: 0 }, true));
  }, [x, y]);

  useFrame((state, delta) => {
    if (!active) return;
    if (dragged && card.current) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp());
      card.current.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    if (fixed.current && j1.current && j2.current && j3.current && card.current && band.current) {
      [j1, j2].forEach((r) => {
        const b = r.current as RapierRigidBody & { lerped?: THREE.Vector3 };
        if (!b.lerped) b.lerped = new THREE.Vector3().copy(b.translation());
        const d = Math.max(0.1, Math.min(1, b.lerped.distanceTo(b.translation())));
        b.lerped.lerp(b.translation(), Math.min(1, Math.min(delta, 0.05) * (10 + d * 40)));
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy((j2.current as RapierRigidBody & { lerped: THREE.Vector3 }).lerped);
      curve.points[2].copy((j1.current as RapierRigidBody & { lerped: THREE.Vector3 }).lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(32));
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true);
    }
  });

  return (
    <>
      <group position={[x, y, 0]}>
        <RigidBody ref={fixed} {...segment} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segment}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segment}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segment}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segment} type={dragged ? "kinematicPosition" : "dynamic"}>
          <CuboidCollider args={[CARD_W / 2, CARD_H / 2, 0.01]} />
          <group
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => {
              (e.target as Element | null)?.releasePointerCapture?.(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e) => {
              (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
              if (card.current) drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
            }}
          >
            <RoundedBox args={[CARD_W, CARD_H, 0.018]} radius={0.008} smoothness={2}>
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
            </RoundedBox>
            {tex ? (
              <>
                <mesh position={[0, 0, 0.0095]}>
                  <planeGeometry args={[CARD_W, CARD_H]} />
                  <meshPhysicalMaterial map={tex.front} transparent alphaTest={0.5} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.25} />
                </mesh>
                <mesh position={[0, 0, -0.0095]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[CARD_W, CARD_H]} />
                  <meshPhysicalMaterial map={tex.back} transparent alphaTest={0.5} roughness={0.5} clearcoat={0.4} />
                </mesh>
              </>
            ) : null}
            {/* klip logam */}
            <group position={[0, CARD_H / 2 + 0.12, 0]}>
              <mesh position={[0, 0.13, 0]}>
                <torusGeometry args={[0.075, 0.018, 12, 32]} />
                <meshStandardMaterial color="#c8c8c8" metalness={1} roughness={0.25} />
              </mesh>
              <mesh>
                <boxGeometry args={[0.07, 0.2, 0.03]} />
                <meshStandardMaterial color="#bdbdbd" metalness={1} roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.045, 0.012, 10, 24]} />
                <meshStandardMaterial color="#c8c8c8" metalness={1} roughness={0.25} />
              </mesh>
            </group>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          args={[{ resolution: new THREE.Vector2(size.width, size.height) }]}
          color="white"
          depthTest={false}
          resolution={new THREE.Vector2(size.width, size.height)}
          useMap={tex ? 1 : 0}
          map={tex?.band}
          repeat={new THREE.Vector2(4, 1)}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}

export default function Lanyard({ data, eventSource }: { data: BadgeData; eventSource: React.RefObject<HTMLElement | null> }) {
  const [active, setActive] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className="hero-badge" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 13], fov: 25 }}
        dpr={[1, 2]}
        frameloop={active ? "always" : "never"}
        gl={{ alpha: true, antialias: true }}
        eventSource={eventSource as React.RefObject<HTMLElement>}
        eventPrefix="client"
        style={{ pointerEvents: "none" }}
      >
        <CameraRig />
        <ambientLight intensity={Math.PI * 0.6} />
        <Physics gravity={[0, -40, 0]} timeStep={1 / 60} paused={!active}>
          <Band data={data} active={active} />
        </Physics>
        <Environment resolution={256}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={8} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}
