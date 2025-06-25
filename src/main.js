import * as THREE from 'three';
import { Ocean } from './ocean.js';

// Image filenames in the public directory
const handImageFilenames = [
  'lh1.jpg', 'lh2.jpg', 'lh3.jpg', 'lh4.jpg', 'lh5.jpg', 'lh6.jpg', 'lh7.jpg'
];
const faceImageFilenames = [
  'promo1.jpg', 'promo2.jpg', 'promo3.jpg', 'promo4.jpg', 'promo5.jpg', 'promo6.jpg'
];

// Function to create the Three.js image grid
function createImageGrid(scene, cameraViewSize, cameraAspect) {
  const textureLoader = new THREE.TextureLoader();
  const imageGridGroup = new THREE.Group();

  const nineSixteenAspect = 9 / 16;
  const numCols = 5; // Adjust as needed
  const tileHeight = cameraViewSize / 3; // Example: 3 rows visible in camera view
  const tileWidth = tileHeight * nineSixteenAspect;
  
  const totalGridWidth = numCols * tileWidth;
  const startX = -totalGridWidth / 2 + tileWidth / 2;
  let currentX = startX;
  let currentY = cameraViewSize / 2 - tileHeight / 2; // Start at top
  let rowCount = 0;

  for (let i = 0; i < imageFilenames.length; i++) {
    const texture = textureLoader.load(`/${imageFilenames[i]}`);
    texture.colorSpace = THREE.SRGBColorSpace; // Important for correct color
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.85 });
    const geometry = new THREE.PlaneGeometry(tileWidth, tileHeight);
    const plane = new THREE.Mesh(geometry, material);

    plane.position.set(currentX, 0, currentY); // Position on XZ plane (Y is up in Three.js world)
    plane.rotation.x = -Math.PI / 2; // Rotate plane to be flat on XZ

    imageGridGroup.add(plane);

    currentX += tileWidth;
    if ((i + 1) % numCols === 0) {
      currentX = startX;
      currentY -= tileHeight;
      rowCount++;
    }
  }
  imageGridGroup.position.z = -50; // Push it back a bit from the ocean plane if needed
  scene.add(imageGridGroup);
  return imageGridGroup;
}

// Handle sign-up form demo mode
const form = document.getElementById('signup-form');
const successMsg = document.getElementById('form-success');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(successMsg) successMsg.style.display = 'block';
    setTimeout(() => {
      if(successMsg) successMsg.style.display = 'none';
      form.reset();
    }, 2500);
  });
}

// Initialize the Three.js ocean effect and image grid
document.addEventListener('DOMContentLoaded', () => {
  const oceanCanvas = document.getElementById('ocean-canvas');
  if (oceanCanvas) {
    const oceanApp = new Ocean(oceanCanvas, handImageFilenames, faceImageFilenames);
    // The Ocean class will now handle creating the image grid internally
  } else {
    console.error('Ocean canvas not found!');
  }
}); 