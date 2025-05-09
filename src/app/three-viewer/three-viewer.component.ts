import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.css'],
})
export class ThreeViewerComponent implements OnInit, AfterViewInit {
  @ViewChild('canvasContainer', { static: true }) canvasRef!: ElementRef;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private model: THREE.Object3D | null = null;

  constructor() {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initScene();
    this.animate();
  }

  initScene() {
    const container = this.canvasRef.nativeElement;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 2;

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 1, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 10, 10);
    this.scene.add(dirLight);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Load Model
    const loader = new GLTFLoader();
    loader.load('cup.glb', (gltf) => {
      this.model = gltf.scene;
      this.model.scale.set(1, 1, 1);
      this.model.position.set(0, -0.5, 0);
      this.model.rotation.y = Math.PI;
      this.scene.add(this.model);
    });
    
  }

  animate = () => {
    requestAnimationFrame(this.animate);
  
    // ✅ Rotate if the model is loaded
    // if (this.model) {
    //   this.model.rotation.y += 0.01;
    // }
  
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
  
}
