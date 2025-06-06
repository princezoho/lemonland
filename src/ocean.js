import * as THREE from 'three';

// Shuffle function (Fisher-Yates)
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Function to create the Three.js image grid
function createImageGrid(scene, handImages, faceImages, cameraViewSize, cameraAspect) {
  const textureLoader = new THREE.TextureLoader();
  const imageGridGroup = new THREE.Group();
  imageGridGroup.name = "ImageGrid";

  const shuffledHandImages = shuffle([...handImages]);
  const shuffledFaceImages = shuffle([...faceImages]);

  const portraitAspect = 3 / 5; // 3:5 aspect ratio
  const tileHeight = cameraViewSize / 2.5; // Adjust number of rows visible (e.g., 2.5 rows)
  const tileWidth = tileHeight * portraitAspect;
  
  // Calculate how many cols and rows are needed to fill the view
  const numCols = Math.ceil(cameraViewSize * cameraAspect / tileWidth) + 2; // +2 for overscan
  const numRows = Math.ceil(cameraViewSize / tileHeight) + 2; // +2 for overscan

  const totalGridWidth = numCols * tileWidth;
  const totalGridHeight = numRows * tileHeight;

  const startX = -totalGridWidth / 2 + tileWidth / 2;
  const startY = totalGridHeight / 2 - tileHeight / 2;

  let handImagePointer = 0;
  let faceImagePointer = 0;
  const recentlyPlacedBufferSize = Math.floor(numCols * 1.5); // Store roughly 1.5 rows of image names
  const recentlyPlacedImages = [];

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const overallIndex = r * numCols + c;
      let imageName = null;
      let attempts = 0;

      if (overallIndex % 2 === 0) { // Even index: use a hand image
        const list = shuffledHandImages;
        let currentPointer = handImagePointer;
        while (attempts < list.length) {
          const candidate = list[currentPointer % list.length];
          if (!recentlyPlacedImages.includes(candidate)) {
            imageName = candidate;
            break;
          }
          currentPointer++;
          attempts++;
        }
        if (!imageName) imageName = list[handImagePointer % list.length]; // Fallback
        handImagePointer++;
      } else { // Odd index: use a face image
        const list = shuffledFaceImages;
        let currentPointer = faceImagePointer;
        while (attempts < list.length) {
          const candidate = list[currentPointer % list.length];
          if (!recentlyPlacedImages.includes(candidate)) {
            imageName = candidate;
            break;
          }
          currentPointer++;
          attempts++;
        }
        if (!imageName) imageName = list[faceImagePointer % list.length]; // Fallback
        faceImagePointer++;
      }

      // Update recently placed images buffer
      if (imageName) {
        recentlyPlacedImages.push(imageName);
        if (recentlyPlacedImages.length > recentlyPlacedBufferSize) {
          recentlyPlacedImages.shift(); // Remove the oldest
        }
      }
      
      const texture = textureLoader.load(`/${imageName}`);
      // texture.colorSpace = THREE.SRGBColorSpace; // Temporarily commented out for testing darkening
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: false });
      const geometry = new THREE.PlaneGeometry(tileWidth, tileHeight);
      const plane = new THREE.Mesh(geometry, material);
      plane.position.set(startX + c * tileWidth, startY - r * tileHeight, -1); // Positioned on Z=-1
      imageGridGroup.add(plane);
    }
  }
  scene.add(imageGridGroup);
  return imageGridGroup;
}

export class Ocean {
  constructor(canvas, handImageFilenames, faceImageFilenames) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.handImageFilenames = handImageFilenames;
    this.faceImageFilenames = faceImageFilenames;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x000000, 0); // Keep canvas transparent for HTML bg to show if needed
    this.renderer.autoClear = false;
    // this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // Experiment if SRGBColorSpace causes issues

    this.backgroundScene = new THREE.Scene();
    // Remove solid green background, we want to see the images now
    // this.backgroundScene.background = new THREE.Color(0x00ff00); 

    const aspect = this.width / this.height;
    this.viewSize = 200;
    this.backgroundCamera = new THREE.OrthographicCamera(
      this.viewSize * aspect / -2, this.viewSize * aspect / 2,
      this.viewSize / 2, this.viewSize / -2,
      1, 1000
    );
    this.backgroundCamera.position.set(0, 0, 100);
    this.backgroundCamera.lookAt(0, 0, 0);
    this.backgroundScene.add(this.backgroundCamera);

    // Re-enable imageGrid creation
    this.imageGrid = createImageGrid(this.backgroundScene, this.handImageFilenames, this.faceImageFilenames, this.viewSize, aspect);
    
    this.backgroundTexture = new THREE.WebGLRenderTarget(this.width, this.height, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat
    });

    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.interactionPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(this.viewSize * aspect, this.viewSize),
        new THREE.MeshBasicMaterial({visible: false, side: THREE.DoubleSide })
    );
    this.backgroundScene.add(this.interactionPlane); 

    // Ripple Render Targets - Increased resolution
    this.rippleSize = 512; // Increased from 256
    const rippleTextureParams = {
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter, // Linear filter is good for smoother results
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    };
    this.currentRipple = new THREE.WebGLRenderTarget(this.rippleSize, this.rippleSize, rippleTextureParams);
    this.nextRipple = new THREE.WebGLRenderTarget(this.rippleSize, this.rippleSize, rippleTextureParams);
        
    this.rippleUpdateMaterial = new THREE.ShaderMaterial({ 
        uniforms: {
            uRippleTexture: { value: this.currentRipple.texture },
            uDelta: { value: new THREE.Vector2(1 / this.rippleSize, 1 / this.rippleSize) }, 
            uDropPosition: { value: new THREE.Vector2(-1000.0, -1000.0) }, 
            uDropStrength: { value: 0.0 },
            uDamping: { value: 0.98 }, // Less damping for further spread
            uWaveSpeed: { value: 0.2 } // Slightly faster wave propagation
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: ` 
            uniform sampler2D uRippleTexture;
            uniform vec2 uDelta;
            uniform vec2 uDropPosition;
            uniform float uDropStrength;
            uniform float uDamping;
            uniform float uWaveSpeed;
            varying vec2 vUv;
            void main() {
                vec2 texel = uDelta;
                vec2 prevValues = texture2D(uRippleTexture, vUv).rg;
                float h_old = prevValues.r;
                float h_older = prevValues.g;

                float hN = texture2D(uRippleTexture, vUv + vec2(0.0, texel.y)).r;
                float hS = texture2D(uRippleTexture, vUv - vec2(0.0, texel.y)).r;
                float hE = texture2D(uRippleTexture, vUv + vec2(texel.x, 0.0)).r;
                float hW = texture2D(uRippleTexture, vUv - vec2(texel.x, 0.0)).r;
                
                float laplacian = (hN + hS + hE + hW - 4.0 * h_old);
                float h_new = 2.0 * h_old - h_older + laplacian * uWaveSpeed;
                h_new *= uDamping;

                if (uDropStrength > 0.0) {
                    float distToDrop = distance(vUv, uDropPosition);
                    float dropRadius = texel.x * 4.0; 
                    if (distToDrop < dropRadius) {
                        h_new = uDropStrength * (1.0 - smoothstep(0.0, dropRadius, distToDrop));
                    }
                }

                h_new = clamp(h_new, -2.5, 2.5); // Wider clamp for stronger initial ripples
                if (abs(h_new) < 0.005) h_new = 0.0;
                gl_FragColor = vec4(h_new, h_old, 0.0, 1.0);
            }
        `
    });
    this.rippleQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.rippleUpdateMaterial);

    this.oceanDistortMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uRippleTexture: { value: this.currentRipple.texture },
        uBackgroundTexture: { value: this.backgroundTexture.texture },
        uRippleStrength: { value: 0.03 }, // More pronounced distortion
        uDelta: { value: new THREE.Vector2(1 / this.rippleSize, 1 / this.rippleSize) }
      },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D uRippleTexture;
        uniform sampler2D uBackgroundTexture;
        uniform float uRippleStrength;
        uniform vec2 uDelta; 
        varying vec2 vUv;
        void main() {
          float hCenter = texture2D(uRippleTexture, vUv).r;
          float hLeft = texture2D(uRippleTexture, vUv - vec2(uDelta.x, 0.0)).r;
          float hRight = texture2D(uRippleTexture, vUv + vec2(uDelta.x, 0.0)).r;
          float hDown = texture2D(uRippleTexture, vUv - vec2(0.0, uDelta.y)).r;
          float hUp = texture2D(uRippleTexture, vUv + vec2(0.0, uDelta.y)).r;
          vec2 gradient = vec2(hRight - hLeft, hUp - hDown);
          vec2 distortedUv = vUv + gradient * uRippleStrength;
          gl_FragColor = texture2D(uBackgroundTexture, distortedUv);
        }
      `,
      transparent: true 
    });
    this.oceanDistortQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.oceanDistortMaterial);

    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), false);

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate = this.animate.bind(this);
    this.animate();
  }

  onMouseDown(event) {
    this.mouse.x = (event.clientX / this.width) * 2 - 1;
    this.mouse.y = -(event.clientY / this.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.backgroundCamera); 
    const intersects = this.raycaster.intersectObject(this.interactionPlane);
    if (intersects.length > 0) {
      const uv = intersects[0].uv;
      if (uv) {
        this.rippleUpdateMaterial.uniforms.uDropPosition.value.set(uv.x, uv.y); 
        this.rippleUpdateMaterial.uniforms.uDropStrength.value = 3.5; // Stronger initial drop
      }
    }
  }

  onTouchStart(event) {
    event.preventDefault(); // Prevent scrolling
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.mouse.x = (touch.clientX / this.width) * 2 - 1;
      this.mouse.y = -(touch.clientY / this.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.backgroundCamera); 
      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) {
        const uv = intersects[0].uv;
        if (uv) {
          this.rippleUpdateMaterial.uniforms.uDropPosition.value.set(uv.x, uv.y); 
          this.rippleUpdateMaterial.uniforms.uDropStrength.value = 3.5; // Stronger initial drop
        }
      }
    }
  }

  updateRipples() {
    this.renderer.setRenderTarget(this.nextRipple);
    this.renderer.clear();
    this.renderer.render(this.rippleQuad, this.quadCamera);
    this.renderer.setRenderTarget(null);
    [this.currentRipple, this.nextRipple] = [this.nextRipple, this.currentRipple];
    
    this.oceanDistortMaterial.uniforms.uRippleTexture.value = this.currentRipple.texture;
    this.rippleUpdateMaterial.uniforms.uRippleTexture.value = this.currentRipple.texture; 
    
    this.rippleUpdateMaterial.uniforms.uDropStrength.value = 0.0; 
    this.rippleUpdateMaterial.uniforms.uDropPosition.value.set(-1000.0, -1000.0);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height);
    this.backgroundTexture.setSize(this.width, this.height);
    const aspect = this.width / this.height;
    
    this.backgroundCamera.left = this.viewSize * aspect / -2;
    this.backgroundCamera.right = this.viewSize * aspect / 2;
    this.backgroundCamera.top = this.viewSize / 2;
    this.backgroundCamera.bottom = this.viewSize / -2;
    this.backgroundCamera.updateProjectionMatrix();
    
    this.interactionPlane.geometry.dispose();
    this.interactionPlane.geometry = new THREE.PlaneGeometry(this.viewSize * aspect, this.viewSize);

    this.backgroundScene.remove(this.imageGrid);
    this.imageGrid = createImageGrid(this.backgroundScene, this.handImageFilenames, this.faceImageFilenames, this.viewSize, aspect);
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.updateRipples(); // Ensure this is called

    this.renderer.setRenderTarget(this.backgroundTexture);
    this.renderer.clear();
    this.renderer.render(this.backgroundScene, this.backgroundCamera);

    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.oceanDistortQuad, this.quadCamera); 
  }
} 