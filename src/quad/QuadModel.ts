
import * as THREE from 'three';
var CANNON = require('cannon');

const MODEL_INFO = {
  centerRadius: 0.25,
  centerMass: 10,
  engineRadius: 0.25,
  engineMass: 4,
  engineOffsetX: 0.8 + Math.sqrt(6 * 0.1 * 0.1),
  engineOffsetZ: 0.8 + Math.sqrt(6 * 0.1 * 0.1),
  engineColor: 0x327732,
  bodyColor: 0x323244
};

export class QuadModel{

  public static MODEL_INFO = MODEL_INFO;

  public mesh: THREE.Object3D;
  public engines: THREE.Object3D[] = [];
  public arrows: THREE.Object3D[] = [];
  public body;
  public camera1st; // 1st person camera
  public camera3rd; // 3rd person camera

  constructor() {
    this.makeMesh();
    this.makeBody();
  }

  makeMesh() {
    this.mesh = new THREE.Group();

    var bodyGeo = new THREE.SphereGeometry(MODEL_INFO.centerRadius, 16, 16);
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x323244 });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true; body.receiveShadow = true;
    this.mesh.add(body);

    var arm1Geo = new THREE.CylinderGeometry(0.05, 0.05, Math.sqrt(6), 16);
    var arm1Mat = new THREE.MeshLambertMaterial({ color: 0x323244 });
    var arm1 = new THREE.Mesh(arm1Geo, arm1Mat);
    arm1.rotation.x = Math.PI / 2;
    arm1.rotation.z = Math.PI / 4;
    arm1.castShadow = true; arm1.receiveShadow = true;
    this.mesh.add(arm1);

    var arm2 = new THREE.Mesh(arm1Geo, arm1Mat);
    arm2.rotation.x = Math.PI / 2;
    arm2.rotation.z = -Math.PI / 4;
    arm2.castShadow = true; arm2.receiveShadow = true;
    this.mesh.add(arm2);

    var propGeo = new THREE.TorusGeometry(MODEL_INFO.engineRadius, 0.05, 16, 16);

    var prop1Mat = new THREE.MeshLambertMaterial({ color: 0x327732 });
    var engine1 = new THREE.Mesh(propGeo, prop1Mat);
    engine1.rotation.x = Math.PI / 2;
    engine1.scale.z = 2.25;
    engine1.position.x = MODEL_INFO.engineOffsetX;
    engine1.position.z = MODEL_INFO.engineOffsetZ;
    engine1.castShadow = true; engine1.receiveShadow = true;
    this.mesh.add(engine1);
    this.engines.push(engine1);

    var prop2Mat = new THREE.MeshLambertMaterial({ color: 0x327732 });
    var engine2 = new THREE.Mesh(propGeo, prop2Mat);
    engine2.rotation.x = Math.PI / 2;
    engine2.scale.z = 2.25;
    engine2.position.x = MODEL_INFO.engineOffsetX;
    engine2.position.z = -MODEL_INFO.engineOffsetZ;
    engine2.castShadow = true; engine2.receiveShadow = true;
    this.mesh.add(engine2);
    this.engines.push(engine2);

    var prop3Mat = new THREE.MeshLambertMaterial({ color: 0x327732 });
    var engine3 = new THREE.Mesh(propGeo, prop3Mat);
    engine3.rotation.x = Math.PI / 2;
    engine3.scale.z = 2.25;
    engine3.position.x = -MODEL_INFO.engineOffsetX;
    engine3.position.z = -MODEL_INFO.engineOffsetZ;
    engine3.castShadow = true; engine3.receiveShadow = true;
    this.mesh.add(engine3);
    this.engines.push(engine3);

    var prop4Mat = new THREE.MeshLambertMaterial({ color: 0x327732 });
    var engine4 = new THREE.Mesh(propGeo, prop4Mat);
    engine4.rotation.x = Math.PI / 2;
    engine4.scale.z = 2.25;
    engine4.position.x = -MODEL_INFO.engineOffsetX;
    engine4.position.z = MODEL_INFO.engineOffsetZ;
    engine4.castShadow = true; engine4.receiveShadow = true;
    this.mesh.add(engine4);
    this.engines.push(engine4);

    // Add engine arrows
    var engi1Arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xff0000);
    engi1Arrow.position.x = MODEL_INFO.engineOffsetX;
    engi1Arrow.position.z = MODEL_INFO.engineOffsetZ;
    this.mesh.add(engi1Arrow);
    this.arrows.push(engi1Arrow);

    var engi2Arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xff0000);
    engi2Arrow.position.x = MODEL_INFO.engineOffsetX;
    engi2Arrow.position.z = -MODEL_INFO.engineOffsetZ;
    this.mesh.add(engi2Arrow);
    this.arrows.push(engi2Arrow);

    var engi3Arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xff0000);
    engi3Arrow.position.x = -MODEL_INFO.engineOffsetX;
    engi3Arrow.position.z = -MODEL_INFO.engineOffsetZ;
    this.mesh.add(engi3Arrow);
    this.arrows.push(engi3Arrow);

    var engi4Arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xff0000);
    engi4Arrow.position.x = -MODEL_INFO.engineOffsetX;
    engi4Arrow.position.z = MODEL_INFO.engineOffsetZ;
    this.mesh.add(engi4Arrow);
    this.arrows.push(engi4Arrow);

    // CAMERA!
    var SCREEN_WIDTH = window.innerWidth;
    var SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 75; //90;
    var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
    var NEAR = 0.001, FAR = 20000;
    this.camera1st = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    this.camera1st.position.set(0, 0, -0.5);
    this.camera1st.lookAt(new THREE.Vector3(0, 0, -2));
    //WORLD.scene.add(this.camera1st);
    this.mesh.add(this.camera1st);

    // CAMERA 2 !!
    {
      var SCREEN_WIDTH = window.innerWidth;
      var SCREEN_HEIGHT = window.innerHeight;
      var VIEW_ANGLE = 60; //90;
      var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
      var NEAR = 0.001, FAR = 20000;
      this.camera3rd = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
      this.camera3rd.position.set(0, 2, 4);
      this.camera3rd.lookAt(new THREE.Vector3(0, 0, -3));
      this.mesh.add(this.camera3rd);
    }
  }

  makeBody(){
    var quadBody = new CANNON.Body({ mass: MODEL_INFO.centerMass });

    var sphereShape = new CANNON.Sphere(MODEL_INFO.centerRadius);
    quadBody.addShape(sphereShape);

    var engineShape = new CANNON.Sphere(MODEL_INFO.engineRadius);
    quadBody.addShape(engineShape, new CANNON.Vec3( MODEL_INFO.engineOffsetX, 0,  MODEL_INFO.engineOffsetZ));
    quadBody.addShape(engineShape, new CANNON.Vec3( MODEL_INFO.engineOffsetX, 0, -MODEL_INFO.engineOffsetZ));
    quadBody.addShape(engineShape, new CANNON.Vec3(-MODEL_INFO.engineOffsetX, 0, -MODEL_INFO.engineOffsetZ));
    quadBody.addShape(engineShape, new CANNON.Vec3(-MODEL_INFO.engineOffsetX, 0,  MODEL_INFO.engineOffsetZ));

    quadBody.position.set(0, 0, 0);
    this.body = quadBody;
  }

}
