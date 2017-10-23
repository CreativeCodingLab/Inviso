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
    this.audio = main.audio;
    this.gui = main.gui;

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
      premultipliedAlpha: true
    });
    this.omniSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.omniSphere.name = 'omniSphere';
    this.omniSphere.castShadow = true;

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

  createCone(sound, color = null) {
    sound.volume.gain.value = 1;
    sound.spread = 0.5;

    const coneWidth = sound.spread * 90;
    const coneHeight = sound.volume.gain.value * 50 + 50;

    const coneGeo = new THREE.CylinderGeometry(coneWidth, 0, coneHeight, 100, 1, true);
    const randGreen = color !== null ? color : Math.random();
    const randBlue = color !== null ? color : Math.random();
    //const coneColor = new THREE.Color(0.5, randGreen, randBlue);
    const coneColor = new THREE.Color();
    coneColor.setHSL(randGreen, randBlue, 0.8);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: coneColor,
      opacity: 0.8,
      transparent:true
    });

    coneGeo.translate(0, coneHeight / 2, 0);
    coneGeo.rotateX(Math.PI / 2);
    coneMaterial.side = THREE.DoubleSide;

    const cone = new THREE.Mesh(coneGeo, coneMaterial);

    cone.randGreen = randGreen;
    cone.sound = sound;
    cone.sound.panner.coneInnerAngle = Math.atan(coneWidth / coneHeight) * (180 / Math.PI);
    cone.sound.panner.coneOuterAngle = cone.sound.panner.coneInnerAngle * 3;
    cone.sound.panner.coneOuterGain = 0.05;
    // cone.sound.volume.gain.value = Helpers.mapRange(coneHeight, 100, 150, 0.5, 2);

    cone.name = 'cone';
    cone.baseColor = coneColor;
    cone.hoverColor = function() {
      let c = this.baseColor.clone();
      c.offsetHSL(0,-0.05,0.1);
      return c;
    }

    sound.scriptNode.onaudioprocess = function() {
      let array =  new Uint8Array(sound.analyser.frequencyBinCount);
      sound.analyser.getByteFrequencyData(array);
      let values = 0;
      let length = array.length;
      for (let i = 0; i < length; i++) values += array[i];
      let average = values / length;
      cone.material.opacity = Helpers.mapRange(average, 50, 100, 0.65, 0.95);
    }

    cone.long = cone.lat = 0;

    this.cones.push(cone);
    this.containerObject.add(cone);
    this.setAudioPosition(cone);
    return cone;
  }

  setAudioPosition(object) {
    const o = new THREE.Vector3();
    object.updateMatrixWorld();
    o.setFromMatrixPosition(object.matrixWorld);
    object.sound.panner.setPosition(o.x, o.y, o.z);

    if (object.name == 'cone') {
      const p = new THREE.Vector3();
      const q = new THREE.Vector3();
      const m = object.matrixWorld;

      const mx = m.elements[12];
      const my = m.elements[13];
      const mz = m.elements[14];

      const vec = new THREE.Vector3(0, 0, 1);

      m.elements[12] = m.elements[13] = m.elements[14] = 0;

      vec.applyMatrix4(m);
      vec.normalize();
      object.sound.panner.setOrientation(vec.x, vec.y, vec.z);

      m.elements[12] = mx;
      m.elements[13] = my;
      m.elements[14] = mz;
    }
  }

  loadSound(file, audio, mute, object) {
    const context = audio.context;
    const mainMixer = context.createGain();
    let reader = new FileReader();
    var sound = {};

    this.filename = file.name;

    let promise = new Promise(function(resolve, reject) {
      reader.onload = (ev) => {
        context.decodeAudioData(ev.target.result, function(decodedData) {
          if (object && object.type === 'SoundObject') {
            /* attach omnidirectional sound */
            object = object.omniSphere;
          }

          if (object && object.sound) {
            object.sound.source.stop();
            object.sound.source.disconnect(object.sound.scriptNode);
            object.sound.scriptNode.disconnect(context.destination);
          }

          sound.mainMixer = mainMixer;

          sound.analyser = context.createAnalyser();
          sound.analyser.smoothingTimeConstant = 0.5;
          sound.analyser.fftSize = 1024;

          sound.scriptNode = context.createScriptProcessor(2048, 1, 1);
          sound.scriptNode.connect(context.destination);

          sound.source = context.createBufferSource();
          sound.source.loop = true;
          sound.source.connect(sound.scriptNode);

          sound.panner = context.createPanner();
          sound.panner.panningModel = 'HRTF';
          sound.panner.distanceModel = 'inverse';
          sound.panner.refDistance = 100;

          // sound.panner.rolloffFactor = 5;

          sound.volume = context.createGain();
          sound.source.connect(sound.volume);
          sound.volume.connect(sound.analyser);
          sound.volume.connect(sound.panner);
          sound.panner.connect(mainMixer);
          mainMixer.connect(audio.destination);
          mainMixer.gain.value = mute ? 0 : 1;

          sound.source.buffer = decodedData;
          sound.source.start(context.currentTime + 0.020);

          if (object && object.name === 'omniSphere') {
            sound.scriptNode.onaudioprocess = () => {
              const array = new Uint8Array(sound.analyser.frequencyBinCount);
              sound.analyser.getByteFrequencyData(array);
              let values = 0;
              const length = array.length;
              for (let i = 0; i < length; i++) values += array[i];
              const average = values / length;
              object.material.opacity = Helpers.mapRange(average, 50, 100, 0.65, 0.95);
            };
          }

          resolve(sound);
        });
      };

      reader.readAsArrayBuffer(file);
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

    if (this.trajectory) this.trajectory.move(pointer, main.nonScaledMouse, main.perspectiveView);

    this.setPosition(pointer);
  }

  setPosition(position) {
    this.containerObject.position.copy(position);
    this.axisHelper.position.copy(position);
    this.altitudeHelper.position.copy(position);
    this.altitudeHelper.position.y = 0;
    this.raycastSphere.position.copy(position);

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
    else {
      this.omniSphere.scale.x = this.omniSphere.scale.y = this.omniSphere.scale.z = 1;
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
    cone.sound.panner.coneOuterAngle = cone.sound.panner.coneInnerAngle * 3;

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

  // Needs to be refactored - also lives in guiwindow
  pointConeMagic(cone, lat, long) {
    // adapted from https://gist.github.com/nicoptere/2f2571db4b454bb18cd9
    const v = (function lonLatToVector3( lng, lat )
      {
      //flips the Y axis
      lat = Math.PI / 2 - lat;

      //distribute to sphere
      return new THREE.Vector3(
        Math.sin( lat ) * Math.sin( lng ),
        Math.cos( lat ),
        Math.sin( lat ) * Math.cos( lng )
      );

      })( long, lat );
    if (v.x === 0) { v.x = 0.0001; }
    const point = this.containerObject.position.clone().add(v);
    this.pointCone(cone, point);

  }

  applySoundToCone(cone, sound) {

    sound.scriptNode.onaudioprocess = function() {
      let array =  new Uint8Array(sound.analyser.frequencyBinCount);
      sound.analyser.getByteFrequencyData(array);
      let values = 0;
      let length = array.length;
      for (let i = 0; i < length; i++) values += array[i];
      let average = values / length;
      cone.material.opacity = Helpers.mapRange(average, 50, 100, 0.65, 0.95);
    }

    sound.spread = cone.sound.spread;
    sound.panner.refDistance = cone.sound.panner.refDistance;
    sound.panner.distanceModel = cone.sound.panner.distanceModel;
    sound.panner.coneInnerAngle = cone.sound.panner.coneInnerAngle;
    sound.panner.coneOuterAngle = cone.sound.panner.coneOuterAngle;
    sound.panner.coneOuterGain = cone.sound.panner.coneOuterGain;
    sound.volume.gain.value = cone.sound.volume.gain.value;
    cone.sound = sound;
  }

  removeCone(cone) {
    cone.sound.source.stop();
    cone.sound.source.disconnect(cone.sound.scriptNode);
    cone.sound.scriptNode.disconnect(this.audio.context.destination);
    cone.sound = null;
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

  mute(main) {
    this.isMuted = true;
    this.checkMuteState(main);
  }
  unmute(main) {
    this.isMuted = false;
    this.checkMuteState(main);
  }

  turnVisible() {
    this.containerObject.visible = true;
    this.axisHelper.visible = true;
    this.altitudeHelper.visible = true;
  }

  turnInvisible() {
    this.containerObject.visible = false;
    this.axisHelper.visible = false;
    this.altitudeHelper.visible = false;
  }

  checkMuteState(main) {
    if (main.isMuted || this.isMuted) {
      this.cones.forEach(cone => cone.sound.mainMixer.gain.value = 0);
      if (this.omniSphere.sound && this.omniSphere.sound.mainMixer) {
        this.omniSphere.sound.mainMixer.gain.value = 0;
      }
    }
    else {
      this.cones.forEach(cone => cone.sound.mainMixer.gain.value = 1);
      if (this.omniSphere.sound && this.omniSphere.sound.mainMixer) {
        this.omniSphere.sound.mainMixer.gain.value = 1;
      }
    }
  }

  followTrajectory(mute) {
    if (this.trajectory && !this.isPaused && !this.isMuted && !mute) {
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

      let pointOnTrajectory = this.trajectory.spline.getPointAt(this.trajectoryClock);
      this.containerObject.position.copy(pointOnTrajectory);
      this.raycastSphere.position.copy(pointOnTrajectory);
      this.altitudeHelper.position.copy(pointOnTrajectory);
      this.axisHelper.position.copy(pointOnTrajectory);
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

  toJSON() {
    return JSON.stringify({
      filename: (this.omniSphere.sound && this.omniSphere.sound && this.omniSphere.sound.name) || null,
      volume: (this.omniSphere && this.omniSphere.sound && this.omniSphere.sound.volume.gain.value) || null,
      position: this.containerObject.position,
      movementSpeed: this.movementSpeed,
      trajectory: (this.trajectory && this.trajectory.points) || null,
      cones: this.cones.map((c) => {
        return {
          filename: c.filename,
          position: {
            lat: c.lat,
            long: c.long,
          },
          volume: c.sound.volume.gain.value,
          spread: c.sound.spread,
          color: c.randGreen,
        };
      }),
    });
  }

  fromJSON(json) {
    const object = JSON.parse(json);
    this.containerObject.position.copy(object.position);
    this.altitudeHelper.position.copy(object.position);
    this.raycastSphere.position.copy(object.position);
    this.axisHelper.position.copy(object.position);

    if (object.filename && object.volume) {
      this.loadSound(object.filename, this.audio, false, this).then((sound) => {
        this.omniSphere.sound = sound;
        this.omniSphere.sound.name = object.filename;
        this.omniSphere.sound.volume.gain.value = object.volume;
        this.setAudioPosition(this.omniSphere);
      });
    }

    object.cones.forEach((c) => {
      let cone;
      this.loadSound(c.filename, this.audio, false).then((sound) => {
        cone = this.createCone(sound, c.color);
        cone.filename = c.filename;
        cone.sound.volume.gain.value = c.volume;
        cone.sound.spread = c.spread;
        this.changeLength(cone);
        this.changeWidth(cone);
        this.gui.addCone(cone);
        this.pointConeMagic(cone, c.position.lat, c.position.long);
      });
    });

    this.movementSpeed = object.movementSpeed;
  }
}
