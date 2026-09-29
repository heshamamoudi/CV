import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** A single persistent scene; chapter changes move the sculpture through the composition. */
export function Sculpture({
  chapter,
  paused,
  rtl = false,
}: {
  chapter: number;
  paused: boolean;
  rtl?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ chapter, paused, rtl });
  const [fallback, setFallback] = useState(false);
  current.current = { chapter, paused, rtl };
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.z = 11;
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x655464, 2));
    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(-3, 5, 4);
    scene.add(light);
    const rim = new THREE.PointLight(0xff643d, 15);
    rim.position.set(3, -2, 3);
    scene.add(rim);
    const group = new THREE.Group();
    scene.add(group);
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xdce1e7,
      metalness: 1,
      roughness: 0.16,
    });
    // All five surfaces share topology. Interpolate the actual vertices and normals,
    // so a chapter change reforms the ribbon rather than swapping or rotating models.
    const loop = (fn: (a: number) => THREE.Vector3) =>
      new THREE.CatmullRomCurve3(
        Array.from({ length: 96 }, (_, i) => fn((i / 96) * Math.PI * 2)),
        true,
      );
    const curves: THREE.Curve<THREE.Vector3>[] = [
      loop(
        (a) =>
          new THREE.Vector3(
            (2 + Math.cos(3 * a)) * Math.cos(2 * a) * 0.5,
            (2 + Math.cos(3 * a)) * Math.sin(2 * a) * 0.5,
            Math.sin(3 * a) * 0.55,
          ),
      ),
      loop(
        (a) =>
          new THREE.Vector3(
            (1.3 + 0.4 * Math.cos(3 * a)) * Math.cos(a),
            (1.3 + 0.4 * Math.cos(3 * a)) * Math.sin(a),
            0.18 * Math.sin(3 * a),
          ),
      ),
      new THREE.CatmullRomCurve3(
        [
          [-1.3, -1.6, 0],
          [-0.15, -1.2, 0.3],
          [0.75, -0.7, 0],
          [-0.8, -0.1, 0.15],
          [-0.5, 0.5, 0],
          [0.8, 1, 0.2],
          [1.25, 1.6, 0],
        ].map((v) => new THREE.Vector3(...v)),
      ),
      loop(
        (a) =>
          new THREE.Vector3(
            (1.05 + 0.55 * Math.cos(5 * a)) * Math.cos(a),
            (1.05 + 0.55 * Math.cos(5 * a)) * Math.sin(a),
            0.22 * Math.sin(5 * a),
          ),
      ),
      new THREE.CatmullRomCurve3(
        [
          [-1.4, -0.45, 0],
          [-1.4, 0.75, 0],
          [-0.8, 1.2, 0],
          [0.85, 1.2, 0],
          [1.45, 0.65, 0],
          [1.4, -0.45, 0],
          [0.7, -0.85, 0],
          [-0.1, -0.85, 0],
          [-0.8, -1.45, 0],
          [-0.7, -0.8, 0],
        ].map((v) => new THREE.Vector3(...v)),
        true,
        "centripetal",
        0.5,
      ),
    ];
    const shapes = curves.map(
      (curve, i) =>
        new THREE.TubeGeometry(
          curve,
          160,
          i === 2 ? 0.15 : i === 4 ? 0.2 : 0.27,
          24,
          i !== 2,
        ),
    );
    const geometry = shapes[current.current.chapter].clone();
    const knot = new THREE.Mesh(geometry, chrome);
    group.add(knot);
    const positions = geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.015, 8, 140),
      new THREE.MeshStandardMaterial({
        color: 0xff6039,
        metalness: 0.5,
        roughness: 0.3,
      }),
    );
    ring.rotation.set(1.15, 0.2, -0.3);
    ring.material.transparent = true;
    group.add(ring);
    const textures: THREE.Texture[] = [],
      tiles: THREE.Group[] = [];
    const colors = [0xff633b, 0xc8baf2, 0x252326, 0xeee9df];
    const tileFaces: THREE.MeshBasicMaterial[] = [];
    const labelSets = [
      ["</>", ".NET", "API", "C#"],
      ["WEB", "OPS", "ERP", "API"],
      ["2021", "2022", "2024", "2025"],
      [".NET", "Odoo", "SQL", "Cloud"],
      ["Hi", "↗", "أهلاً", ":)"],
    ];
    labelSets[0].forEach((_label, i) => {
      const tile = new THREE.Group(),
        s = 0.45,
        r = 0.11;
      const shape = new THREE.Shape();
      shape.moveTo(-s + r, -s);
      shape.lineTo(s - r, -s);
      shape.quadraticCurveTo(s, -s, s, -s + r);
      shape.lineTo(s, s - r);
      shape.quadraticCurveTo(s, s, s - r, s);
      shape.lineTo(-s + r, s);
      shape.quadraticCurveTo(-s, s, -s, s - r);
      shape.lineTo(-s, -s + r);
      shape.quadraticCurveTo(-s, -s, -s + r, -s);
      tile.add(
        new THREE.Mesh(
          new THREE.ExtrudeGeometry(shape, {
            depth: 0.15,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 1,
            bevelSize: 0.035,
            bevelThickness: 0.04,
          }),
          new THREE.MeshPhysicalMaterial({
            color: colors[i],
            metalness: 0.1,
            roughness: 0.3,
            clearcoat: 1,
          }),
        ),
      );
      const maps = labelSets.map((labels) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = i === 2 ? "#f2eee5" : "#242225";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `600 ${labels[i].length > 3 ? 60 : 76}px sans-serif`;
          ctx.fillText(labels[i], 128, 132);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.push(texture);
        return texture;
      });
      const faceMaterial = new THREE.MeshBasicMaterial({
        map: maps[current.current.chapter],
        transparent: true,
        depthWrite: false,
      });
      faceMaterial.userData.maps = maps;
      tileFaces.push(faceMaterial);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(0.82, 0.82),
        faceMaterial,
      );
      face.position.z = 0.195;
      tile.add(face);
      tile.rotation.set(-0.2 + i * 0.12, -0.3 + i * 0.2, (i - 1.5) * 0.24);
      tiles.push(tile);
      group.add(tile);
    });
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 24, 16),
      new THREE.MeshStandardMaterial({
        color: 0xff633b,
        roughness: 0.2,
        metalness: 0.4,
      }),
    );
    group.add(ball);
    const milestones = Array.from({ length: 4 }, (_, i) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 14),
        new THREE.MeshStandardMaterial({
          color: i === 3 ? 0xff633b : 0xc8baf2,
          metalness: 0.45,
          roughness: 0.25,
          transparent: true,
          opacity: 0,
        }),
      );
      m.position.copy(curves[2].getPointAt(0.05 + i * 0.29));
      group.add(m);
      return m;
    });
    let width = 1,
      positioned = false,
      needsRender = true;
    const resize = () => {
      width = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(width, h);
      camera.aspect = width / Math.max(h, 1);
      camera.updateProjectionMatrix();
      needsRender = true;
      if (!positioned) {
        group.position.x =
          (width < 700 ? 0 : 1.65) * (current.current.rtl ? -1 : 1);
        group.scale.setScalar(width < 700 ? 0.76 : 1.12);
        positioned = true;
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const pointer = new THREE.Vector2();
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "touch")
        pointer.set(
          (e.clientX / innerWidth - 0.5) * 2,
          (e.clientY / innerHeight - 0.5) * 2,
        );
    };
    window.addEventListener("pointermove", move, { passive: true });
    let frame = 0,
      last = performance.now(),
      t = 0,
      lost = false,
      lastChapter = -1;
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      setFallback(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    const scaleVector = new THREE.Vector3();
    const animate = (now: number) => {
      // A first RAF timestamp can precede setup's performance.now() after shader compilation.
      // A negative delta sends the journey marker outside the curve's [0,1] domain.
      frame = requestAnimationFrame(animate);
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
      last = now;
      if (document.hidden || lost) return;
      const { chapter: c, paused: stop, rtl: isRtl } = current.current;
      if (stop && lastChapter === c && !needsRender) return;
      if (!stop) t += dt;
      const smooth = stop ? 1 : 1 - Math.exp(-dt * 4),
        mobile = width < 700;
      const x =
        (mobile ? [0, 1.2, -1.2, 1.4, 0][c] : [1.65, 2.7, -2.7, 2.6, 0.7][c]) *
        (isRtl ? -1 : 1);
      const y = mobile
        ? [0.25, 1, 1, 1.1, 0.9][c]
        : [0.08, 0.1, 0.05, 0, 0.25][c];
      const scale = mobile
        ? [0.76, 0.48, 0.45, 0.47, 0.65][c]
        : [1.12, 0.86, 0.86, 0.82, 1.05][c];
      group.position.x = THREE.MathUtils.lerp(group.position.x, x, smooth);
      group.position.y = THREE.MathUtils.lerp(
        group.position.y,
        y + (stop ? 0 : Math.sin(t * 0.6) * 0.06),
        smooth,
      );
      group.scale.lerp(scaleVector.setScalar(scale), smooth);
      group.rotation.y = THREE.MathUtils.lerp(
        group.rotation.y,
        (c === 0 ? 0.2 : 0) +
          (stop ? 0 : Math.sin(t * 0.16) * 0.1 + pointer.x * 0.14),
        smooth,
      );
      group.rotation.x = THREE.MathUtils.lerp(
        group.rotation.x,
        stop ? 0 : pointer.y * 0.09,
        smooth,
      );
      const targetPositions = shapes[c].getAttribute("position"),
        targetNormals = shapes[c].getAttribute("normal");
      for (let i = 0; i < positions.array.length; i++) {
        positions.array[i] +=
          (targetPositions.array[i] - positions.array[i]) * smooth;
        normals.array[i] +=
          (targetNormals.array[i] - normals.array[i]) * smooth;
      }
      positions.needsUpdate = true;
      normals.needsUpdate = true;
      knot.rotation.z = THREE.MathUtils.lerp(
        knot.rotation.z,
        c === 0 ? -0.25 + Math.sin(t * 0.15) * 0.12 : 0,
        smooth,
      );
      ring.rotation.z = -0.3 - t * 0.07;
      ring.material.opacity = THREE.MathUtils.lerp(
        ring.material.opacity,
        c === 0 ? 1 : c === 3 ? 0.35 : 0,
        smooth,
      );
      if (lastChapter !== c) {
        tileFaces.forEach((m) => {
          m.map = m.userData.maps[c];
          m.needsUpdate = true;
        });
        lastChapter = c;
      }
      tiles.forEach((tile, i) => {
        const a = (i * Math.PI) / 2 + (c === 0 ? t * 0.075 : 0) + 0.4;
        const milestone = curves[2].getPointAt(0.05 + i * 0.29);
        const target =
          c === 2
            ? new THREE.Vector3(
                milestone.x + (i % 2 === 0 ? -0.48 : 0.48),
                milestone.y,
                0.3,
              )
            : new THREE.Vector3(
                Math.cos(a) * 2.13,
                Math.sin(a) * 1.78,
                Math.sin(a + 0.8) * 0.5 + 0.4,
              );
        tile.position.lerp(target, smooth);
        tile.scale.lerp(
          scaleVector.setScalar(c === 2 ? 0.57 : c === 4 ? 0.72 : 1),
          smooth,
        );
        tile.rotation.z = THREE.MathUtils.lerp(
          tile.rotation.z,
          c === 2 ? 0 : (i - 1.5) * 0.24 + Math.sin(t * 0.5 + i) * 0.08,
          smooth,
        );
      });
      milestones.forEach(
        (m) =>
          (m.material.opacity = THREE.MathUtils.lerp(
            m.material.opacity,
            c === 2 ? 1 : 0,
            smooth,
          )),
      );
      if (c === 2) ball.position.copy(curves[2].getPointAt((t * 0.12) % 1));
      else
        ball.position.set(
          Math.sin(t * 0.3 + 1) * 2.5,
          Math.cos(t * 0.3 + 1) * 2,
          Math.sin(t * 0.2),
        );
      renderer.render(scene, camera);
      needsRender = false;
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      shapes.forEach((s) => s.dispose());
      textures.forEach((t) => t.dispose());
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={host}
      className={`sculpture ${fallback ? "sculpture-fallback" : ""}`}
      aria-hidden="true"
    >
      {fallback && (
        <div className="fallback-knot">
          <i />
          <i />
          <i />
        </div>
      )}
    </div>
  );
}
