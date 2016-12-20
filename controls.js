// add a rotate controller to bottom right of screen
window.addEventListener('load',function() {
    var container = document.body.appendChild(document.createElement('div'));
    container.id = 'cam-control';

    // init camera & orbitcontrols
    var camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
    camera.position.y = 200;
    camera.updateProjectionMatrix();

    var uiControls = new THREE.OrbitControls( camera );
    uiControls.minPolarAngle = -Math.PI/2;
    uiControls.maxPolarAngle = Math.PI/2;
    uiControls.enabled = true;
    uiControls.enableRotate = false;
    uiControls.enablePan = false;
    uiControls.enableZoom = false;

    // init lighting, scene, and renderer
    var scene = new THREE.Scene();
    scene.add(camera);
    scene.add(new THREE.AmbientLight('#555'));
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
        if (controls) { // global controls
            uiControls.enableRotate = controls.enableRotate = true;
        }
    }, false );
    document.addEventListener( 'mouseup', function() {
        if (controls) {
            uiControls.enableRotate = controls.enableRotate = false;
        }
    })

})
