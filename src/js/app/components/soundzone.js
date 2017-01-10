import * as THREE from 'three';

export default class SoundZone {
  constructor(main, points) {
    this.type = 'SoundZone';
    this.isActive = true;
    this.mouse = main.mouse;
    this.scene = main.scene;

    this.splinePoints = points;
    this.pointObjects;
    this.spline;
    this.shape;
    this.sound;
    this.isPlaying = false;
    this.selectedPoint;
    this.mouseOffsetX = 0, this.mouseOffsetY = 0;
    this.buffer;
    this.audio = main.audio;

    this.cursor = new THREE.Mesh(
      new THREE.SphereGeometry(10),
      new THREE.MeshBasicMaterial({ color: 0x00ccff }),
    );


    this.cursor.visible = false;
    this.renderPath();
  }

  underUser() {
    if (this.sound && !this.isPlaying) {
      this.sound.source = this.audio.context.createBufferSource();
      this.sound.source.loop = true;
      this.sound.source.connect(this.sound.volume);
      this.sound.source.buffer = this.buffer;
      this.sound.source.start(this.audio.context.currentTime);
      this.sound.volume.gain.setTargetAtTime(0.3, this.audio.context.currentTime + 0.1, 0.1);
      this.isPlaying = true;
    }
  }

  notUnderUser() {
    if (this.sound && this.isPlaying) {
      this.sound.volume.gain.setTargetAtTime(0.0, this.audio.context.currentTime, 0.05);
      this.sound.source.stop(this.audio.context.currentTime + 0.2);
      this.isPlaying = false;
    }
  }

  loadSound(soundFileName) {
    const context = this.audio.context;
    const sound = {};

    sound.volume = context.createGain();
    sound.volume.connect(this.audio.destination);

    const request = new XMLHttpRequest();
    request.open('GET', soundFileName, true);
    request.responseType = 'arraybuffer';
    request.onload = () => {
      context.decodeAudioData(request.response, (buffer) => {
        this.buffer = buffer;
      }, () => {
        console.log('Decoding the audio buffer failed');
      });
    };

    request.send();
    sound.volume.gain.value = 0.0;
    this.sound = sound;
  }

  renderPath() {
    // splinePoints control the curve of the path
    const points = this.splinePoints;
    this.pointObjects = (() => {
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

      // place a meshgroup at each point in array
      const pointObjects = [];
      points.forEach((point) => {
        const sphereMesh = new THREE.Mesh(sphere, sphereMat.clone());
        const group = new THREE.Object3D();

        group.add(sphereMesh, colliderMesh.clone());
        group.position.copy(point);

        pointObjects.push(group);
      });
      return pointObjects;
    })();

    this.spline = new THREE.CatmullRomCurve3(this.splinePoints);
    this.spline.type = 'centripetal';
    this.spline.closed = true;

    const geometry = new THREE.Geometry();
    let material = new THREE.LineBasicMaterial({
      color: 0xff1169,
      linewidth: 1,
      transparent: true,
      opacity: 0.4,
    });

    geometry.vertices = this.spline.getPoints(200);
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
    material = new THREE.MeshBasicMaterial({
      color: 0xff1169,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });

    this.shape = new THREE.Mesh(shapeGeometry, material);
  }

  get objects() {
    return [].concat(this.pointObjects, this.spline.mesh, this.shape);
  }

  addToScene() {
    this.objects.forEach((obj) => {
      this.scene.add(obj);
    });

    this.scene.add(this.cursor);
  }

  removeFromScene() {
    this.objects.forEach((obj) => {
      this.scene.remove(obj, true);
    });
    this.scene.remove(this.cursor);
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
      if (intersects[0].object.type === 'Line') {
        return intersects[Math.floor(intersects.length / 2)];
      }

      return intersects[0];
    }

    return null;
  }

  setMouseOffset(point) {
    this.mouseOffsetX = point.x;
    this.mouseOffsetY = point.z;
  }

  updateZone() {
    const scene = this.spline.mesh.parent;
    this.removeFromScene(scene);
    this.renderPath();
    this.addToScene(scene);
  }

  move(main) {
    if (!main.perspectiveView) {
      if (this.selectedPoint) {
        // move selected point
        const i = this.pointObjects.indexOf(this.selectedPoint);
        if (i > -1) {
          this.showCursor(false);
          this.splinePoints[i].copy(main.mouse);
          this.updateZone();
          this.selectPoint(this.pointObjects[i]);
        }
      } else {
        // move entire shape
        const dx = main.mouse.x - this.mouseOffsetX;
        const dy = main.mouse.z - this.mouseOffsetY;
        this.mouseOffsetX = main.mouse.x;
        this.mouseOffsetY = main.mouse.z;

        this.objects.forEach((obj) => {
          obj.position.x += dx;
          obj.position.z += dy;
        });

        this.splinePoints.forEach((pt) => {
          pt.x += dx;
          pt.z += dy;
        });
      }
    }
  }

  setCursor(point) {
    this.cursor.position.copy(point);
  }

  showCursor(bool) {
    if (bool === undefined) this.cursor.visible = true;
    this.cursor.visible = bool;
  }

  setActive(main) {
    this.setMouseOffset(main.mouse);
    this.isActive = true;
    this.pointObjects.forEach(obj => (obj.visible = true));
    this.spline.mesh.visible = true;
  }

  setInactive() {
    this.deselectPoint();
    this.showCursor(false);
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
    this.updateZone();
  }

  addPoint(position) {
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
    this.updateZone();
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
}
