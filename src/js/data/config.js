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
    imageFiles: []
  },
  mesh: {
    enableHelper: false,
    wireframe: true,
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
    size: 10000,
    divisions: 80
  },
  camera: {
    fov: 45,
    near: 100,
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
    color: 0x777777
  },
  directionalLight: {
    enabled: true,
    color: 0xffffff,
    intensity: 1,
    multiplyScalar: 50,
    hue: 0.1,
    saturation: 0,
    lightness: 0.5,
    x: 0,
    y: 30,
    z: 0
  },
  shadow: {
    enabled: true,
    helperEnabled: false,
    bias: 0,
    mapWidth: 2048,
    mapHeight: 2048,
    near: 0,
    far: 2048,
    top: 2048,
    right: 2048,
    bottom: -2048,
    left: -2048
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
