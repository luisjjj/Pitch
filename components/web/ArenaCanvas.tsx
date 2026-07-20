"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ArenaCanvas() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, .1, 100);
    camera.position.z = 8;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(el.clientWidth, el.clientHeight); el.appendChild(renderer.domElement);
    const group = new THREE.Group(); scene.add(group);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 4), new THREE.MeshStandardMaterial({ color: 0x8e1420, emissive: 0x44070d, metalness: .55, roughness: .22 })); group.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, .024, 8, 90), new THREE.MeshBasicMaterial({ color: 0xed4350, transparent: true, opacity: .7 })); ring.rotation.x = 1.12; group.add(ring);
    const count = 180; const points = new Float32Array(count * 3);
    for (let i=0;i<count;i++) { const r = 2.7 + Math.random()*1.4; const a=Math.random()*Math.PI*2; const z=(Math.random()-.5)*2.5; points[i*3]=Math.cos(a)*r; points[i*3+1]=Math.sin(a)*r; points[i*3+2]=z; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position",new THREE.BufferAttribute(points,3)); const dust=new THREE.Points(pg,new THREE.PointsMaterial({color:0xff6872,size:.032,transparent:true,opacity:.8})); group.add(dust);
    scene.add(new THREE.AmbientLight(0xffc5c9, .8)); const light=new THREE.PointLight(0xff3440, 35, 18);light.position.set(2,3,4);scene.add(light);
    let frame=0; const tick=()=>{frame=requestAnimationFrame(tick);group.rotation.y+=.003;core.rotation.x+=.004;ring.rotation.z-=.005;renderer.render(scene,camera)};tick();
    const resize=()=>{if(!el)return;camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight)};window.addEventListener("resize",resize);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);renderer.dispose();el.removeChild(renderer.domElement)};
  }, []);
  return <div ref={host} style={{ position:"absolute", inset:0 }} aria-hidden="true" />;
}
