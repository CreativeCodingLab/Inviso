import * as THREE from 'three';

import Helpers from '../../utils/helpers';

export default class SoundTrajectory {
  constructor(main, points) {
    this.type = 'SoundTrajectory';
    this.splinePoints = points;
    this.isActive = true;
    this.pointObjects;
    this.spline;
    this.parentSoundObject;
    this.selectedPoint;
    this.mouseOffsetX = 0;
    this.mouseOffsetY = 0;
    this.nonScaledMouseOffsetY = 0;

    this.cursor = new THREE.Mesh(
      new THREE.SphereGeometry(15),
      new THREE.MeshBasicMaterial({ 
        color: 0xff1169,
        transparent: true,
        opacity: 0.5,
      })
    );
    this.cursor.visible = false;
    main.scene.add(this.cursor);

    /**
     * First call to renderPath happens in update trajectory function. From there
     * on the function recursively calls itself at the end of each draw.
     */
    this.renderPath();
  }

  /**
   * A recursive function that draws all the THREE geometries, including
   *
   * visual and collider spheres as control points on the trajectory spline
   * (grouped as points in the pointsObjects array),
   *
   * the CatmullRom spline that is created from splinePoints, which is populated
   * under addPoint function below, and repopulated whenever a trajectory is
   * moved or a control point is removed from the spline,
   *
   * and the line geometry which is assigned as a mesh for the said spline for it
   * to be drawn on screen.
   */
  renderPath() {
    const points = this.splinePoints;

    this.pointObjects = (() => {
      const sphere = new THREE.SphereGeometry(10);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0x999999 });

      const collider = new THREE.SphereGeometry(20);
      const colliderMat = new THREE.MeshBasicMaterial({
        color: 0x999999,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const colliderMesh = new THREE.Mesh(collider, colliderMat);

      const pointObjects = [];

      points.forEach((point) => {
        const sphereMesh = new THREE.Mesh(sphere, sphereMat.clone());
        const group = new THREE.Object3D();

        group.add(sphereMesh, colliderMesh.clone());
        group.position.x = point.x;
        group.position.y = point.y;
        group.position.z = point.z;

        pointObjects.push(group);
      });

      return pointObjects;
    })();

    this.spline = new THREE.CatmullRomCurve3(this.splinePoints);
    this.spline.type = 'centripetal';

    /*
     * This measures the distance between the start and end points of a trajectory
     * and if the distance is small enough it turnes the spline into a closed curve.
     * This is checked in each frame so that the user can interactively determine
     * if a trajectory is closed (looping) or open (back-and-forth).
     */
    const begEndDistance = this.splinePoints[0].distanceTo(this.splinePoints[this.splinePoints.length - 1]);

    if (begEndDistance < 40) {
      this.spline.closed = true;
    } else {
      this.spline.closed = false;
    }

    const geometry = new THREE.Geometry();

    geometry.vertices = this.spline.getPoints(200);

    const material = new THREE.LineBasicMaterial({
      color: 0x999999,
      linewidth: 2,
      opacity: 0.4,
    });

    this.spline.mesh = new THREE.Line(geometry, material);
  }

  /**
   * Creates a global object array that includes both the pointObjects (i.e. vectors
   * for both visible and collider spheres) and the spline mesh which is used to
   * draw the line that makes up the spline.
   */
  get objects() {
    return [].concat(this.pointObjects, this.spline.mesh);
  }

  /**
   * Removes each object in the object array (that pertain to a single
   * trajectory) from the scene.
   */
  removeFromScene(scene) {
    this.objects.forEach((obj) => {
      scene.remove(obj, true);
    });

  }

  /**
   * Adds each object in the object array (that pertain to a single
   * trajectory) to the scene.
   */
  addToScene(scene) {
    this.objects.forEach((obj) => {
      scene.add(obj);
    });

  }

  /**
   * Returns true if a particular object is under the mouse (called from
   * index.html)
   */
  isUnderMouse(raycaster) {
    if (this.isActive) {
      return raycaster.intersectObjects(this.objects).length > 0;
    }
  }

  /**
   * Determines if it is a control point or the curve itself that's under the
   * mouse. Returns the collided object.
   */
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

  hideCursor() {
    this.cursor.visible = false;
  }
  showCursor(object, point) {
    this.cursor.visible = true;
    if (object === this.spline.mesh) {
      this.cursor.position.copy(point);
    }
    else {
      this.cursor.position.copy(object.parent.position);
    }
  }

  /* Keeps record of the mouse offset after the initial click. */
  setMouseOffset(nonScaledMouse, point) {
    this.mouseOffsetX = point.x;
    this.mouseOffsetY = point.z;
    this.nonScaledMouseOffsetY = nonScaledMouse.y;
  }

  /* Moves a single control point on the spline or the entire trajectory. */
  move(mouse, nonScaledMouse, perspectiveView) {
    this.hideCursor();
    if (this.selectedPoint) {
      const i = this.pointObjects.indexOf(this.selectedPoint);
      let pointer;

      if (i > -1) {
        /**
         * If the camera is in perspective view, the control points can only be
         * moved in the Y-axis (height).
         */
        if (perspectiveView) {
          pointer = this.splinePoints[i];
          const posY = Helpers.mapRange(nonScaledMouse.y, -0.5, 0.5, -200, 200);
          pointer.y = posY;
        } else {
          pointer = mouse;
        }

        pointer.y = this.splinePoints[i].y;

        /* Otherwise the mouse position vector is copied to the control point. */
        this.splinePoints[i].copy(pointer);
        this.updateTrajectory();
        this.selectPoint(this.pointObjects[i]);
      }
    } else {
      /**
       * This moves the entire shape when the parent sound object is moved around.
       * The same XZ versus Y dimension principles apply depending which view mode
       * the camera is in.
       */
      if (perspectiveView) {
        const posY = Helpers.mapRange(
          nonScaledMouse.y - this.nonScaledMouseOffsetY,
          -0.5,
          0.5,
          -200,
          200,
        );

        this.objects.forEach((obj) => {
          obj.position.y += posY;
        });

        this.splinePoints.forEach((pt) => {
          pt.y += posY;
        });

        this.nonScaledMouseOffsetY = nonScaledMouse.y;
      } else {
        /**
         * Mouse movement differentials based on initial click position stored
         * in setMouseOffset() is calculated here.
         */
        const dx = mouse.x - this.mouseOffsetX;
        const dy = mouse.z - this.mouseOffsetY;
        this.mouseOffsetX = mouse.x;
        this.mouseOffsetY = mouse.z;

        /**
         * Maps mouse position differentials to the splinePoints, which are in
         * return used in the render path function to update the trajectories in
         * each frame.
         */
        this.splinePoints.forEach((pt) => {
          pt.x += dx;
          pt.z += dy;
        });
      }

      this.updateTrajectory();
    }
  }

  setActive() {
    this.isActive = true;

    this.pointObjects.forEach((obj) => {
      obj.children[0].material.color.setHex(0x999999);
    });

    this.spline.mesh.material.color.setHex(0x999999);
  }

  setInactive() {
    this.hideCursor();
    this.deselectPoint();
    this.isActive = false;

    this.pointObjects.forEach((obj) => {
      obj.children[0].material.color.setHex(0xcccccc);
    });

    this.spline.mesh.material.color.setHex(0xcccccc);
  }

  select(intersect) {
    if (!intersect) return;

    const obj = intersect.object;

    if (obj.type === 'Line') {
      this.addPoint(intersect.point);
    } else if (obj.parent.type === 'Object3D') {
      this.selectPoint(obj.parent);
    } else {
      // TODO: main?
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

  /**
   * Adds new points to an existing trajectory. Updates the splinePoints array
   * and calls the updateTrajectory function as a result.
   */
  addPoint(position) {
    let minDistance = Number.MAX_VALUE;
    let minPoint = 1;
    let prevDistToSplinePoint = -1;
    let closestSplinePoint = 0;

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
    this.updateTrajectory();
    this.selectPoint(this.pointObjects[minPoint]);
  }

  /* Removes points from the splinePoints array. */
  removePoint() {
    const i = this.pointObjects.indexOf(this.selectedPoint);
    this.splinePoints.splice(i, 1);
    this.deselectPoint();
    this.updateTrajectory();
  }

  /**
   * Updates trajectory by calling renderPath. First called inside addPoint()
   * and this initates the renderPath() recursion.
   */
  updateTrajectory() {
    const scene = this.spline.mesh.parent;
    this.removeFromScene(scene);
    this.renderPath();
    this.addToScene(scene);
  }
}
