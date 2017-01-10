import * as THREE from 'three';

import Material from '../helpers/material';
import MeshHelper from '../helpers/meshHelper';
import Helpers from '../../utils/helpers';
import Config from '../../data/config';

// Loads in a single object from the config file
export default class Model {
  constructor(scene, loader) {
    this.scene = scene;

    // Manager is passed in to loader to determine when loading done in main
    this.loader = loader;
    this.obj = null;
  }

  load() {
    // Load model with ObjectLoader
    this.loader.load(Config.model.path, obj => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Create material for mesh and set its map to texture by name from preloaded textures
          // const material = new Material(0xffffff).standard;
          // child.material = material;

          // Set to cast and receive shadow if enabled
          if (Config.shadow.enabled) {
            child.receiveShadow = true;
            child.castShadow = true;
          }
        }
      });

      // Set prop to obj
      this.obj = obj;

      obj.name = 'dummyHead';

      obj.position.y = 1; // necessary for raycasting onto the zone shape
      obj.rotation.y += Math.PI;
      obj.scale.multiplyScalar(Config.model.scale);

      this.scene.add(obj);
    });
  }
}
