
import { QuadModel } from './QuadModel';
import * as THREE from 'three';
var CANNON = require('cannon');

export class Quad {

  public model: QuadModel;

  public floor = -1 + 0.2;
  public engineOffset = 0.8 + Math.sqrt(6 * 0.1 * 0.1); //0.5 + Math.sqrt(2 * 0.1 * 0.1); // ???? why is this different from the quadmodel...

  public engineIncrement = 0.005; //0.05; // How much to change engine power when using single tick controls
  public enginePower = [0, 0, 0, 0]; // 0..1
  private pastVels = [];
  public velocity = new THREE.Vector3(0, 0, 0); // Average velocity over last 5? ticks.
  private pastAngularVelocity = [];
  public angularVelocity = new THREE.Vector3(0, 0, 0); // Average angulra velocity over last 5? ticks. !!!!!!: pitch, yaw, roll = x, y, z
  public roll: number;
  public pitch: number;
  public yaw: number;

  constructor(){
    this.model = new QuadModel();
  }

  public update() {
    this.applyEngineForce();

    this.model.mesh.position.copy(this.model.body.position);
    this.model.mesh.quaternion.copy(this.model.body.quaternion);
  }

  public setEnginePower(engine: number, power: number){
    if(power < 0) power = 0;
    if(power > 1) power = 1;
    this.enginePower[engine] = power;
  }

  public increasePower(engine: number){
    this.enginePower[engine] += this.engineIncrement;
    if(this.enginePower[engine] > 1) this.enginePower[engine] = 1;
  }
  public decreasePower(engine: number){
    this.enginePower[engine] -= this.engineIncrement;
    if(this.enginePower[engine] < 0) this.enginePower[engine] = 0;
  }

  private applyEngineForce() {
    var engOffsetX = QuadModel.MODEL_INFO.engineOffsetX;
    var engOffsetZ = QuadModel.MODEL_INFO.engineOffsetZ;
    var dt = 1/60;
    var fScale = 8000; // engine strength

    var eng1Point = new CANNON.Vec3(engOffsetX, 0, engOffsetZ);
    var eng1Impulse = new CANNON.Vec3(0, fScale * this.enginePower[0] * dt, 0);
    var eng2Point = new CANNON.Vec3(engOffsetX, 0, -engOffsetZ);
    var eng2Impulse = new CANNON.Vec3(0, fScale * this.enginePower[1] * dt, 0);
    var eng3Point = new CANNON.Vec3(-engOffsetX, 0, -engOffsetZ);
    var eng3Impulse = new CANNON.Vec3(0, fScale * this.enginePower[2] * dt, 0);
    var eng4Point = new CANNON.Vec3(-engOffsetX, 0, engOffsetZ);
    var eng4Impulse = new CANNON.Vec3(0, fScale * this.enginePower[3] * dt, 0);
    this.model.body.applyLocalForce(eng1Impulse, eng1Point);
    this.model.body.applyLocalForce(eng2Impulse, eng2Point);
    this.model.body.applyLocalForce(eng3Impulse, eng3Point);
    this.model.body.applyLocalForce(eng4Impulse, eng4Point);
    /*this.model.body.applyLocalImpulse(eng1Impulse, eng1Point); // var fScale = 160;
    this.model.body.applyLocalImpulse(eng2Impulse, eng2Point);
    this.model.body.applyLocalImpulse(eng3Impulse, eng3Point);
    this.model.body.applyLocalImpulse(eng4Impulse, eng4Point);*/

    // Auto yaw!!
    // var yawPower = -this.engineYaw * 1000;
    // var ycos = Math.cos(Math.PI / 4);
    // var ysin = Math.sin(Math.PI / 4);
    // var yaw1Impulse = new CANNON.Vec3(yawPower * -ycos, 0, yawPower * ysin);
    // var yaw2Impulse = new CANNON.Vec3(yawPower * ycos, 0, yawPower * -ysin);
    // this.model.body.applyLocalForce(yaw1Impulse, eng1Point);
    // this.model.body.applyLocalForce(yaw2Impulse, eng3Point);

    ////////////////

    // Set new velocities!
    this.pastVels.unshift(this.model.body.velocity.clone());
    this.pastVels.length = Math.min(5, this.pastVels.length);

    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    for(var i=0; i < this.pastVels.length; ++i){
      this.velocity.x += this.pastVels[i].x / this.pastVels.length;
      this.velocity.y += this.pastVels[i].y / this.pastVels.length;
      this.velocity.z += this.pastVels[i].z / this.pastVels.length;
    }

    // Set new angular velocities!
    var localVelocity = new CANNON.Quaternion().setFromEuler(this.model.body.angularVelocity.x, this.model.body.angularVelocity.y, this.model.body.angularVelocity.z, "YZX");
    localVelocity = localVelocity.mult(this.model.body.quaternion);
    var localVeEuler = new CANNON.Vec3();
    localVelocity.toEuler(localVeEuler, "YZX");
    this.pastAngularVelocity.unshift(localVeEuler);
    this.pastAngularVelocity.length = Math.min(5, this.pastAngularVelocity.length);

    this.angularVelocity.x = 0;
    this.angularVelocity.y = 0;
    this.angularVelocity.z = 0;
    for(var i=0; i < this.pastAngularVelocity.length; ++i){
      this.angularVelocity.z += this.pastAngularVelocity[i].z / this.pastAngularVelocity.length;
      this.angularVelocity.x += this.pastAngularVelocity[i].x / this.pastAngularVelocity.length;
      this.angularVelocity.y += this.pastAngularVelocity[i].y / this.pastAngularVelocity.length;
    }
    this.angularVelocity.z = this.wrapAngle(this.angularVelocity.z); // TODO: shouldn't these not be clamping, and instead wrapping........................?
    this.angularVelocity.x = this.wrapAngle(this.angularVelocity.x);
    this.angularVelocity.y = this.wrapAngle(this.angularVelocity.y);

    // Set new rotations
    var rotation = new THREE.Euler().setFromQuaternion(this.model.body.quaternion, "YZX");
    this.pitch = this.wrapAngle(rotation.x);
    this.yaw = this.wrapAngle(rotation.y);
    this.roll = this.wrapAngle(rotation.z);

    // update arrow graphics
    for(var i=0; i < 4; ++i){
      this.model.arrows[i].scale.y = this.enginePower[i];
    }
  }
  private wrapAngle(x){
    while(x < -Math.PI) x += Math.PI;
    while(x >  Math.PI) x -= Math.PI;
    return x;
  }

  public upright() {
    this.model.body.quaternion.x = 0;
    this.model.body.quaternion.y = 0;
    this.model.body.quaternion.z = 0;
    this.model.body.quaternion.w = 1;
    this.model.body.angularVelocity.x = 0;
    this.model.body.angularVelocity.y = 0;
    this.model.body.angularVelocity.z = 0;
  }
}
