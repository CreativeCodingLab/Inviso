import * as THREE from 'three';
import OrbitControls from '../../utils/orbitControls';

// Class that creates and updates the main camera
export default class CameraViewer {
  constructor(main) {
    var container = main.container.appendChild(document.createElement('div'));
    container.id = 'cam-control';

    var label = document.createElement('div');
    label.id = 'cam-control-label';
    label.innerHTML = 'Aerial view';
    container.append(label);
    label.onclick = function() {
        main.reset();
    }
    this.label = label;

    // init camera & orbitcontrols
    var camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
    camera.position.y = 200;
    camera.updateProjectionMatrix();

    var orbitControls = new OrbitControls(THREE);

    var uiControls = this.controls = new orbitControls( camera );
    uiControls.minPolarAngle = -Math.PI/2;
    uiControls.maxPolarAngle = Math.PI/2;
    uiControls.enabled = true;
    uiControls.enableRotate = false;
    uiControls.enablePan = false;
    uiControls.enableZoom = false;

    // init lighting, scene, and renderer
    var scene = new THREE.Scene();
    scene.add(camera);
    scene.add(new THREE.AmbientLight('#333'));
    var light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( 0, 2, 2 );
    light.position.multiplyScalar( 20 );
    scene.add( light );

    var renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setSize( container.clientWidth, container.clientHeight );
    container.appendChild( renderer.domElement );

    // create a circle and add it to the scene
    var circle = function() {

        var r = 40;
        var shape = new THREE.Shape();
        shape.moveTo( r, 0 );
        shape.absarc( 0, 0, r, 0, Math.PI*2, false );

        var extrudeSettings = { amount: 8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };

        var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
        var mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: '#aaa' } ) );
        mesh.position.set( 0, 0, 0 );
        mesh.rotation.set( 0, 0, 1 );
        return mesh;
    }
    scene.add( circle() );

    // animate
    function render() {
        uiControls.update();
        renderer.clear();
        renderer.setViewport( 0, 0, container.clientWidth, container.clientHeight );
        renderer.render( scene, camera );
        requestAnimationFrame( render );
    }
    render();

    // add listeners
    container.addEventListener( 'mousedown', function() {

        document.getElementById('help-camera').style.display = 'none';
      
        if (main.isAddingObject || main.isAddingTrajectory) {
            main.controls.disable();
        }
    }, false );
    document.addEventListener( 'mousedown', function(e) {
        if (e.target !== renderer.domElement) {
            container.style.pointerEvents = 'none';
        }
    })

    document.addEventListener( 'mouseleave', function() {
        container.style.pointerEvents = 'auto';
        main.controls.enable();
    });
    document.addEventListener( 'mouseup', function() {
        container.style.pointerEvents = 'auto';
        main.controls.enable();
    });
  }

  syncToRotation(controls) {
    this.controls.constraint.rotateUp(this.controls.getPolarAngle() - controls.getPolarAngle());
    this.controls.constraint.rotateLeft(this.controls.getAzimuthalAngle() - controls.getAzimuthalAngle());
    this.controls.update();
  }

  updateLabel(isPerspectiveView) {
    this.label.innerHTML = isPerspectiveView ? 'Altitude view' : 'Aerial view';
  }

  reset() {
    this.controls.reset();
    this.updateLabel(false);
  }
}
