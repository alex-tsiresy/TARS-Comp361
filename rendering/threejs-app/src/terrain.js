import * as THREE from 'three';

export class TerrainManager {
    constructor(scene) {
        this.scene = scene;
        this.terrainMesh = null;
        this.heightCanvas = document.createElement('canvas');
        this.heightContext = this.heightCanvas.getContext('2d');
        this.heightmapData = null;
    }

    loadTerrain(textureLoader) {
        // Load textures
        const marsColorTexture = textureLoader.load('rock01.jpg');
        const marsNormalTexture = textureLoader.load('rock02.jpg');

        // Configure texture wrapping
        marsColorTexture.wrapS = marsColorTexture.wrapT = THREE.RepeatWrapping;
        marsNormalTexture.wrapS = marsNormalTexture.wrapT = THREE.RepeatWrapping;
        marsColorTexture.repeat.set(50, 50);
        marsNormalTexture.repeat.set(50, 50);

        // Load heightmap
        textureLoader.load(
            '/out.png',
            (heightmapTexture) => {
                heightmapTexture.minFilter = THREE.LinearFilter;
                this.setupHeightmap(heightmapTexture);
                this.createTerrain(marsColorTexture, marsNormalTexture, heightmapTexture);
            },
            undefined,
            (error) => console.error('Error loading heightmap:', error)
        );
    }

    setupHeightmap(heightmapTexture) {
        const img = heightmapTexture.image;
        this.heightCanvas.width = img.width;
        this.heightCanvas.height = img.height;
        this.heightContext.drawImage(img, 0, 0);
        this.heightmapData = this.heightContext.getImageData(0, 0, img.width, img.height).data;
    }

    createTerrain(marsColorTexture, marsNormalTexture, heightmapTexture) {
        const terrainWidth = 2000;
        const terrainHeight = 2000;
        const segments = 1024;

        const geometry = new THREE.PlaneGeometry(terrainWidth, terrainHeight, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        const material = this.createTerrainMaterial(marsColorTexture, marsNormalTexture, heightmapTexture);
        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.castShadow = true;
        this.terrainMesh.receiveShadow = true;
        this.scene.add(this.terrainMesh);
    }

    createTerrainMaterial(marsColorTexture, marsNormalTexture, heightmapTexture) {
        const material = new THREE.MeshStandardMaterial({
            map: marsColorTexture,
            normalMap: marsNormalTexture,
            displacementMap: heightmapTexture,
            displacementScale: 300,
            roughness: 1.0,
            metalness: 0.0
        });

        material.onBeforeCompile = (shader) => {
            shader.fragmentShader = `
                uniform float nearDistance;
                uniform float farDistance;
                uniform vec3 plainColor;
                ${shader.fragmentShader}
            `;

            shader.uniforms.nearDistance = { value: 50.0 };
            shader.uniforms.farDistance = { value: 500.0 };
            shader.uniforms.plainColor = { value: new THREE.Color("orange") };

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                    float d = length(vViewPosition);
                    float blendFactor = smoothstep(nearDistance, farDistance, d);
                    float lum = dot(gl_FragColor.rgb, vec3(0.3333));
                    vec3 litPlainColor = plainColor * lum;
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, litPlainColor, blendFactor);
                    #include <dithering_fragment>
                `
            );
        };

        return material;
    }

    getHeightAtPosition(x, z) {
        if (!this.heightmapData) return 0;

        const halfWidth = 1000;
        const halfHeight = 1000;
        
        const u = ((x + halfWidth) / 2000) * this.heightCanvas.width;
        const v = ((z + halfHeight) / 2000) * this.heightCanvas.height;
        
        const px = Math.floor(Math.max(0, Math.min(this.heightCanvas.width - 1, u)));
        const py = Math.floor(Math.max(0, Math.min(this.heightCanvas.height - 1, v)));
        
        const index = (py * this.heightCanvas.width + px) * 4;
        const height = this.heightmapData[index] / 255.0;
        
        return height * 300;
    }
}
