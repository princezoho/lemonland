import * as THREE from 'three';
import { Ocean } from './ocean.js';

// Image filenames in the public directory
const imageFilenames = [
  'promo-1.png', 'promo-2.png', 'promo-3.png', 'promo-4.png', 'promo-5.png', 'promo-6.png', 'promo-7.png', 'promo-7b.png',
  'pool1.png', 'pool2.png', 'pool3.png',
  '7ACCB6E6-6371-4FB8-AE30-90E4B22B3640.PNG', 'C4C8D634-140F-465D-9CC1-D5052094E15D.PNG', '2615819E-B8F3-4AFE-9087-6C4937B382FB.PNG',
  '305E4F96-E298-4DDE-AFBF-F4B43E7042D4.PNG', '26540FA3-4A4B-4EDE-AD60-69D3D4E9A89E.PNG', 'B5F79E54-B65F-4B97-B74F-3FDAAEC1AD11.PNG',
  'A89E7632-AD98-4A22-AEFE-68F7CBFD3B4D.PNG', '95C76A8D-9000-4D1C-8A27-238BE6BCD619.PNG', 'DC189BF6-CC42-4343-B3CB-5C429B95189B.PNG',
  'FACECBBD-DD57-4855-A96D-B0C80F57F25B.PNG', '16C08E0E-D902-43C5-B5D4-2935CDE16940.PNG', '6A86F6CC-43EE-4FA1-9DAD-3CD50F8FAD3F.PNG',
  '7A645856-D4C7-4858-B1A3-4A61801FD3EC.PNG', '349F40FC-54F6-4E12-A64C-0D80A7AD2074.PNG', '7C2FBB52-30C2-47CC-ACCD-8951764FE18E.PNG',
  '0227343E-9678-413B-B966-9BC2273B0845.PNG', '7E019246-D647-4313-B79A-DD290C9DCCE4.PNG', '7C4ABC9F-15AD-487E-B7C3-357AB41F9C1E.PNG',
  '2AC9C380-A561-4613-9242-74D06BAD0918.PNG', '832305EE-DD91-4F07-8F0C-36A8F9D3BA7D.PNG', '3F97EBCF-1C9B-45B6-9866-77404C71CAF7.PNG',
  'EECFF375-BAC3-44AC-9862-4BC8DB17AAF5.PNG', 'A596AA77-3B50-4046-92D6-7218CDDD8AF5.PNG', 'C089330E-49E6-4355-9CF6-317C350FDDF0.PNG',
  '383C886E-173E-4A32-A9E0-7E11458FD40B.PNG', 'EBC449DA-D190-4146-8236-7750C5568E9B.PNG', '7DE8DFF4-2035-4A73-94B8-2BE6200461FB.PNG',
  'ECDFC0D2-4560-4151-88D4-8A32CA186763.PNG', 'AF3F6421-0EF1-4EEF-AFAB-8254C35BC5D4.PNG', '2D9C091C-B809-4B0A-84D8-1055922C983B.PNG',
  'A2508EA3-8775-4887-8867-6BB936C7498B.PNG', '0F460EEE-F3E6-4BA1-B161-37D69D9361CD.PNG', '193E2281-582F-48B2-AB75-2DFD8E843D6A.PNG'
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
    const oceanApp = new Ocean(oceanCanvas, imageFilenames); // Pass imageFilenames
    // The Ocean class will now handle creating the image grid internally
  } else {
    console.error('Ocean canvas not found!');
  }
}); 