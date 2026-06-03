'use client'
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function JugadorAnimado() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    // Escena
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Luz
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xea580c, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Grupo del jugador
    const jugador = new THREE.Group();

    // Cuerpo (torso)
    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.45, 8);
    const camisetaMat = new THREE.MeshPhongMaterial({
      color: 0x006847 // verde México
    });
    const torso = new THREE.Mesh(torsoGeo, camisetaMat);
    torso.position.y = 0.2;
    jugador.add(torso);

    // Cabeza
    const cabezaGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const pielMat = new THREE.MeshPhongMaterial({ color: 0xf5c289 });
    const cabeza = new THREE.Mesh(cabezaGeo, pielMat);
    cabeza.position.y = 0.68;
    jugador.add(cabeza);

    // Cabello
    const cabelloGeo = new THREE.SphereGeometry(0.185, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const cabelloMat = new THREE.MeshPhongMaterial({ color: 0x2c1a0e });
    const cabello = new THREE.Mesh(cabelloGeo, cabelloMat);
    cabello.position.y = 0.72;
    jugador.add(cabello);

    // Pierna izquierda (quieta)
    const piernaGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.45, 8);
    const pantalonMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const piernaIzq = new THREE.Mesh(piernaGeo, pantalonMat);
    piernaIzq.position.set(-0.1, -0.22, 0);
    jugador.add(piernaIzq);

    // Pierna derecha (la que patea - animada)
    const piernaDer = new THREE.Group();
    piernaDer.position.set(0.1, -0.1, 0);
    const piernaDerMesh = new THREE.Mesh(piernaGeo, pantalonMat);
    piernaDerMesh.position.y = -0.12;
    piernaDer.add(piernaDerMesh);
    jugador.add(piernaDer);

    // Pie derecho
    const pieGeo = new THREE.BoxGeometry(0.12, 0.06, 0.2);
    const zapataMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const pieDer = new THREE.Mesh(pieGeo, zapataMat);
    pieDer.position.y = -0.32;
    piernaDer.add(pieDer);

    // Pie izquierdo
    const pieIzq = new THREE.Mesh(pieGeo, zapataMat);
    pieIzq.position.set(-0.1, -0.44, 0);
    jugador.add(pieIzq);

    // Brazo izquierdo
    const brazoGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.4, 8);
    const brazoIzq = new THREE.Group();
    brazoIzq.position.set(-0.23, 0.2, 0);
    brazoIzq.rotation.z = 0.4;
    const brazoIzqMesh = new THREE.Mesh(brazoGeo, camisetaMat);
    brazoIzq.add(brazoIzqMesh);
    jugador.add(brazoIzq);

    // Brazo derecho (animado)
    const brazoDer = new THREE.Group();
    brazoDer.position.set(0.23, 0.2, 0);
    brazoDer.rotation.z = -0.4;
    const brazoDerMesh = new THREE.Mesh(brazoGeo, camisetaMat);
    brazoDer.add(brazoDerMesh);
    jugador.add(brazoDer);

    jugador.position.set(-0.3, -0.3, 0);
    scene.add(jugador);

    // Balón
    const balonGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const balonMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 100
    });
    const balon = new THREE.Mesh(balonGeo, balonMat);

    // Hexágonos en el balón
    const hexGeo = new THREE.CircleGeometry(0.06, 6);
    const hexMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const posicionesHex: [number, number, number][] = [
      [0, 0.15, 0], [0.1, 0.1, 0.1], [-0.1, 0.1, 0.1],
      [0, -0.15, 0], [0.1, -0.1, -0.1]
    ];
    posicionesHex.forEach(([x, y, z]) => {
      const hex = new THREE.Mesh(hexGeo, hexMat);
      hex.position.set(x, y, z);
      hex.lookAt(x * 2, y * 2, z * 2);
      balon.add(hex);
    });

    balon.position.set(0.5, -0.6, 0);
    scene.add(balon);

    // Animación
    let tiempo = 0;
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      tiempo += 0.05;

      // Pierna pateando
      piernaDer.rotation.x = Math.sin(tiempo) * 0.8 - 0.3;

      // Brazos opuestos
      brazoDer.rotation.x = -Math.sin(tiempo) * 0.4;
      brazoIzq.rotation.x = Math.sin(tiempo) * 0.4;

      // Balón volando después de patada
      const fase = (tiempo % (Math.PI * 2)) / (Math.PI * 2);
      if (fase < 0.3) {
        balon.position.x = 0.5;
        balon.position.y = -0.6;
      } else {
        const t = (fase - 0.3) / 0.7;
        balon.position.x = 0.5 + t * 2;
        balon.position.y = -0.6 + Math.sin(t * Math.PI) * 0.8;
      }
      balon.rotation.x += 0.05;
      balon.rotation.z += 0.03;

      // Jugador rebota levemente
      jugador.position.y = -0.3 + Math.abs(Math.sin(tiempo * 0.5)) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '200px' }}
      className="rounded-xl overflow-hidden"
    />
  );
}
