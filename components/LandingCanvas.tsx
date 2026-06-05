'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LandingCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0);
    canvasRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const spotLight1 = new THREE.SpotLight(0xffffff, 2);
    spotLight1.position.set(-5, 8, 3);
    scene.add(spotLight1);

    const spotLight2 = new THREE.SpotLight(0xea580c, 1.5);
    spotLight2.position.set(5, 6, -3);
    scene.add(spotLight2);

    const grassGeo = new THREE.PlaneGeometry(20, 20, 20, 20);
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x166534, transparent: true, opacity: 0.4 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -1.5;
    scene.add(grass);

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
    const circlePoints = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      circlePoints.push(new THREE.Vector3(Math.cos(angle) * 2, -1.49, Math.sin(angle) * 2));
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
    scene.add(new THREE.Line(circleGeo, lineMat));

    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);
    const velocities: { vx: number; vy: number; vz: number }[] = [];
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = Math.random() * 8 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      velocities.push({
        vx: (Math.random() - 0.5) * 0.02,
        vy: -Math.random() * 0.015,
        vz: (Math.random() - 0.5) * 0.01,
      });
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xfbbf24, size: 0.08, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    const balloons: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 16),
        new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 })
      );
      ball.position.set((Math.random() - 0.5) * 8, Math.random() * 3 - 1, (Math.random() - 0.5) * 4);
      scene.add(ball);
      balloons.push(ball);
    }

    let t = 0;
    let animId: number;
    const posArray = particleGeo.attributes.position.array as Float32Array;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.005;

      camera.position.x = Math.sin(t * 0.3) * 0.5;
      camera.position.y = 2 + Math.sin(t * 0.2) * 0.3;
      camera.lookAt(0, 0, 0);

      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3]     += velocities[i].vx;
        posArray[i * 3 + 1] += velocities[i].vy;
        posArray[i * 3 + 2] += velocities[i].vz;
        if (posArray[i * 3 + 1] < -2) {
          posArray[i * 3 + 1] = 6;
          posArray[i * 3]     = (Math.random() - 0.5) * 12;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      balloons.forEach((ball, i) => {
        ball.position.y += Math.sin(t + i) * 0.003;
        ball.rotation.y += 0.01;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (canvasRef.current?.contains(renderer.domElement)) {
        canvasRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={canvasRef} className="absolute inset-0" />;
}
