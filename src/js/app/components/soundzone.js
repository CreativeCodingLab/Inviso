import * as THREE from 'three';
import 'whatwg-fetch';
import Helpers from '../../utils/helpers';

export default class SoundZone {
  constructor(main, points) {
    this.type = 'SoundZone';
    this.isActive = true;
    this.audio = main.audio;

    this.mouse = main.mouse;
    this.scene = main.scene;

    this.points = points;
    this.splinePoints = points;
    this.pointObjects;
    this.spline;
    this.shape;
    this.sound;
    this.loaded = false;
    this.isPlaying = false;
    this.selectedPoint;
    this.mouseOffsetX = 0, this.mouseOffsetY = 0;
    this.volume = 1;

    this.containerObject = new THREE.Group();
    this.cursor = new THREE.Mesh(
      new THREE.SphereGeometry(15),
      new THREE.MeshBasicMaterial({
        color: 0xff1169,
        transparent: true,
        opacity: 0.5,
      })
    );
    this.cursor.visible = false;
    this.containerObject.add(this.cursor);

    this.isInitialized = false;

    this.renderPath();
  }

  underUser(audio) {
    if (this.sound && !this.isPlaying && this.loaded) {

      this.sound.source = audio.context.createBufferSource();
      this.sound.source.buffer = this.sound.buffer;
      this.sound.source.loop = true;
      this.sound.source.volume = audio.context.createGain();
      this.sound.source.volume.gain.value = this.volume;
      this.sound.source.connect(this.sound.source.volume);
      this.sound.source.volume.connect(this.sound.volume);

      this.sound.source.start(audio.context.currentTime);

      this.sound.volume.gain.setTargetAtTime(1.0, audio.context.currentTime + 0.1, 0.1);
      this.isPlaying = true;
    }
  }

  notUnderUser(audio) {
    if (this.sound && this.isPlaying && this.loaded) {
      this.sound.volume.gain.setTargetAtTime(0.0, audio.context.currentTime, 0.02);
      this.sound.source.stop(audio.context.currentTime + 0.1);
      this.isPlaying = false;
    }
  }

  // remove sound file
  clear() {
    // stop audio stream if currently playing
    if (this.isPlaying) {
      this.sound.source.stop();
    }
    this.isPlaying = false;
    this.loaded = false;
    this.mainMixer = null;
    this.sound = {};
  }

  loadSound(soundFileName, audio, mute) {
    const context = audio.context;
    this.filename = soundFileName;

    let promise = fetch(soundFileName)
      .then(response => response.arrayBuffer())
      .then(buffer => context.decodeAudioData(buffer, (decodedData) => {
        this.clear();
        this.sound.name = soundFileName;
        this.sound.source = context.createBufferSource();
        this.mainMixer = context.createGain();
        this.sound.volume = context.createGain();
        this.sound.source.volume = context.createGain();
        this.sound.source.connect(this.sound.source.volume);
        this.sound.source.volume.connect(this.sound.volume);
        this.sound.volume.connect(this.mainMixer);
        this.mainMixer.connect(audio.destination);
        this.mainMixer.gain.value = mute ? 0 : 1;
        this.sound.volume.gain.value = 0.0;
        this.sound.buffer = decodedData;
        this.loaded = true;
      }));

    promise
      .catch(err => {
        alert('could not load file');
        console.log(err);
      });

    return promise;
  }

  renderPath(args) {
    // splinePoints control the curve of the path
    const points = this.splinePoints;

    // setup
    const sphere = new THREE.SphereGeometry(10);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff1169 });

    const collider = new THREE.SphereGeometry(15);
    const colliderMat = new THREE.MeshBasicMaterial({
      color: 0xff1169,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const colliderMesh = new THREE.Mesh(collider, colliderMat);

    if (!this.isInitialized) {
      this.pointObjects = [];
      // place a meshgroup at each point in array
      points.forEach((point) => {
        const sphereMesh = new THREE.Mesh(sphere, sphereMat.clone());
        const group = new THREE.Object3D();

        group.add(sphereMesh, colliderMesh.clone());
        group.position.copy(point);

        this.pointObjects.push(group);
      });
      this.splinePoints = this.pointObjects.map( pt => pt.position );
    }
    else if (args) {
      if (args.updateType === "delete") {
        let splicedPoint = this.pointObjects.splice(args.index, 1);
        this.containerObject.remove(splicedPoint[0], true);
      }
      else if (args.updateType === "add") {
        let insertedPoint = new THREE.Object3D();
        insertedPoint.add(
          new THREE.Mesh(sphere, sphereMat.clone()),
          colliderMesh.clone()
        );
        insertedPoint.position.copy(this.splinePoints[args.index]);
        this.pointObjects.splice(args.index, 0, insertedPoint);
        this.containerObject.add(insertedPoint);
      }
      this.splinePoints = this.pointObjects.map( pt => pt.position );
    }

    this.spline = new THREE.CatmullRomCurve3(this.splinePoints);
    this.spline.type = 'centripetal';
    this.spline.closed = true;

    const geometry = new THREE.Geometry();
    geometry.vertices = this.spline.getPoints(200);
    let material = new THREE.LineBasicMaterial({
      color: 0xff1169,
      linewidth: 1,
      transparent: true,
      opacity: 0.4,
    });

    this.spline.mesh = new THREE.Line(geometry, material);

    // fill the path
    const rotatedPoints = this.spline.getPoints(200);
    rotatedPoints.forEach((vertex) => {
      vertex.y = vertex.z;
      vertex.z = 0.0;
    });
    const shapeFill = new THREE.Shape();
    shapeFill.fromPoints(rotatedPoints);
    const shapeGeometry = new THREE.ShapeGeometry(shapeFill);
    shapeGeometry.rotateX(Math.PI / 2);
    material = new THREE.MeshLambertMaterial({
      color: 0xff1169,
      transparent: true,
      opacity: Helpers.mapRange(this.volume, 0, 2, 0.05, 0.35),
      side: THREE.BackSide,
      premultipliedAlpha: true
    });

    this.shape = new THREE.Mesh(shapeGeometry, material);
  }

  get objects() {
    return [].concat(this.pointObjects, this.spline.mesh, this.shape);
  }

  addToScene() {
    if (!this.isInitialized) {
      this.isInitialized = true;

      var box = new THREE.Box3().setFromObject( this.shape );
      box.getCenter( this.containerObject.position );
      this.scene.add(this.containerObject);
      this.objects.forEach((obj) => {
        obj.translateX(-this.containerObject.position.x);
        obj.translateZ(-this.containerObject.position.z);
        this.containerObject.add(obj);
      });
    }
    else {
      this.containerObject.add(this.shape);
      this.containerObject.add(this.spline.mesh);
    }
  }

  removeFromScene(scene) {
    this.scene.remove(this.containerObject, true);
  }

  // raycast to this soundzone
  isUnderMouse(raycaster) {
    if (this.isActive) {
      return raycaster.intersectObjects(this.objects).length > 0;
    }

    return raycaster.intersectObject(this.shape).length > 0;
  }

  objectUnderMouse(raycaster) {
    const intersects = raycaster.intersectObjects(this.objects, true);

    if (intersects.length > 0) {
      if (intersects[0].object.type === 'Line' || intersects[0].object === this.shape) {
        return intersects[Math.floor(intersects.length / 2)];
      }

      return intersects[0];
    }

    return null;
  }

  hideCursor() {
    this.cursor.visible = false;
  }
  showCursor(object, point) {
    if (object !== this.shape) {
      this.cursor.visible = true;
      if (object === this.spline.mesh) {
        const minv = new THREE.Matrix4().getInverse(this.containerObject.matrix);
        this.cursor.position.copy(point.applyMatrix4(minv));
      }
      else {
        this.cursor.position.copy(object.parent.position);
      }
    }
    else {
      this.hideCursor();
    }
  }

  setMouseOffset(point) {
    this.mouseOffsetX = point.x;
    this.mouseOffsetY = point.z;
  }

  updateZone(args) {
    const scene = this.spline.mesh.parent;
    this.containerObject.remove(this.spline.mesh, true);
    this.containerObject.remove(this.shape, true);
    this.renderPath(args);
    this.addToScene(scene);
  }

  move(main) {
    // if (!main.perspectiveView) {
      const dx = main.mouse.x - this.mouseOffsetX;
      const dy = main.mouse.z - this.mouseOffsetY;
      this.mouseOffsetX = main.mouse.x;
      this.mouseOffsetY = main.mouse.z;
      this.hideCursor();

      if (this.selectedPoint) {
        // move selected point
        const minv = new THREE.Matrix4().getInverse(this.containerObject.matrix);
        this.selectedPoint.position.copy(main.mouse.applyMatrix4(minv));
        this.updateZone();
      } else {
        // move entire shape

        this.containerObject.position.x += dx;
        this.containerObject.position.z += dy;
      }
    // }
  }

  setActive(main) {
    this.setMouseOffset(main.mouse);
    this.isActive = true;
    this.pointObjects.forEach(obj => (obj.visible = true));
    this.spline.mesh.visible = true;
  }

  setInactive() {
    this.hideCursor();
    this.deselectPoint();
    this.isActive = false;
    this.pointObjects.forEach(obj => (obj.visible = false));
    this.spline.mesh.visible = false;
  }

  select(intersect) {
    if (!intersect) return;

    // obj can be the curve, a spline point, or the shape mesh
    const obj = intersect.object;

    if (obj.type === 'Line') {
      // add a point to the line
      this.addPoint(intersect.point);
    } else if (obj.parent.type === 'Object3D') {
      // select an existing point on line
      this.selectPoint(obj.parent);
    } else {
      this.deselectPoint();
      this.setMouseOffset(intersect.point);
    }
  }

  removePoint() {
    // find point in array
    const i = this.pointObjects.indexOf(this.selectedPoint);
    this.splinePoints.splice(i, 1);
    this.deselectPoint();
    this.updateZone({index: i, updateType: "delete"});
  }

  addPoint(point) {
    const minv = new THREE.Matrix4().getInverse(this.containerObject.matrix);
    const position = point.applyMatrix4(minv);

    let closestSplinePoint = 0;
    let prevDistToSplinePoint = -1;
    let minDistance = Number.MAX_VALUE;
    let minPoint = 1;

    // search for point on spline
    for (let t = 0; t < 1; t += 1 / 200.0) {
      const pt = this.spline.getPoint(t);

      const distToSplinePoint = this.splinePoints[closestSplinePoint].distanceToSquared(pt);
      if (distToSplinePoint > prevDistToSplinePoint) {
        closestSplinePoint += 1;

        if (closestSplinePoint >= this.splinePoints.length) {
          closestSplinePoint = 0;
        }
      }
      prevDistToSplinePoint = this.splinePoints[closestSplinePoint].distanceToSquared(pt);
      const distToPoint = pt.distanceToSquared(position);
      if (distToPoint < minDistance) {
        minDistance = distToPoint;
        minPoint = closestSplinePoint;
      }
    }

    this.splinePoints.splice(minPoint, 0, position);
    this.updateZone({index: minPoint, updateType: "add"});
    this.selectPoint(this.pointObjects[minPoint]);
  }

  selectPoint(obj) {
    this.deselectPoint();
    this.selectedPoint = obj;
    obj.children[0].material.color.set('blue');
  }

  deselectPoint() {
    if (this.selectedPoint) {
      this.selectedPoint.children[0].material.color.set('red');
      this.selectedPoint = null;
    }
  }

  mute(main) {
    this.isMuted = true;
    this.checkMuteState(main);
  }
  unmute(main) {
    this.isMuted = false;
    this.checkMuteState(main);
  }

  turnVisible() {

  }

  turnInvisible() {
    this.shape.material.visible = false;
    this.pointObjects.forEach((point) => {
      point.children[0].visible = false;
    });
    this.spline.mesh.material.visible = false;
  }

  checkMuteState(main) {
    if (this.mainMixer) {
      if (main.isMuted || this.isMuted) {
        this.mainMixer.gain.value = 0;
      }
      else {
        this.mainMixer.gain.value = 1;
      }
    }
  }

  toJSON() {
    return JSON.stringify({
      position: this.containerObject.position,
      points: this.splinePoints,
      filename: this.filename
    });
  }

  fromJSON(json) {
    let object = JSON.parse(json);
    this.containerObject.position.copy(object.position);

    this.loadSound(object.filename, this.audio, false);
  }
}
