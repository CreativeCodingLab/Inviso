import TWEEN from 'tween.js';

// This object contains the state of the app
export default {
  isDev: false,
  isLoaded: false,
  isTweening: false,
  isRotating: true,
  isMouseMoving: false,
  isMouseOver: false,
  maxAnisotropy: 1,
  dpr: 1,
  easing: TWEEN.Easing.Quadratic.InOut,
  duration: 500,
  model: {
    path: './assets/models/head.obj',
    scale: 30
  },
  texture: {
    path: './assets/textures/',
    imageFiles: [
      {name: 'UV', image: 'UV_Grid_Sm.jpg'}
    ]
  },
  mesh: {
    enableHelper: false,
    wireframe: false,
    translucent: false,
    material: {
      color: 0xffffff,
      emissive: 0xffffff
    }
  },
  fog: {
    color: 0xffffff,
    near: 0.0008
  },
  grid: {
    size: 5000,
    divisions: 100
  },
  camera: {
    fov: 45,
    near: 1,
    far: 10000,
    aspect: 1,
    posX: 0,
    posY: 2500,
    posZ: 0
  },
  soundObject: {
    defaultRadius: 50,
    defaultTrajectoryClock: 1,
    defaultMovementSpeed: 5,
    defaultMovementDirection: 1,
    defaultPosX: 0,
    defaultPosY: 0,
    defaultPosZ: 0
  },
  controls: {
    autoRotate: false,
    autoRotateSpeed: -0.5,
    rotateSpeed: 0.5,
    zoomSpeed: 0.8,
    minDistance: 200,
    maxDistance: 5000,
    minPolarAngle: -Math.PI / 2,
    maxPolarAngle: Math.PI / 2,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    enableDamping: true,
    dampingFactor: 0.5,
    enableZoom: true,
    target: {
      x: 0,
      y: 0,
      z: 0
    }
  },
  ambientLight: {
    enabled: true,
    color: 0x909090
  },
  directionalLight: {
    enabled: true,
    color: 0xffffff,
    intensity: 1,
    multiplyScalar: 50,
    hue: 0.1,
    saturation: 1,
    lightness: 0.95,
    x: -1,
    y: 1.75,
    z: 1
  },
  shadow: {
    enabled: false,
    helperEnabled: false,
    bias: 0,
    mapWidth: 2048,
    mapHeight: 2048,
    near: 250,
    far: 400,
    top: 100,
    right: 100,
    bottom: -100,
    left: -100
  },
  pointLight: {
    enabled: false,
    color: 0xffffff,
    intensity: 0.34,
    distance: 115,
    x: 0,
    y: 0,
    z: 0
  },
  hemiLight: {
    enabled: false,
    color: 0xc8c8c8,
    groundColor: 0xffffff,
    intensity: 0.55,
    x: 0,
    y: 0,
    z: 0
  }
};
