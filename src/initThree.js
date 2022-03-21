import * as THREE from '../node_modules/three/build/three.min.js';
import { EffectComposer } from "../node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../node_modules/three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "../node_modules/three/examples/jsm/postprocessing/ShaderPass.js";
import { ClearPass } from "../node_modules/three/examples/jsm/postprocessing/ClearPass.js";
import { TexturePass } from "../node_modules/three/examples/jsm/postprocessing/TexturePass.js";
import { CopyShader } from "../node_modules/three/examples/jsm/shaders/CopyShader.js";
import {GUI} from '../node_modules/three//examples/jsm/libs/dat.gui.module.js';
import { TrackballControls } from "../node_modules/three/examples/jsm/controls/TrackballControls.js";
import * as advectF from './shader/advect.frag';
import * as divergenceF from './shader/divergence.frag';
import * as jacobiF from './shader/jacobi.frag';
import * as subtractF from './shader/subtractPressureGradient.frag';
import * as kernelV from './shader/kernel.vert';
import * as waterF from './shader/water.frag';
import * as waterV from './shader/water.vert';
import imageData from './img.png';


export default class{
  
  constructor(){
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.container = document.getElementById('c');
    var canvas = document.getElementById('c');
    this.renderer = new THREE.WebGLRenderer({canvas});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth,  window.innerHeight);
    this.renderer.setClearColor(0xeeeeee,0.1);
    this.renderer.alpha = true;
    this.renderer.antialias = true;

    this.clock = new THREE.Clock();
    this.time = 0.0;
    this.mouse = new THREE.Vector2(0,0);
    this.mouse_audio = new THREE.Vector2(0,0);
    this.source = null;
    this.raycaster = new THREE.Raycaster();
    this.x0 = 0;
    this.y0 = 0;
    this.size = 128;
    this.planeSize = 10;
    this.renderTarget = new Array();

    this.rtCamera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );
    this.camera = new THREE.PerspectiveCamera(75, this.w / this.h, 0.001, 1000);
    this.camera.position.z = 10;

    this.fullW = this.visibleWidthAtZDepth(0,this.camera);
    this.fullH = this.visibleHeightAtZDepth(0,this.camera);

    var px = { type : "v2", value : new THREE.Vector2(1 / this.size, 1 / this.size ) };
    
    const image = new Image();
    const texture = new THREE.Texture(image);
    image.onload = () => { 
      texture.needsUpdate = true;
      this.imgW = image.naturalWidth ;
		  this.imgH = image.naturalHeight;
    };
      
    image.src = imageData;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    this.rtScene = new THREE.Scene();
    this.scene = new THREE.Scene();

    this.trackballControls = new TrackballControls(this.camera, canvas);
    
    this.rtPlane = new THREE.PlaneBufferGeometry(2, 2);
    this.plane = new THREE.PlaneBufferGeometry(10, 10, this.size, this.size);
    
    
    var parameter = {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      stencilBuffer: false,
      depthBuffer: true
    };


    for(var i=0;i<10;i++){
      var rt = new THREE.WebGLRenderTarget(this.size, this.size, parameter);
        this.renderTarget.push(rt);
      }

    //shader
    this.advect = new THREE.RawShaderMaterial({
      vertexShader: kernelV,
      fragmentShader: advectF,
      uniforms: {
        uScene: { type: "t", value: this.renderTarget[0].texture },
        px       : px,
        mouse    : { type : "v2", value : new THREE.Vector2(0.5, 0.5) },
        force    : { type : "v2", value : new THREE.Vector2(1, 1) },
        radius   : { type : "f",  value  : 0.05 }
      }
    });

    this.divergence = new THREE.RawShaderMaterial({
      vertexShader: kernelV,
      fragmentShader: divergenceF,
      uniforms: {
        uScene: { type: "t", value: this.renderTarget[1].texture },
        px       : px,
      }
    });

    this.jacobi = new THREE.RawShaderMaterial({
      vertexShader : kernelV,
      fragmentShader : jacobiF,
        uniforms : {
            divergence  : { type : "t", value : this.renderTarget[2].texture },
            px          : px,
            alpha       : { type : "f", value : -1.0 },
            beta        : { type : "f", value : 0.25 },
            uScene    : { type : "t", value : this.renderTarget[3].texture }
        }
    });
    
    this.subtractPressureGradient = new THREE.RawShaderMaterial({
      vertexShader : kernelV,
      fragmentShader : subtractF,
        uniforms : {
            pressure    : { type : "t", value : this.renderTarget[9].texture },
            velocity    : { type : "t", value : this.renderTarget[1].texture },
            px          : px
        }
    });  


    this.shader = new THREE.RawShaderMaterial({
      vertexShader : waterV,
      fragmentShader : waterF,
      
      uniforms : {
        uScene : { type : "t", value : this.renderTarget[9].texture },
        uTex : { type: "t", value: texture },
        uPercent : {type: "f", value: 0.0 },
        uTime : {type: "f", value: null },
        mouse    : { type : "v2", value : new THREE.Vector2(0.5, 0.5) }
      },
      side : THREE.DoubleSide
    });
    

    this.rtMesh = new THREE.Mesh(this.rtPlane, this.advect);
    this.rtMesh.frustumCulled = false;
    this.rtScene.add(this.rtMesh);

    this.mesh = new THREE.Mesh(this.plane, this.shader);
    this.scene.add(this.mesh);
    
    window.addEventListener("resize", function(){
      var w = window.innerWidth;
      var h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }.bind(this))
    
    

  }
  

  mouseMoved(x, y,rect) {
      var mouseX = x - rect.left;
      var mouseY = y - rect.top;
      
      this.mouse.x =  (mouseX / window.innerWidth)  * 2 - 1;
      this.mouse.y = -(mouseY / window.innerHeight) * 2 + 1;

  }

  renderLoop(buffer){
    this.renderer.setRenderTarget(buffer);
    this.renderer.render(this.rtScene,this.rtCamera);
    this.jacobi.uniforms.uScene.value = buffer.texture;
  }
  
  visibleHeightAtZDepth(depth, camera){
    // compensate for cameras not positioned at z=0
    const cameraOffset = camera.position.z;
    if ( depth < cameraOffset ) depth -= cameraOffset;
    else depth += cameraOffset;

    // vertical fov in radians
    const vFOV = camera.fov * Math.PI / 180; 

    // Math.abs to ensure the result is always positive
    return 2 * Math.tan( vFOV / 2 ) * Math.abs( depth );
  }

  visibleWidthAtZDepth(depth, camera){
    const height = this.visibleHeightAtZDepth( depth, camera );
    return height * camera.aspect;
  }


  
  render(now) {
      requestAnimationFrame(() => {
        this.render();
      });

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children);

          if(intersects.length > 0) {
            
            var planeSize = 10;
            var x = (intersects[0].point.x + 10 * 0.5) / 10;
            var y = (intersects[0].point.y + 10 * 0.5) / 10;

            this.advect.uniforms.mouse.value = new THREE.Vector2(x, y);
            this.advect.uniforms.force.value = new THREE.Vector2((x - this.x0) * 300,(y - this.y0) * 300);
            this.shader.uniforms.uPercent.value = x;
            this.shader.uniforms.mouse.value = new THREE.Vector2(x, y);

            this.x0 = x;
            this.y0 = y;

            var pth = (this.mouse.x + this.mouse.y )* 3.0;

            if (this.source instanceof AudioBufferSourceNode) {
              this.source.playbackRate.value = pth;
            }

          } else {
            this.advect.uniforms.force.value = new THREE.Vector2(0, 0);
            this.source.playbackRate.value = 1.0;
            this.shader.uniforms.uPercent.value = 0.0;
          }

var deltaTime = this.clock.getDelta();
this.shader.uniforms.uTime.value = deltaTime;

//advect
this.rtMesh.material = this.advect;
this.renderer.setRenderTarget(this.renderTarget[1]);
this.renderer.render(this.rtScene,this.rtCamera);

//divergence
this.rtMesh.material = this.divergence;
this.renderer.setRenderTarget(this.renderTarget[2]);
this.renderer.render(this.rtScene,this.rtCamera);

//jacobi
this.rtMesh.material = this.jacobi;

var count = 4;
for(var i=0;i<6;i++){
this.renderLoop(this.renderTarget[count]);
count++;
}

//subtract
this.rtMesh.material = this.subtractPressureGradient;
this.renderer.setRenderTarget(this.renderTarget[0]);
this.renderer.render(this.rtScene,this.rtCamera);

//canvas
this.renderer.setRenderTarget(null);
this.renderer.render(this.scene,this.camera);
this.trackballControls.update(deltaTime);
this.shader.uniforms.uPercent.value = 0.0;

}
  
}