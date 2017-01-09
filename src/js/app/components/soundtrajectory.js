import * as THREE from 'three';

import Config from '../../data/config';
import Helpers from '../../utils/helpers';

export default class SoundTrajectory {
  constructor(points) {
    this.type = 'SoundTrajectory';
    this.splinePoints = points;
    this.isActive = true;
    this.pointObjects;
    this.spline;
    this.parentSoundObject;
    this.selectedPoint;
    this.mouseOffsetX = 0, this.mouseOffsetY = 0; this.nonScaledMouseOffsetY = 0;

    this.cursor = new THREE.Mesh(
      new THREE.SphereGeometry(10),
      new THREE.MeshBasicMaterial({ color:0x00ccff })
    );

    this.cursor.visible = false;

    this.renderPath();
  }

  renderPath() {
    const points = this.splinePoints;

    this.pointObjects = (function() {

      const sphere = new THREE.SphereGeometry(10);
      const sphereMat = new THREE.MeshBasicMaterial( { color:0x999999 } );

      const collider = new THREE.SphereGeometry(20);
      const colliderMat = new THREE.MeshBasicMaterial( {color:0x999999, transparent:true, opacity:0, depthWrite: false});
      const colliderMesh = new THREE.Mesh( collider, colliderMat );

      const pointObjects = [];

      points.forEach(function(point) {
        const sphereMesh = new THREE.Mesh( sphere, sphereMat.clone() );
        const group = new THREE.Object3D();

        group.add(sphereMesh, colliderMesh.clone());
        group.position.x = point.x;
        group.position.y = point.y;
        group.position.z = point.z;

        pointObjects.push(group);
      })

      return pointObjects;
    })();

    this.spline = new THREE.CatmullRomCurve3(this.splinePoints);
    this.spline.type = 'centripetal';

    const begEndDistance = this.splinePoints[0].distanceTo(this.splinePoints[this.splinePoints.length - 1]);

    if(begEndDistance < 40) this.spline.closed = true;
    else this.spline.closed = false;

    const geometry = new THREE.Geometry();

    geometry.vertices = this.spline.getPoints(200);

    const material = new THREE.LineBasicMaterial({
      color: 0x999999,
      linewidth:2,
      opacity:0.4
    });

    this.spline.mesh = new THREE.Line( geometry, material );
  }

  get objects() {
    return [].concat(this.pointObjects, this.spline.mesh);
  }

  removeFromScene(scene) {
    this.objects.forEach(function(obj) {
      scene.remove(obj, true);
    });

    scene.remove(this.cursor);
  }

  addToScene(scene) {
    this.objects.forEach(function(obj) {
      scene.add(obj);
    });

    scene.add(this.cursor);
  }

  isUnderMouse(raycaster) {
    if (this.isActive) {
      return raycaster.intersectObjects(this.objects).length > 0;
    }
  }

  objectUnderMouse(raycaster) {
    const intersects = raycaster.intersectObjects(this.objects, true);

    if (intersects.length > 0) {
      if (intersects[0].object.type === 'Line') {
        return intersects[Math.floor(intersects.length/2)];
      } else {
        return intersects[0];
      }
    }

    return null;
  }

  setMouseOffset(nonScaledMouse, point) {
    this.mouseOffsetX = point.x;
    this.mouseOffsetY = point.z;
    this.nonScaledMouseOffsetY = nonScaledMouse.y;
  }

  move(mouse, nonScaledMouse, perspectiveView) {
    if (this.selectedPoint) {
      const i = this.pointObjects.indexOf(this.selectedPoint);
      let pointer;

      if (i > -1) {
        if (perspectiveView) {
          const pointer = this.splinePoints[i];
          const posY = Helpers.mapRange(nonScaledMouse.y, -0.5, 0.5, -200, 200);
          pointer.y = posY;
        } else {
          pointer = mouse;
        }

        pointer.y = this.splinePoints[i].y;

        this.showCursor(false);
        this.splinePoints[i].copy(pointer);
        this.updateTrajectory();
        this.selectPoint(this.pointObjects[i]);
      }
    } else {
      // move entire shape
      if (perspectiveView){
        const posY = Helpers.mapRange(nonScaledMouse.y - this.nonScaledMouseOffsetY, -0.5, 0.5, -200, 200);

        this.objects.forEach(obj => {
          obj.position.y += posY;
        });
        this.splinePoints.forEach(pt => {
          pt.y += posY;
        });

        this.nonScaledMouseOffsetY = nonScaledMouse.y;
      } else {
        let dx = mouse.x - this.mouseOffsetX;
        let dy = mouse.z - this.mouseOffsetY;
        this.mouseOffsetX = mouse.x, this.mouseOffsetY = mouse.z;

        this.objects.forEach(obj => {
          obj.position.x += dx;
          obj.position.z += dy;
        });

        this.splinePoints.forEach(pt => {
          pt.x += dx;
          pt.z += dy;
        });
      }

      this.updateTrajectory();
    }
  }

  setCursor(point) {
    this.cursor.position.copy(point);
  }

  showCursor(bool) {
    if (bool === undefined) this.cursor.visible = true;
    this.cursor.visible = bool;
  }

  setActive() {
    this.isActive = true;

    this.pointObjects.forEach(function(obj) {
      obj.children[0].material.color.setHex( 0x999999 );
    });

    this.spline.mesh.material.color.setHex( 0x999999 );
  }

  setInactive() {
    this.deselectPoint();
    this.showCursor(false);
    this.isActive = false;
    this.pointObjects.forEach(function(obj) {
      obj.children[0].material.color.setHex( 0xcccccc );
    });
    this.spline.mesh.material.color.setHex( 0xcccccc );
  }

  select(intersect) {
    if (!intersect) return;

    const obj = intersect.object;

    if (obj.type === 'Line') {
      this.addPoint(intersect.point);
    } else if (obj.parent.type === 'Object3D') {
      this.selectPoint(obj.parent);
    } else {
      this.deselectPoint();
      this.setMouseOffset(main.nonScaledMouse, intersect.point);
    }
  }

  selectPoint(obj) {
    this.deselectPoint();
    this.selectedPoint = obj;
    obj.children[0].material.color.set(0xff0077);
  }

  deselectPoint() {
    if (this.selectedPoint) {
      this.selectedPoint.children[0].material.color.set(0xff0055);
      this.selectedPoint = null;
    }
  }

  addPoint(position) {
    let minDistance = Number.MAX_VALUE;
    let minPoint = 1;
    let prevDistToSplinePoint = -1;
    let closestSplinePoint = 0;

    for (let t = 0; t < 1; t += 1/200.0) {
      const pt = this.spline.getPoint(t);

      const distToSplinePoint = this.splinePoints[closestSplinePoint].distanceToSquared(pt);
      if (distToSplinePoint > prevDistToSplinePoint) {
        ++closestSplinePoint;

        if (closestSplinePoint >= this.splinePoints.length)
          closestSplinePoint = 0;
      }

      prevDistToSplinePoint = this.splinePoints[closestSplinePoint].distanceToSquared(pt);

      const distToPoint = pt.distanceToSquared(position);
      if (distToPoint < minDistance) {
        minDistance = distToPoint;
        minPoint = closestSplinePoint;
      }
    }

    this.splinePoints.splice(minPoint, 0, position);
    this.updateTrajectory();
    this.selectPoint(this.pointObjects[minPoint]);
  }

  removePoint() {
    const i = this.pointObjects.indexOf(this.selectedPoint);
    this.splinePoints.splice(i,1);
    this.deselectPoint();
    this.updateTrajectory();
  }

  updateTrajectory() {
    const scene = this.spline.mesh.parent;
    this.removeFromScene(scene);
    this.renderPath();
    this.addToScene(scene);
  }
}
