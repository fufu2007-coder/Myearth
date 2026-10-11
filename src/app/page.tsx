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

  useEffect(() => {
    // 1. 基础场景搭建
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);
    }

    // 2. 创建地球
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const texture = new THREE.TextureLoader().load("/earth.jpg");
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // 3. 鼠标拖拽旋转控制
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

    // 4. 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 5. 窗口自适应
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // ==========================================
    // 6. 定义全局函数 addMarker，绘制“发光光晕”
    // ==========================================
    (window as any).addMarker = (lat: number, lon: number) => {
      // 计算 3D 坐标（高度 1.02，稍微高于地球表面）
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -1.02 * Math.sin(phi) * Math.cos(theta);
      const z = 1.02 * Math.sin(phi) * Math.sin(theta);
      const y = 1.02 * Math.cos(phi);
      const pos = new THREE.Vector3(x, y, z);

      // 创建圆形光晕（已调大，颜色改成荧光黄）
      const glowGeometry = new THREE.CircleGeometry(0.3, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00, // 亮黄色（最显眼）
        transparent: true,
        opacity: 0.9, // 几乎不透明
        side: THREE.DoubleSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(pos);
      
      // 让光晕永远面向摄像机（朝向屏幕）
      glow.lookAt(camera.position);
      
      scene.add(glow);

      // 旋转地球对准中国
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

  // 查询按钮点击事件
  const handleQuery = async () => {
    if (!address) return;
    setLoading(true);
    console.log("开始请求，地点：", address);

    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      console.log("响应状态:", res.status);
      console.log("响应数据:", data);

      if (data.success && data.data) {
        const { latitude, longitude } = data.data;
        (window as any).addMarker(latitude, longitude);
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