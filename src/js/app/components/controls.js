import * as THREE from 'three';

import OrbitControls from '../../utils/orbitControls';
import Config from '../../data/config';

// Controls based on orbit controls
export default class Controls {
  constructor(camera, container) {
    // Orbit controls first needs to pass in THREE to constructor
    const orbitControls = new OrbitControls(THREE);
    this.threeControls = new orbitControls(camera, container);

    // Controls are only in enabled via 'c' keypress
    this.threeControls.enabled = true;
    this.disableRotate();

    this.init();
  }

  disablePan() {
    this.threeControls.enablePan = false;
  }
  enablePan() {
    this.threeControls.enablePan = true;
  }

  disableRotate() {
    this.threeControls.mouseButtons = {
        PAN: THREE.MOUSE.LEFT,
        ZOOM: THREE.MOUSE.MIDDLE
    }
  }
  enableRotate() {
    this.threeControls.mouseButtons = {
        ORBIT: THREE.MOUSE.LEFT
    }
  }

  init() {
    this.threeControls.target.set(Config.controls.target.x, Config.controls.target.y, Config.controls.target.z);
    this.threeControls.autoRotate = Config.controls.autoRotate;
    this.threeControls.autoRotateSpeed = Config.controls.autoRotateSpeed;
    this.threeControls.rotateSpeed = Config.controls.rotateSpeed;
    this.threeControls.zoomSpeed = Config.controls.zoomSpeed;
    this.threeControls.minDistance = Config.controls.minDistance;
    this.threeControls.maxDistance = Config.controls.maxDistance;
    this.threeControls.minPolarAngle = Config.controls.minPolarAngle;
    this.threeControls.maxPolarAngle = Config.controls.maxPolarAngle;
    this.threeControls.enableDamping = Config.controls.enableDamping;
    this.threeControls.enableZoom = Config.controls.enableZoom;
    this.threeControls.dampingFactor = Config.controls.dampingFactor;
  }
}
