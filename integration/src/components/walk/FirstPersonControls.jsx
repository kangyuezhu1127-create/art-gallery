import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const EYE_H = 1.7;
const PLAYER_R = 0.4;

// Simple FP controls: pointer-lock mouse-look + WASD + touch-drag look + on-screen joystick.
// Collision: stay within the bounding region defined by the layout.
export default function FirstPersonControls({ speed = 5, layout, active }) {
  const { camera, gl } = useThree();
  const keys = useRef(Object.create(null));
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const locked = useRef(false);
  const touchLook = useRef({ id: null, lastX: 0, lastY: 0 });
  const joy = useRef({ active: false, dx: 0, dy: 0 });

  // expose joystick state on window so HUD can drive it
  useEffect(() => {
    window.__walkJoy = joy.current;
    return () => { delete window.__walkJoy; };
  }, []);

  useEffect(() => {
    camera.rotation.order = 'YXZ';
    camera.position.set(0, EYE_H, layout.kind === 'rotunda' ? Math.max(8, layout.segments * 0.7) - 2.5 : 14 / 2 - 1.5);
  }, [camera, layout.kind, layout.segments]);

  useEffect(() => {
    const onKeyDown = (e) => { keys.current[e.code] = true; };
    const onKeyUp = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const dom = gl.domElement;
    const onClick = () => { if (active && !isTouch()) dom.requestPointerLock?.(); };
    const onLockChange = () => { locked.current = document.pointerLockElement === dom; };
    const onMouseMove = (e) => {
      if (!locked.current) return;
      const sens = 0.0024;
      euler.current.y -= e.movementX * sens;
      euler.current.x -= e.movementY * sens;
      euler.current.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.current.x));
      camera.rotation.copy(euler.current);
    };
    const onPointerDown = (e) => {
      if (!isTouch() || e.pointerType !== 'touch') return;
      if (touchLook.current.id !== null) return;
      touchLook.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    };
    const onPointerMove = (e) => {
      if (e.pointerId !== touchLook.current.id) return;
      const sens = 0.005;
      euler.current.y -= (e.clientX - touchLook.current.lastX) * sens;
      euler.current.x -= (e.clientY - touchLook.current.lastY) * sens;
      euler.current.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.current.x));
      camera.rotation.copy(euler.current);
      touchLook.current.lastX = e.clientX;
      touchLook.current.lastY = e.clientY;
    };
    const onPointerUp = (e) => { if (e.pointerId === touchLook.current.id) touchLook.current.id = null; };

    dom.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    return () => {
      dom.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
    };
  }, [camera, gl, active]);

  useFrame((state, dt) => {
    if (!active) return;
    let mx = 0, mz = 0;
    const k = keys.current;
    if (k['KeyW'] || k['ArrowUp'])    mz -= 1;
    if (k['KeyS'] || k['ArrowDown'])  mz += 1;
    if (k['KeyA'] || k['ArrowLeft'])  mx -= 1;
    if (k['KeyD'] || k['ArrowRight']) mx += 1;
    if (joy.current.active) { mx += joy.current.dx; mz += joy.current.dy; }

    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      const yaw = euler.current.y;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const wx = mx * cos + mz * sin;
      const wz = -mx * sin + mz * cos;
      const stepX = wx * speed * dt;
      const stepZ = wz * speed * dt;

      // Try X
      if (!collides(camera.position.x + stepX, camera.position.z, layout)) {
        camera.position.x += stepX;
      }
      if (!collides(camera.position.x, camera.position.z + stepZ, layout)) {
        camera.position.z += stepZ;
      }
    }
    // bob
    const bob = (len > 0) ? Math.sin(state.clock.elapsedTime * 12) * 0.02 : 0;
    camera.position.y = EYE_H + bob;
  });

  return null;
}

function isTouch() { return matchMedia('(pointer: coarse)').matches; }

function collides(x, z, layout) {
  if (layout.kind === 'rotunda') {
    const radius = Math.max(8, layout.segments * 0.7);
    if (Math.hypot(x, z) > radius - 0.4 - PLAYER_R) return true;
    if (Math.hypot(x, z) < 0.85 + PLAYER_R) return true; // center column
    return false;
  }
  // corridor: stay within walls
  const halfW = 12 / 2;
  const ROOM_D = 14;
  const totalLen = layout.segments * ROOM_D;
  if (x < -halfW + PLAYER_R || x > halfW - PLAYER_R) return true;
  const zMax = ROOM_D / 2 - PLAYER_R;
  const zMin = ROOM_D / 2 - totalLen + PLAYER_R;
  if (z > zMax || z < zMin) return true;
  return false;
}
