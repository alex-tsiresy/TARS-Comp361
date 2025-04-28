import * as THREE from 'three';

/**
 * TerrainObjectManager - Manages objects placed on the terrain
 * Extracted from TerrainRenderer to better separate concerns
 */
class TerrainObjectManager {
  constructor(scene, terrainRenderer) {
    this.scene = scene;
    this.terrainRenderer = terrainRenderer;
    this.objects = [];
  }
  
  /**
   * Add ambient objects to the terrain for visual reference
   */
  addAmbientObjects() {
    console.log('Adding simplified ambient objects to terrain...');
    
    // Add a large platform at the center for reference
    this.addCentralPlatform();
    
    // Add rocks scattered around the terrain
    this.addRocks(5);
    
  }
  
  addCentralPlatform() {
    const platformGeometry = new THREE.BoxGeometry(50, 10, 50);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x220000,
      emissiveIntensity: 0.5
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, 5, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.scene.add(platform);
    this.objects.push(platform);
    console.log('Added central platform at (0, 5, 0)');
  }
  
  addRocks(count) {
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 30 + 10;
      const x = (Math.random() - 0.5) * 1800;
      const z = (Math.random() - 0.5) * 1800;
      const y = this.terrainRenderer.getHeightAtPosition(x, z);
      
      const rockGeometry = new THREE.SphereGeometry(size, 6, 4);
      const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true
      });
      
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(x, y + size / 2, z);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
      this.objects.push(rock);
    }
  }
  
  addDirectionalBeacons() {
    const beaconColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    const positions = [
      {x: 500, z: 0, label: 'East'},    // East
      {x: 0, z: 500, label: 'North'},   // North
      {x: -500, z: 0, label: 'West'},   // West
      {x: 0, z: -500, label: 'South'}   // South
    ];
    
    for (let i = 0; i < 4; i++) {
      const {x, z, label} = positions[i];
      const y = this.terrainRenderer.getHeightAtPosition(x, z);
      const color = beaconColors[i];
      
      const beacon = this.createDirectionMarker(color, label);
      beacon.position.set(x, y + 20, z);
      this.scene.add(beacon);
      this.objects.push(beacon);
    }
  }
  
  /**
   * Create a direction marker with the specified color
   */
  createDirectionMarker(color, label) {
    const group = new THREE.Group();
    
    // Create arrow
    const arrowHeight = 30;
    const coneGeometry = new THREE.ConeGeometry(5, 15, 8);
    const coneMaterial = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color,
      emissiveIntensity: 0.5
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = arrowHeight / 2;
    cone.rotation.x = Math.PI;
    group.add(cone);
    
    // Create shaft
    const cylinderGeometry = new THREE.CylinderGeometry(2, 2, arrowHeight, 8);
    const cylinder = new THREE.Mesh(cylinderGeometry, coneMaterial);
    cylinder.position.y = -arrowHeight / 2;
    group.add(cylinder);
    
    return group;
  }
  
  /**
   * Add a grid helper to the scene
   */
  addGridHelper() {
    const gridHelper = new THREE.GridHelper(this.terrainRenderer.terrainSize, 20, 0x555555, 0x333333);
    gridHelper.position.y = 1; // Slightly above terrain
    this.scene.add(gridHelper);
    this.objects.push(gridHelper);
    return gridHelper;
  }
  
  /**
   * Clean up all objects managed by this class
   */
  dispose() {
    this.objects.forEach(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
      this.scene.remove(object);
    });
    this.objects = [];
  }
}

export default TerrainObjectManager; 