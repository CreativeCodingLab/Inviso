import * as THREE from 'three';

import Config from '../../data/config';

// Main webGL renderer class
export default class Renderer {
  constructor(scene, container) {
    // Properties
    this.scene = scene;
    this.container = container;

    // Create WebGL renderer and set its antialias
    this.threeRenderer = new THREE.WebGLRenderer({antialias: true});

    // Set clear color to fog to enable fog or to hex color for no fog
    this.threeRenderer.setClearColor(0xf0f0f0);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio); // For retina

    this.threeRenderer.autoClear = false;

    // Appends canvas
    container.appendChild(this.threeRenderer.domElement);

    // Shadow map options
    this.threeRenderer.shadowMap.enabled = true;
    // this.threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Get anisotropy for textures
    Config.maxAnisotropy = this.threeRenderer.getMaxAnisotropy();

    // Initial size update set to canvas container
    this.updateSize();

    // Listeners
    document.addEventListener('DOMContentLoaded', () => this.updateSize(), false);
    window.addEventListener('resize', () => this.updateSize(), false);
  }

  updateSize() {
    this.threeRenderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
  }

  render(scene, camera) {
    // Renders scene to canvas target
    this.threeRenderer.clear();
    this.threeRenderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
    this.threeRenderer.render(scene, camera);
  }
}
