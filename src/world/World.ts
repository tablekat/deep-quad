
var CANNON = require('cannon');
import * as THREE from 'three';
import { Quad } from '../quad/QuadPhys';
import { QuadBrain } from '../quad/QuadBrain';

declare var $;

export class World {

  public container;
  public scene;
  public camera;
  public renderer;
  public cannonWorld;

  public quad: Quad;
  public quadBrain: QuadBrain;
  public indicator;

  public timer = 0;
  public fpsLastUpdated = Date.now();
  public fpsFrameCount = 0;
  public fps = 0;
  private previousScores = null;

  constructor() {
    this.container = document.getElementById("main");
    this.initCannon();
    this.setupScene();

    this.quad = new Quad();
    this.cannonWorld.add(this.quad.model.body);
    this.scene.add(this.quad.model.mesh);

    this.quadBrain = new QuadBrain(this.quad);

    this.render();
  }

  private render() {
    var n = Date.now();
    this.fpsFrameCount++;
    if(n - this.fpsLastUpdated >= 1000){
      this.fpsLastUpdated = n;
      this.fps = this.fpsFrameCount;
      this.fpsFrameCount = 0;
      $("#fps").text(this.fps + " fps");
    }

    var dt = 1/Math.max(30, this.fps);

    this.quadBrain.forward(); // Updated quad with neural network
    this.quad.update();
    this.cannonWorld.step(dt);
    this.quadBrain.backward(); // Feed back changes to neural network

    this.updateWorld();
    this.updateDiagnostics();

    this.renderer.render(this.scene, this.camera);
    //this.renderer.render(this.scene, this.quad.model.camera3rd);

    requestAnimationFrame(() => this.render());
  }

  private updateDiagnostics(){
    //{ overallScore, rotateSpeedScore, angleScore, speedScore, heightScore, isDeadSignal }
    let scores = <any>this.quadBrain.scoreFunction(true);
    let keys = Object.keys(scores);
    keys.map(key => {
      let $elem = $(`#score-${key}`);
      $elem.find(".score-value").text(scores[key].toFixed(2));
      this.setScoreMeter($elem, scores[key]);
    });
  }
  private setScoreMeter($elem, value){
    let leftPerc, rightPerc; // 0 = center, 1 = at respective edge

    if(value < 0){
      rightPerc = 0;
      leftPerc = Math.min(1, -value);
    }else{
      leftPerc = 0;
      rightPerc = Math.min(1, value);
    }

    $elem.find(".score-bg").css({
      left: (50 - leftPerc * 50) + '%',
      right: (50 - rightPerc * 50) + '%',
    })
  }

  /**
   *  Setup the THREEjs scene
   */
  private setupScene() {
    // SCENE!
    this.scene = new THREE.Scene();

    // CAMERA!
    var SCREEN_WIDTH = this.container.offsetWidth; //clientWidth
    var SCREEN_HEIGHT = this.container.offsetHeight;
    var VIEW_ANGLE = 45;
    var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
    var NEAR = 0.1, FAR = 20000;
    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    //this.camera.position.set(0, 1, 5);
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(this.scene.position);
    this.scene.add(this.camera);

    this.scene.fog = new THREE.Fog( 0xd1d1ef, 50, 10000 );

    // RENDERER
    // this.renderer = new THREE.WebGLRenderer({ canvas: this.hiddencanvas, alpha: true, antialias: true });
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.container.append(this.renderer.domElement);

    // LIGHT
    var ambient = new THREE.AmbientLight(0x222222);
    this.scene.add( ambient );
    var light = new THREE.PointLight(0xffffff);
    light.position.set(50, 50, 50);
    this.scene.add(light);


    // FLOOR
    var floorTexture = new (<any>THREE).ImageUtils.loadTexture("static/checkerboard.jpg");
    //var floorTexture = new THREE.ImageUtils.loadTexture("static/concrete.jpg");
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    //floorTexture.repeat.set(10, 10);
    floorTexture.repeat.set(80, 80);
    var floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture, side: THREE.DoubleSide });
    //var floorGeometry = new THREE.PlaneGeometry(40, 40, 10, 10);
    var floorGeometry = new THREE.PlaneGeometry(400, 400, 10, 10);
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -1;
    floor.rotation.x = Math.PI / 2;
    this.scene.add(floor);

    // INDICATOR AND STUFFS
    var indiMat = new THREE.MeshLambertMaterial({ color: 0x880000 });
    var indiGeo = new THREE.CubeGeometry(0.1, 0.1, 0.1);
    this.indicator = new THREE.Mesh(indiGeo, indiMat);
    this.indicator.position.x = 0; // start position in Phy
    this.indicator.position.y = -1;
    this.scene.add(this.indicator);

    // SKYBOX?
    var skyboxTex = new (<any>THREE).ImageUtils.loadTexture("static/nightsky.jpg");
    var skyboxMat = new THREE.MeshBasicMaterial( { map: skyboxTex, side: THREE.DoubleSide } );
    var skyboxGeo = new THREE.SphereGeometry(5000, 64, 64);
    var skybox = new THREE.Mesh(skyboxGeo, skyboxMat);
    this.scene.add(skybox);
  }

  /**
   *  Initialize the CANNONjs world!
   */
  private initCannon(){
    this.cannonWorld = new CANNON.World();
    this.cannonWorld.quatNormalizeSkip = 0;
    this.cannonWorld.quatNormalizeFast = false;

    this.cannonWorld.defaultContactMaterial.contactEquationStiffness = 1e9;
    this.cannonWorld.defaultContactMaterial.contactEquationRelaxation = 4;

    var solver = new CANNON.GSSolver();
    solver.iterations = 7;
    solver.tolerance = 0.1;
    var split = true;
    if(split)
      this.cannonWorld.solver = new CANNON.SplitSolver(solver);
    else
      this.cannonWorld.solver = solver;

    this.cannonWorld.gravity.set(0, -20 ,0);
    this.cannonWorld.broadphase = new CANNON.NaiveBroadphase();

    // Create a slippery material (friction coefficient = 0.0)
    var physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial,
      {
        friction: 2.0, // 0.0
        restitution: 0.3
      });

    this.cannonWorld.addContactMaterial(physicsContactMaterial);

    // Floor!
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), - Math.PI / 2);
    groundBody.position.y = -1;
    this.cannonWorld.addBody(groundBody);
  }


  /**
   *  Update the THREEjs world with the CANNONjs coordinates.
   */
  updateWorld(){

    // for(var i=0; i < WORLD.trees.length; ++i){
    //   var plane1 = WORLD.trees[i][0];
    //   var plane2 = WORLD.trees[i][1];
    //   var treeBody = WORLD.trees[i][2];
    //
    //   plane1.position.copy(treeBody.position);
    //   plane1.quaternion.copy(treeBody.quaternion);
    //   plane1.rotateY(Math.PI / 4);
    //   plane2.position.copy(treeBody.position);
    //   plane2.quaternion.copy(treeBody.quaternion);
    //   plane2.rotateY(-Math.PI / 4);
    // }

    // for(var i=0; i < WORLD.bombs.length; ++i){
    //   var bombSprite = WORLD.bombs[i][0];
    //   var bombBody = WORLD.bombs[i][1];
    //
    //   bombSprite.position.copy(bombBody.position);
    //   bombSprite.quaternion.copy(bombBody.quaternion);
    // }

    // for(var i=0; i < WORLD.boxes.length; ++i){
    //   var boxObj = WORLD.boxes[i][0];
    //   var boxBody = WORLD.boxes[i][1];
    //
    //   boxObj.position.copy(boxBody.position);
    //   boxObj.quaternion.copy(boxBody.quaternion);
    // }

  }

}
