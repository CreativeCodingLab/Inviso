import * as THREE from 'three';
import 'whatwg-fetch';

import Config from '../../data/config';
import Helpers from '../../utils/helpers';

export default class SoundObject {
  constructor(main) {
    this.type = 'SoundObject';
    this.posX = 0;
    this.posY = 0;
    this.posZ = 0;
    this.radius = Config.soundObject.defaultRadius;
    this.cones = [];

    this.trajectory = null;
    this.trajectoryClock = Config.soundObject.defaultTrajectoryClock;
    this.movementSpeed = Config.soundObject.defaultMovementSpeed;
    this.movementDirection = Config.soundObject.defaultMovementDirection;
    this.movementIncrement = null;

    this.containerObject = new THREE.Object3D();

    const sphereGeometry = new THREE.SphereBufferGeometry(this.radius, 100, 100);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      opacity: 0.8,
      transparent: true,
    });
    this.omniSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.omniSphere.name = 'omniSphere';

    const raycastSphereGeometry = new THREE.SphereBufferGeometry(150, 100, 100);
    const raycastSphereMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, visible: false });
    this.raycastSphere = new THREE.Mesh(raycastSphereGeometry, raycastSphereMaterial);
    this.raycastSphere.name = 'sphere';
    this.raycastSphere.position.copy(main.mouse);
    main.scene.add(this.raycastSphere);

    this.axisHelper = new THREE.AxisHelper(100);
    this.axisHelper.position.copy(main.mouse);
    main.scene.add(this.axisHelper);

    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0x888888,
      dashSize: 30,
      gapSize: 30,
    });
    const lineGeometry = new THREE.Geometry();

    lineGeometry.vertices.push(
      new THREE.Vector3(0, 0, -300),
      new THREE.Vector3(0, 0, 300),
    );

    lineGeometry.computeLineDistances();
    this.altitudeHelper = new THREE.Line(lineGeometry, lineMaterial);
    this.altitudeHelper.rotation.x = Math.PI / 2;
    main.scene.add(this.altitudeHelper);
    this.altitudeHelper.position.copy(main.mouse);

    this.containerObject.add(this.omniSphere);
    this.containerObject.position.copy(main.mouse);
    main.scene.add(this.containerObject);
  }

  createCone(sound) {
    sound.volume.gain.value = 1;
    sound.spread = 0.5;

    const coneWidth = sound.spread * 90;
    const coneHeight = sound.volume.gain.value * 50 + 50;

    const coneGeo = new THREE.CylinderGeometry(coneWidth, 0, coneHeight, 100, 1, true);
    const coneColor = new THREE.Color(0.5, Math.random(), 0.9);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: coneColor,
      opacity: 0.8,
      transparent:true
    });

    coneGeo.translate(0, coneHeight / 2, 0);
    coneGeo.rotateX(Math.PI / 2);
    coneMaterial.side = THREE.DoubleSide;

    const cone = new THREE.Mesh(coneGeo, coneMaterial);

    cone.sound = sound;
    cone.sound.panner.coneInnerAngle = Math.atan(coneWidth / coneHeight) * (180 / Math.PI);
    cone.sound.panner.coneOuterAngle = cone.sound.panner.coneInnerAngle * 1.5;
    cone.sound.panner.coneOuterGain = 0.05;
    // cone.sound.volume.gain.value = Helpers.mapRange(coneHeight, 100, 150, 0.5, 2);

    cone.name = 'cone';
    cone.baseColor = coneColor;
    cone.hoverColor = function() {
      let c = this.baseColor.clone();
      c.offsetHSL(0,-0.05,0.1);
      return c;
    }

    cone.long = cone.lat = 0;

    this.cones.push(cone);
    this.containerObject.add(cone);
    this.setAudioPosition(cone);
    return cone;
  }

  setAudioPosition(object) {

    const q = new THREE.Vector3();
    object.updateMatrixWorld();
    q.setFromMatrixPosition(object.matrixWorld);
    object.sound.panner.setPosition(q.x, q.y, q.z);

    if (object.name == 'cone') {
      const p = new THREE.Vector3();
      const q = new THREE.Vector3();
      const m = object.matrixWorld;

      const mx = m.elements[12];
      const my = m.elements[13];
      const mz = m.elements[14];

      const vec = new THREE.Vector3(0, 0, 1);

      m.elements[12] = m.elements[13] = m.elements[14] = 0;

      vec.applyProjection(m);
      vec.normalize();
      object.sound.panner.setOrientation(vec.x, vec.y, vec.z);

      m.elements[12] = mx;
      m.elements[13] = my;
      m.elements[14] = mz;
    }
  }

  loadSound(soundFileName, audio, object) {
    const context = audio.context;

    let promise = new Promise(function(resolve, reject) {

      fetch(soundFileName)
        .then(response => response.arrayBuffer())
        .then(buffer => context.decodeAudioData(buffer, (decodedData) => {
          if (object && object.sound && object.sound.source) {
            object.sound.source.stop();
          }

          if (object && object.type === "SoundObject") {
            /* attach omnidirectional sound */
            console.log('attaching omni sound');
          }

          const sound = {};
          sound.source = context.createBufferSource();
          sound.source.loop = true;
          sound.panner = context.createPanner();
          sound.panner.panningModel = 'HRTF';
          sound.panner.distanceModel = 'inverse';
          sound.panner.refDistance = 100;
          sound.volume = context.createGain();
          sound.source.connect(sound.volume);
          sound.volume.connect(sound.panner);
          sound.panner.connect(audio.destination);
          sound.source.buffer = decodedData;
          sound.source.start(context.currentTime + 0.020);
          resolve( sound );
        }));
    });

    promise
      .catch(err => {
        alert('could not load file');
        console.log(err);
      });

    return promise;
  }

  isUnderMouse(ray) {
    return ray.intersectObject(this.containerObject, true).length > 0;
  }

  select(main) {
    this.nonScaledMouseOffsetY = main.nonScaledMouse.y;
  }

  move(main) {
    let pointer;

    if (main.perspectiveView) {
      const posY = Helpers.mapRange(
        main.nonScaledMouse.y - this.nonScaledMouseOffsetY,
        -0.5,
        0.5,
        -200,
        200,
      );

      pointer = this.containerObject.position;
      if (pointer.y > -200 || pointer.y < 200) pointer.y += posY;

      // clamp
      pointer.y = Math.max(Math.min(pointer.y, 300), -300);

      this.nonScaledMouseOffsetY = main.nonScaledMouse.y;
    } else {
      pointer = main.mouse;
      pointer.y = this.containerObject.position.y;
    }

    this.containerObject.position.copy(pointer);
    this.axisHelper.position.copy(pointer);
    this.altitudeHelper.position.copy(pointer);
    this.altitudeHelper.position.y = 0;
    this.raycastSphere.position.copy(pointer);

    if (this.trajectory) this.trajectory.move(pointer, main.nonScaledMouse, main.perspectiveView);

    if (this.cones[0]) {
      for (const i in this.cones) {
        this.setAudioPosition(this.cones[i]);
      }
    }

    if (this.omniSphere.sound){
      this.setAudioPosition(this.omniSphere);
    }
  }

  addToScene(scene) {
    scene.add(this.containerObject);
  }

  setActive(main) {
    if (this.trajectory) {
      this.trajectory.setActive();
      this.trajectory.setMouseOffset(main.nonScaledMouse, main.mouse);
    }
  }

  setInactive() {
    if (this.trajectory) {
      this.trajectory.setInactive();
    }
  }

  changeRadius() {
    if (this.omniSphere.sound && this.omniSphere.sound.volume) {
      const r = 0.5 + 0.5*this.omniSphere.sound.volume.gain.value;
      this.omniSphere.scale.x = this.omniSphere.scale.y = this.omniSphere.scale.z = r;
    }
  }

  changeLength(cone) {
    const r = cone.sound.spread * 90;
    const l = cone.sound.volume.gain.value * 50 + 50;
    cone.sound.panner.coneInnerAngle = Math.atan( r / l) * (180 / Math.PI);
    cone.sound.panner.coneOuterAngle = cone.sound.panner.coneInnerAngle * 1.5;

    cone.geometry.dynamic = true;

    let circVertices = cone.geometry.vertices.slice(0,-1);
    let origin = cone.geometry.vertices[cone.geometry.vertices.length-1];

    circVertices.forEach(vertex => {
      let v = new THREE.Vector3().subVectors(vertex, origin).normalize();
      vertex.copy(origin.clone().addScaledVector(v, l));
    })

    cone.geometry.verticesNeedUpdate = true;
  }

  changeWidth(cone) {
    const r = cone.sound.spread * 90;
    const l = cone.sound.volume.gain.value * 50 + 50;
    cone.sound.panner.coneInnerAngle = Math.atan( r / l) * (180 / Math.PI);
    cone.sound.panner.coneOuterAngle = cone.sound.panner.coneInnerAngle * 1.5;

    cone.geometry.dynamic = true;

    let circVertices = cone.geometry.vertices.slice(0,-1);
    let center = new THREE.Vector3();
    center.lerpVectors(circVertices[0], circVertices[Math.round(circVertices.length/2)], 0.5);

    circVertices.forEach(vertex => {
      let v = new THREE.Vector3().subVectors(vertex, center).normalize();
      vertex.copy(center.clone().addScaledVector(v, r));
    })

    cone.geometry.verticesNeedUpdate = true;
  }

  pointCone(cone, point) {
    const coneRotation = new THREE.Vector3();
    coneRotation.subVectors(point, this.containerObject.position);
    cone.lookAt(coneRotation);
    this.setAudioPosition(cone);

    const longlat = (function( vector3 ) {
        // taken from https://gist.github.com/nicoptere/2f2571db4b454bb18cd9
        vector3.normalize();

        //longitude = angle of the vector around the Y axis
        //-( ) : negate to flip the longitude (3d space specific )
        //- PI / 2 to face the Z axis
        var lng = -( Math.atan2( -vector3.z, -vector3.x ) ) - Math.PI / 2;

        //to bind between -PI / PI
        if( lng < - Math.PI )lng += Math.PI*2;

        //latitude : angle between the vector & the vector projected on the XZ plane on a unit sphere

        //project on the XZ plane
        var p = new THREE.Vector3( vector3.x, 0, vector3.z );
        //project on the unit sphere
        p.normalize();

        //compute the angle ( both vectors are normalized, no division by the sum of lengths )
        var lat = Math.acos( p.dot( vector3 ) );

        //invert if Y is negative to ensure the latitude is between -PI/2 & PI / 2
        if( vector3.y < 0 ) lat *= -1;

        return [ lng,lat ];

      })( coneRotation );
    cone.long = longlat[0];
    cone.lat = longlat[1];
  }

  removeCone(cone) {
    cone.sound.source.stop();
    const i = this.cones.indexOf(cone);
    this.cones.splice(i, 1);
    this.containerObject.remove(cone);
  }

  removeFromScene(scene) {
    scene.remove(this.containerObject, true);
    scene.remove(this.altitudeHelper, true);
    scene.remove(this.axisHelper, true);
    scene.remove(this.trajectory, true);

    for (const i in this.cones) {
      this.cones[i].sound.source.stop();
    }

    if (this.omniSphere.sound && this.omniSphere.sound.source) {
      this.omniSphere.sound.source.stop();
    }
  }

  pause() {
    this.isPaused = true;
  }
  unpause() {
    this.isPaused = false;
  }

  followTrajectory() {
    if (this.trajectory && !this.isPaused) {
      this.trajectoryClock -= this.movementDirection * this.movementIncrement;

      if (this.trajectoryClock >= 1) {
        if (this.trajectory.spline.closed) {
          this.trajectoryClock = 0;
        } else {
          this.movementDirection = -this.movementDirection;
          this.trajectoryClock = 1;
        }
      }

      if (this.trajectoryClock < 0) {
        if (this.trajectory.spline.closed) {
          this.trajectoryClock = 1;
        } else {
          this.movementDirection = -this.movementDirection;
          this.trajectoryClock = 0;
        }
      }

      this.containerObject.position.copy(this.trajectory.spline.getPointAt(this.trajectoryClock));
      this.altitudeHelper.position.copy(this.trajectory.spline.getPointAt(this.trajectoryClock));
      this.axisHelper.position.copy(this.trajectory.spline.getPointAt(this.trajectoryClock));
      this.altitudeHelper.position.y = 0;

      if (this.cones[0]) {
        for (const i in this.cones) {
          this.setAudioPosition(this.cones[i]);
        }
      }
      if (this.omniSphere.sound) {
        this.setAudioPosition(this.omniSphere);
      }
    }
  }

  calculateMovementSpeed() {
    if (this.trajectory) {
      this.movementIncrement = this.movementSpeed / this.trajectory.spline.getLength(10);
    }
  }
}
