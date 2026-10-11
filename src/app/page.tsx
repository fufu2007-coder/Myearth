"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// 核心数学公式：将经纬度转换为 3D 球面上的坐标
function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [litPlace, setLitPlace] = useState<string | null>(null); // 新增状态：记录点亮的地点

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);
    }

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const texture = new THREE.TextureLoader().load("/earth.jpg");
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    renderer.domElement.addEventListener("mousedown", (e) => {
      isDragging = true;
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });
    renderer.domElement.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaMove = { x: e.offsetX - previousMousePosition.x, y: e.offsetY - previousMousePosition.y };
      earth.rotation.y += deltaMove.x * 0.005;
      earth.rotation.x += deltaMove.y * 0.005;
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });
    renderer.domElement.addEventListener("mouseup", () => { isDragging = false; });
    renderer.domElement.addEventListener("mouseleave", () => { isDragging = false; });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    (window as any).addMarker = (lat: number, lon: number) => {
      const pos = latLonToVector3(lat, lon, 1.1);
      const dotGeometry = new THREE.SphereGeometry(0.06, 32, 32);
      const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.copy(pos);
      scene.add(dot);

      earth.rotation.y = -((lon + 180) * Math.PI / 180) + Math.PI - (70 * Math.PI / 180);
      earth.rotation.x = (lat * Math.PI / 180);

      console.log(`已在地球上点亮: 纬度 ${lat}, 经度 ${lon}`);
    };

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, []);

  const handleQuery = async () => {
    if (!address) return;
    setLoading(true);
    setLitPlace(null); // 先清掉旧标签

    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const data = await res.json();

      if (data.success && data.data) {
        const { latitude, longitude } = data.data;
        (window as any).addMarker(latitude, longitude);
        setLitPlace(address); // 设置新标签内容
      }
    } catch (error) {
      console.error("请求出错:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={mountRef} className="absolute inset-0 z-0" />

      <h1 
        className="text-white text-3xl font-bold whitespace-nowrap"
        style={{
          position: 'absolute',
          top: '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        欢迎玩家进入地球Online游戏，您的领域持续加载中……
      </h1>

      {/* 新增：屏幕中下方的发光标签 */}
      {litPlace && (
        <div 
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{
            background: 'rgba(30, 30, 30, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '12px 24px',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span className="text-yellow-400">📍</span>
          已点亮：{litPlace}
        </div>
      )}

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <input 
          type="text" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="输入地点，如：杭州西湖"
          className="px-4 py-2 rounded text-black outline-none w-64"
        />
        <button 
          onClick={handleQuery}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500"
        >
          {loading ? "查询中..." : "查询"}
        </button>
      </div>
    </div>
  );
}