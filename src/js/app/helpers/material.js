import * as THREE from 'three';

import Config from '../../data/config';

// Use this class as a helper to set up some default materials
export default class Material {
  constructor(color) {
    this.basic = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
    });

    this.standard = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      visible: false,
    });

    this.wire = new THREE.MeshBasicMaterial({ wireframe: false });
  }
}

