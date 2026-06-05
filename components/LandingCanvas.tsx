'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LandingCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(0, 1.5, 7);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const spot1 = new THREE.SpotLight(0xffffff, 3);
    spot1.position.set(-6, 8, 4);
    scene.add(spot1);
    const spot2 = new THREE.SpotLight(0xea580c, 2);
    spot2.position.set(6, 6, 2);
    scene.add(spot2);

    // Pasto
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x166534, transparent: true, opacity: 0.3 });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -1;
    scene.add(grass);

    // PORTERÍA
    const postMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 80 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 8);

    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-1.8, 0.5, 0);
    scene.add(postL);

    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(1.8, 0.5, 0);
    scene.add(postR);

    const crossGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8);
    const crossBar = new THREE.Mesh(crossGeo, postMat);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.set(0, 2, 0);
    scene.add(crossBar);

    // Red de la portería
    const netMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
    for (let x = -1.8; x <= 1.8; x += 0.3) {
      const points = [new THREE.Vector3(x, -1, 0), new THREE.Vector3(x, -1, -1.2)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), netMat));
    }
    for (let y = -1; y <= 2; y += 0.3) {
      const points = [
        new THREE.Vector3(-1.8, y, 0),
        new THREE.Vector3(-1.8, y, -1.2),
        new THREE.Vector3(1.8, y, -1.2),
        new THREE.Vector3(1.8, y, 0),
      ];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), netMat));
    }

    // BALÓN
    const ballGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const ballMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 120 });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    scene.add(ball);

    const hexMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    [[0, 0.2, 0], [0.14, 0.14, 0.1], [-0.14, 0.14, 0.1], [0, -0.2, 0], [0.14, -0.14, -0.1]].forEach(([x, y, z]) => {
      const hex = new THREE.Mesh(new THREE.CircleGeometry(0.07, 6), hexMat);
      hex.position.set(x, y, z);
      hex.lookAt(x * 3, y * 3, z * 3);
      ball.add(hex);
    });

    // PARTÍCULAS de celebración
    const confettiCount = 100;
    const confettiPositions = new Float32Array(confettiCount * 3);
    const confettiVelocities: number[] = [];
    const confettiColors = new Float32Array(confettiCount * 3);

    for (let i = 0; i < confettiCount; i++) {
      confettiPositions[i * 3]     = (Math.random() - 0.5) * 0.1;
      confettiPositions[i * 3 + 1] = 1;
      confettiPositions[i * 3 + 2] = -0.5;
      confettiVelocities.push(
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.08 + 0.02,
        (Math.random() - 0.5) * 0.05
      );
      const colors = [[1, 0.7, 0], [1, 0.3, 0], [1, 1, 1], [0, 0.8, 0.3]];
      const c = colors[Math.floor(Math.random() * colors.length)];
      confettiColors[i * 3]     = c[0];
      confettiColors[i * 3 + 1] = c[1];
      confettiColors[i * 3 + 2] = c[2];
    }

    const confettiGeo = new THREE.BufferGeometry();
    confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPositions, 3));
    confettiGeo.setAttribute('color',    new THREE.BufferAttribute(confettiColors, 3));
    const confettiMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0 });
    const confetti = new THREE.Points(confettiGeo, confettiMat);
    scene.add(confetti);

    // Estado de animación
    let t = 0;
    let fase = 0;
    let celebracionT = 0;
    let animId: number;

    const resetBall = () => {
      ball.position.set(-5, -0.5, 3);
      fase = 0;
      t = 0;
      confettiMat.opacity = 0;
    };
    resetBall();

    const confettiPos = confettiGeo.attributes.position.array as Float32Array;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.008;

      if (fase === 0) {
        const progress = t / 3;
        ball.position.x = -5 + progress * 5.2;
        ball.position.y = -0.5 + Math.sin(progress * Math.PI) * 2.5;
        ball.position.z = 3 - progress * 3.2;
        ball.rotation.x += 0.08;
        ball.rotation.z += 0.05;

        if (progress >= 1) {
          fase = 1;
          celebracionT = 0;
          confettiMat.opacity = 1;
          for (let i = 0; i < confettiCount; i++) {
            confettiPos[i * 3]     = (Math.random() - 0.5) * 0.5;
            confettiPos[i * 3 + 1] = 1;
            confettiPos[i * 3 + 2] = -0.5;
          }
        }
      } else if (fase === 1) {
        celebracionT += 0.02;
        for (let i = 0; i < confettiCount; i++) {
          confettiPos[i * 3]     += confettiVelocities[i * 3];
          confettiPos[i * 3 + 1] += confettiVelocities[i * 3 + 1];
          confettiPos[i * 3 + 2] += confettiVelocities[i * 3 + 2];
          confettiVelocities[i * 3 + 1] -= 0.002;
        }
        confettiGeo.attributes.position.needsUpdate = true;

        if (celebracionT > 1.5) {
          confettiMat.opacity = Math.max(0, 1 - (celebracionT - 1.5) / 0.5);
        }
        if (celebracionT > 2.5) {
          resetBall();
        }
      }

      camera.position.x = Math.sin(Date.now() * 0.0003) * 0.5;
      camera.lookAt(0, 1, 0);

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

  return <div ref={mountRef} className="absolute inset-0" />;
}
