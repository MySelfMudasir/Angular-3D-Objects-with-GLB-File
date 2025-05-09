import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'lil-gui';

@Component({
  selector: 'app-three-skinning',
  templateUrl: './three-skinning.component.html',
  styleUrls: ['./three-skinning.component.css'],
})
export class ThreeSkinningComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private mixer!: THREE.AnimationMixer;
  private stats!: Stats;

  private model: THREE.Object3D | undefined;
  private skeleton: THREE.SkeletonHelper | undefined;
  private allActions: THREE.AnimationAction[] = [];
  private baseActions: any = {
    idle: { weight: 1 },
    walk: { weight: 0 },
    run: { weight: 0 },
  };
  private additiveActions: any = {
    sneak_pose: { weight: 0 },
    sad_pose: { weight: 0 },
    agree: { weight: 0 },
    headShake: { weight: 0 },
  };
  private currentBaseAction = 'idle';
  private panelSettings: any = { 'modify time scale': 1.0 };
  private crossFadeControls: any[] = [];
  private numAnimations = 0;

  private animationFrameId: number = 0;

  ngAfterViewInit(): void {
    this.initScene();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.renderer.dispose();
  }

  private initScene(): void {
    const container = this.containerRef.nativeElement;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0a0a0);
    this.scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(3, 10, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Ground
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      100
    );
    this.camera.position.set(-1, 2, 3);

    // Controls
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.target.set(0, 1, 0);
    controls.update();

    // Stats
    this.stats = Stats();
    container.appendChild(this.stats.dom);

    // Load Model
    const loader = new GLTFLoader();
    loader.load('assets/models/Xbot.glb', (gltf) => {
      this.model = gltf.scene;
      this.scene.add(this.model);

      this.model.traverse((object: any) => {
        if (object.isMesh) object.castShadow = true;
      });

      this.skeleton = new THREE.SkeletonHelper(this.model);
      this.skeleton.visible = false;
      this.scene.add(this.skeleton);

      const animations = gltf.animations;
      this.mixer = new THREE.AnimationMixer(this.model);
      this.numAnimations = animations.length;

      for (let i = 0; i !== this.numAnimations; ++i) {
        let clip = animations[i];
        const name = clip.name;

        if (this.baseActions[name]) {
          const action = this.mixer.clipAction(clip);
          this.activateAction(action);
          this.baseActions[name].action = action;
          this.allActions.push(action);
        } else if (this.additiveActions[name]) {
          THREE.AnimationUtils.makeClipAdditive(clip);

          if (clip.name.endsWith('_pose')) {
            clip = THREE.AnimationUtils.subclip(clip, clip.name, 2, 3, 30);
          }

          const action = this.mixer.clipAction(clip);
          this.activateAction(action);
          this.additiveActions[name].action = action;
          this.allActions.push(action);
        }
      }

      this.createGUI();
      this.animate();
    });

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private createGUI(): void {
    const gui = new GUI({ width: 310 });
    const baseNames = ['None', ...Object.keys(this.baseActions)];

    const folder1 = gui.addFolder('Base Actions');
    const folder2 = gui.addFolder('Additive Action Weights');
    const folder3 = gui.addFolder('General Speed');

    baseNames.forEach((name) => {
      const settings = this.baseActions[name];
      this.panelSettings[name] = () => {
        const current = this.baseActions[this.currentBaseAction]?.action;
        const next = settings?.action;
        if (current !== next) this.prepareCrossFade(current, next, 0.35);
      };
      const control = folder1.add(this.panelSettings, name);
      this.crossFadeControls.push(control);
    });

    Object.keys(this.additiveActions).forEach((name) => {
      const settings = this.additiveActions[name];
      this.panelSettings[name] = settings.weight;
      folder2
        .add(this.panelSettings, name, 0.0, 1.0, 0.01)
        .listen()
        .onChange((weight: number) => {
          this.setWeight(settings.action, weight);
          settings.weight = weight;
        });
    });

    folder3
      .add(this.panelSettings, 'modify time scale', 0.0, 1.5, 0.01)
      .onChange((speed: number) => {
        this.mixer.timeScale = speed;
      });

    folder1.open();
    folder2.open();
    folder3.open();
  }

  private activateAction(action: THREE.AnimationAction): void {
    const clip = action.getClip();
    const settings = this.baseActions[clip.name] || this.additiveActions[clip.name];
    this.setWeight(action, settings.weight);
    action.play();
  }

  private setWeight(action: THREE.AnimationAction, weight: number): void {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
  }

  private prepareCrossFade(start: any, end: any, duration: number): void {
    if (this.currentBaseAction === 'idle' || !start || !end) {
      this.executeCrossFade(start, end, duration);
    } else {
      this.mixer.addEventListener('loop', function onLoopFinished(e) {
        if (e.action === start) {
          this.mixer.removeEventListener('loop', onLoopFinished);
          this.executeCrossFade(start, end, duration);
        }
      }.bind(this));
    }

    this.currentBaseAction = end?.getClip().name || 'None';
  }

  private executeCrossFade(start: any, end: any, duration: number): void {
    if (end) {
      this.setWeight(end, 1);
      end.time = 0;
      if (start) {
        start.crossFadeTo(end, duration, true);
      } else {
        end.fadeIn(duration);
      }
    } else {
      start.fadeOut(duration);
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.update
