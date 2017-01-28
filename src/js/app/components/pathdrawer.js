import * as THREE from 'three';
import SoundObject from './soundobject';
import SoundTrajectory from './soundtrajectory';
import SoundZone from './soundzone';

export default class PathDrawer {
  constructor(scene) {
      this.parentObject = null;
      this.scene = scene;
      this.points = [];
      this.lines = [];
      this.lastPoint = new THREE.Vector3();
      this.isDrawing = false,

      this.material = {
        trajectory: new THREE.LineBasicMaterial({
                linewidth: 2,
                color: 0x999999
              }),
        zone: new THREE.LineBasicMaterial({
                color: 0xff1169
              })
      };
  }

  beginAt(point, trajectoryContainerObject) {
    this.isDrawing = true;
    this.parentObject = trajectoryContainerObject || null;
    this.lastPoint = point;
    this.points = [point];
  }

  addPoint(point) {
    if (this.isDrawing) { // redundant check? just to be safe for now
      const material = this.parentObject
                      ? this.material.trajectory
                      : this.material.zone;
      const geometry = new THREE.Geometry();
      geometry.vertices.push( this.lastPoint, point );

      const line = new THREE.Line( geometry, material );

      this.lastPoint = point;
      this.points.push(point);
      this.lines.push(line);
      this.scene.add(line);        
    }
  }

  createObject(main) {
    if (this.isDrawing) {
      this.isDrawing = false;
      const points = simplify(this.points, 10, true);
      let object;
      if (this.parentObject) {
        if (points.length >= 3) {
          object = new SoundTrajectory(main, points);
          this.parentObject.trajectory = object;
          object.parentSoundObject = this.parentObject;
          main.soundTrajectories.push(object);
        }
      }
      else {
        if (points.length >= 3) {
          object = new SoundZone(main, points);
          main.soundZones.push(object);
        } else {
          object = new SoundObject(main); 
          main.soundObjects.push(object);
        }          
      }

      this.clear();

      if (object) {
        object.addToScene(this.scene);
      }
      return object;
    }
    else {
      console.log('called createObject when not drawing')
    }
  }

  clear() {
    this.parentObject = null;
    this.lines.forEach((line) => {
      this.scene.remove(line);
    });
    this.lines = [];
    this.points = [];
  }
}