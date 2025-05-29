import * as THREE from 'three';

// Function to create the Three.js image grid (moved here or could be a utility)
function createImageGrid(scene, imageFilenames, cameraViewSize, cameraAspect) {
  const textureLoader = new THREE.TextureLoader();
  const imageGridGroup = new THREE.Group();
  imageGridGroup.name = "ImageGrid";

  const portraitAspect = 3 / 5; // 3:5 aspect ratio
  const tileHeight = cameraViewSize / 2.5; // Adjust number of rows visible (e.g., 2.5 rows)
  const tileWidth = tileHeight * portraitAspect;
  
  const numCols = Math.ceil(cameraViewSize * cameraAspect / tileWidth) + 1;
  const numRows = Math.ceil(cameraViewSize / tileHeight) + 1;

  const totalGridWidth = numCols * tileWidth;
  const totalGridHeight = numRows * tileHeight; // For centering calculations

  // Center the grid
  const startX = -totalGridWidth / 2 + tileWidth / 2;
  const startY = totalGridHeight / 2 - tileHeight / 2;

  // Robust path joining for assets
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, ''); // Ensure no trailing slash from BASE_URL

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const imageIndex = (r * numCols + c) % imageFilenames.length;
      const filename = imageFilenames[imageIndex];
      // Ensure no leading slash on filename from the array, then combine with baseUrl
      const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
      const imageUrl = `${baseUrl}/${cleanFilename}`;
      console.log("[DEBUG] Loading image texture from:", imageUrl); // Log the exact URL being loaded
      const texture = textureLoader.load(imageUrl);
      // texture.colorSpace = THREE.SRGBColorSpace; // Temporarily commented out for testing darkening
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: false });
      const geometry = new THREE.PlaneGeometry(tileWidth, tileHeight);
      const plane = new THREE.Mesh(geometry, material);
      plane.position.set(startX + c * tileWidth, startY - r * tileHeight, -1);
      imageGridGroup.add(plane);
    }
  }
  scene.add(imageGridGroup);
  return imageGridGroup;
}

export class Ocean {
  constructor(canvas, imageFilenames) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.imageFilenames = imageFilenames;

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
    this.imageGrid = createImageGrid(this.backgroundScene, this.imageFilenames, this.viewSize, aspect);
    
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
    this.imageGrid = createImageGrid(this.backgroundScene, this.imageFilenames, this.viewSize, aspect);
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