var SoundObject = function(audio){

  this.type = 'SoundObject';
  this.posX = 0;
  this.posY = 0;
  this.posZ = 0;
  this.radius = 50;
  this.cones = [];

  this.trajectory = null;
  this.trajectoryClock = 1;
  this.movementSpeed = 5;
  this.movementDirection = 1;
  this.movementIncrement = null;

  this.containerObject = new THREE.Object3D();

  var sphereGeometry = new THREE.SphereBufferGeometry(this.radius, 100, 100);
  var sphereMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, opacity: 0.8, transparent:true});
  this.omniSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

  var raycastSphereGeometry = new THREE.SphereBufferGeometry(150, 100, 100);
  var raycastSphereMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, visible:false});
  this.raycastSphere = new THREE.Mesh(raycastSphereGeometry, raycastSphereMaterial);
  this.raycastSphere.name = "sphere";
  this.raycastSphere.position.copy(mouse);
  scene.add(this.raycastSphere);

  this.axisHelper = new THREE.AxisHelper( 100 );
  this.axisHelper.position.copy(mouse);
  scene.add(this.axisHelper);

  var lineMaterial = new THREE.LineDashedMaterial({ color: 0x888888, dashSize: 30, gapSize: 30 });
  var lineGeometry = new THREE.Geometry();
  lineGeometry.vertices.push(
      new THREE.Vector3( 0, 0, -300 ),
      new THREE.Vector3( 0, 0, 300 )
    );
  lineGeometry.computeLineDistances();
  this.altitudeHelper = new THREE.Line( lineGeometry, lineMaterial );
  this.altitudeHelper.rotation.x = Math.PI/2;
  scene.add(this.altitudeHelper);
  this.altitudeHelper.position.copy(mouse);

  this.containerObject.add(this.omniSphere);
  this.containerObject.position.copy(mouse);
  scene.add(this.containerObject);

  this.cones = [];

  this.createCone = function(fileName){

    var coneWidth = Math.random() * 50 + 50;
    var coneHeight = Math.random() * 50 + 100;
    var coneGeo = new THREE.CylinderGeometry(coneWidth, 0, coneHeight, 100, 1, true);
    var coneColor = new THREE.Color(0.5, Math.random(), 0.9);
    var coneMaterial = new THREE.MeshBasicMaterial({color: coneColor, opacity: 0.5});
    coneGeo.translate(0, coneHeight/2, 0);
    coneGeo.rotateX(Math.PI/2);
    coneMaterial.side = THREE.DoubleSide;
    var cone = new THREE.Mesh(coneGeo, coneMaterial);

    cone.sound = loadSound(fileName);
    cone.sound.panner.refDistance = 50;
    cone.sound.panner.distanceModel = 'inverse';
    cone.sound.panner.coneInnerAngle = Math.atan(coneWidth/coneHeight) * (180/Math.PI);
    cone.sound.panner.coneOuterAngle = cone.sound.panner.coneInnerAngle * 1.5;
    cone.sound.panner.coneOuterGain = 0.05;
    cone.sound.volume.gain.value = mapRange(coneHeight, 100, 150, 0.2, 1);

    cone.name = "cone";

    this.cones.push(cone);
    this.containerObject.add(cone);
    this.setAudioPosition(cone);
  };

  this.setAudioPosition = function(cone){

    // cone.sound.panner.position = cone.position;
    //
    // var vec = new THREE.Vector3(0,0,1);
    // var m = cone.matrixWorld;
    // var mx = m.elements[12], my = m.elements[13], mz = m.elements[14];
    // m.elements[12] = m.elements[13] = m.elements[14] = 0;
    // vec.applyProjection(m);
    // vec.normalize();
    // cone.sound.panner.setOrientation(vec.x, vec.y, vec.z);
    // m.elements[12] = mx;
    // m.elements[13] = my;
    // m.elements[14] = mz;

    var p = new THREE.Vector3();
    var q = new THREE.Vector3();
    p.setFromMatrixPosition(cone.matrixWorld);
    var px = p.x, py = p.y, pz = p.z;

    cone.updateMatrixWorld();
    q.setFromMatrixPosition(cone.matrixWorld);
    var dx = q.x-px, dy = q.y-py, dz = q.z-pz;
    cone.sound.panner.setPosition(q.x, q.y, q.z);

    var vec = new THREE.Vector3(0, 0, 1);
    var m = cone.matrixWorld;
    var mx = m.elements[12], my = m.elements[13], mz = m.elements[14];
    m.elements[12] = m.elements[13] = m.elements[14] = 0;
    vec.applyProjection(m);
    vec.normalize();
    cone.sound.panner.setOrientation(vec.x, vec.y, vec.z);
    m.elements[12] = mx;
    m.elements[13] = my;
    m.elements[14] = mz;
  };

  function loadSound(soundFileName){

    var context = audio.context;
    var sound = {};
    sound.source = context.createBufferSource();
    sound.source.loop = true;
    sound.panner = context.createPanner();
    sound.panner.panningModel = 'HRTF';
    sound.volume = context.createGain();

    sound.source.connect(sound.volume);
    sound.volume.connect(sound.panner);
    sound.panner.connect(audio.destination);

    var request = new XMLHttpRequest();
    request.open("GET", soundFileName, true);
    request.responseType = "arraybuffer";
    request.onload = function() {
      context.decodeAudioData(request.response, function(buffer){
        sound.buffer = buffer;
        sound.source.buffer = sound.buffer;
        sound.source.start(context.currentTime + 0.020);
      }, function() {
        alert("Decoding the audio buffer failed");
      });
    };
    request.send();

    return sound;
  }

  this.isUnderMouse = function(ray) {
    return ray.intersectObject( this.containerObject, true ).length > 0;
  };

  this.select = function(){
    this.nonScaledMouseOffsetY = nonScaledMouse.y;
  }

  this.move = function() {

    var pointer;

    if( perspectiveView ) {
      pointer = this.containerObject.position;
      var posY = mapRange(nonScaledMouse.y - this.nonScaledMouseOffsetY, -0.5, 0.5, -200, 200);
      if(pointer.y > -200 || pointer.y < 200) pointer.y += posY;
      this.nonScaledMouseOffsetY = nonScaledMouse.y;
    }
    else{
      pointer = mouse ;
      pointer.y = this.containerObject.position.y;
    }
    this.containerObject.position.copy(pointer);
    this.axisHelper.position.copy(pointer);
    this.altitudeHelper.position.copy(pointer);
    this.altitudeHelper.position.y = 0;
    this.raycastSphere.position.copy(pointer);
    if(this.trajectory) this.trajectory.move(pointer);
    if(this.cones[0]){

      for(var i in this.cones){
        this.setAudioPosition(this.cones[i]);
      }
    }
  };

  this.addToScene = function() {

    scene.add(this.containerObject);
  };

  this.setActive = function() {

    if(this.trajectory) this.trajectory.setActive();
    if(this.trajectory) this.trajectory.setMouseOffset(mouse);
  };

  this.setInactive = function() {

    if(this.trajectory) this.trajectory.setInactive();
  };

  this.removeFromScene = function() {
    scene.remove(this.containerObject, true);
    scene.remove(this.altitudeHelper, true);
    scene.remove(this.axisHelper, true);
    scene.remove(this.trajectory, true);
    for(var i in this.cones){
      this.cones[i].sound.source.stop();
    }
  };

  this.followTrajectory = function() {

    if (this.trajectory){

      this.trajectoryClock -= this.movementDirection * this.movementIncrement;
      if ( this.trajectoryClock >= 1 ){
        if( this.trajectory.spline.closed ){
          this.trajectoryClock = 0;
        }
        else{
          this.movementDirection = - this.movementDirection;
          this.trajectoryClock = 1;
        }
      }

      if ( this.trajectoryClock < 0 ){
        if( this.trajectory.spline.closed ){
          this.trajectoryClock = 1;
        }
        else{
          this.movementDirection = - this.movementDirection;
          this.trajectoryClock = 0;
        }
      }

      this.containerObject.position.copy(this.trajectory.spline.getPointAt(this.trajectoryClock));
      this.altitudeHelper.position.copy(this.trajectory.spline.getPointAt(this.trajectoryClock));
      this.axisHelper.position.copy(this.trajectory.spline.getPointAt(this.trajectoryClock));
      this.altitudeHelper.position.y = 0;

      if(this.cones[0]){

        for(var i in this.cones){
          this.setAudioPosition(this.cones[i]);
        }
      }
    }
  };

  this.calculateMovementSpeed = function() {
    if(this.trajectory) this.movementIncrement = this.movementSpeed / this.trajectory.spline.getLength(10);
  };
};

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

function map(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

var soundCone = {
  longitude: 0,
  latitude: 0,
  spread: 0,
  throw: 0,
  audioFile: null,
  gain: 0
}
