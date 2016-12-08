
import { Quad } from './QuadPhys';
const convnet = require('convnet');
const deepqlearn = convnet.deepqlearn;
// http://cs.stanford.edu/people/karpathy/convnetjs/demo/rldemo.html

export class QuadBrain {

  public brain;
  private timer = 0;
  private ticksDead = null;
  private isDeadSignal = 0;
  private scoreAsOfForward = null;

  constructor(public quad: Quad){
    this.setupBrain();
    (<any>window).savenet = () => this.savenet();
    (<any>window).loadnet = (t) => this.loadnet(t);
  }

  public forward() {
    this.timer++;
    let brainInput = [
      this.quad.velocity.x,
      this.quad.velocity.y,
      this.quad.angularVelocity.x,     // dpitch
      this.quad.angularVelocity.z,     // droll
      this.quad.pitch,
      this.quad.roll,
      this.quad.model.mesh.position.y, // height
      ...this.quad.enginePower,
    ];

    this.scoreAsOfForward = this.scoreFunctionBad();

    let actionId = this.brain.forward(brainInput);
    let engineId = Math.floor(actionId / 2); // engineId: 0..3
    if(actionId % 2 == 0){ // let actions 0, 2, 4, 6 increase power, odd ones decrease
      this.quad.increasePower(engineId);
    } else {
      this.quad.decreasePower(engineId);
    }
  }

  public backward(){
    let dead = (
      Math.abs(this.quad.roll) > Math.PI / 3 ||
      Math.abs(this.quad.pitch) > Math.PI / 3
    );
    if(dead){
      this.isDeadSignal = 1;
      this.ticksDead++;
    }else{
      this.isDeadSignal = 0;
      this.ticksDead = 0;
    }

    // If dead long enough... (30 ticks), or randomly sometimes.
    let shouldRespawn = this.ticksDead > 15;
    if(shouldRespawn || Math.random() < 0.003){
      // randomly reposition
      this.quad.upright();
      this.quad.model.body.position.x = Math.random() * 4 - 2;
      this.quad.model.body.position.y = Math.random() * 4 + 2;
      this.quad.model.body.position.z = Math.random() * 4 - 2;
      this.quad.model.body.velocity.set(0, 0, 0);
      this.quad.enginePower = [0.37, 0.37, 0.37, 0.37];
    }

    this.brain.backward(<number>this.scoreFunction() - this.scoreAsOfForward);
  }

  public scoreFunction(extended = false) {
    return this.scoreFunctionBad(extended);
  }
  public scoreFunctionBad(extended = false): any {
    let sq = (x) => Math.pow(x, 2);
    let sgm = (x) => 1 / (1 + Math.exp(-x));

    let rotateSpeedScore = -0.2 + sgm(-sq(this.quad.angularVelocity.x) - sq(this.quad.angularVelocity.z)); // droll and dpitch, target speed: 0

    let angleScore = -0.2 + sgm(-sq(this.quad.roll) - sq(this.quad.pitch)); // target angle: 0

    // Multiply angle and its axis's velocity. If they're same sign, that means it's bad. If they're opposite signs, its already correcting itself!
    let rotationMatchScore = Math.tanh(-this.quad.roll * this.quad.angularVelocity.x) + Math.tanh(-this.quad.pitch * this.quad.angularVelocity.z);

    let speedScore = sgm(-sq(this.quad.velocity.x) - sq(this.quad.velocity.y) - sq(this.quad.velocity.z)); // target speed: 0

    let heightScore = sgm(-sq(this.quad.model.mesh.position.y - 1)); // target height: 1
    //let heightScore = 0;

    // let overallScore = 1 * rotateSpeedScore + 3 * angleScore + 2 * speedScore + 0.2 * heightScore + -8 * this.isDeadSignal;
    let overallScore = 1.5 * rotationMatchScore + 3 * rotateSpeedScore + 1.5 * angleScore + 1 * speedScore + 0.2 * heightScore + -8 * this.isDeadSignal;

    if(extended){
      // For diagnostics dialog...
      return { overallScore: Math.tanh(overallScore), rotateSpeedScore, rotationMatchScore, angleScore, speedScore, heightScore, isDeadSignal: -this.isDeadSignal };
    }
    return overallScore;
  }

  private setupBrain(){
    var num_inputs = 11; // dx, dy, pitch, roll, dpitch, droll, height, 4 for current engine power
    var num_actions = 4 * 2; // 4 engines, power tick up or down, so 8 actions~!
    var temporal_window = 4; // amount of temporal memory. 0 = agent lives in-the-moment :)
    var network_size = num_inputs*temporal_window + num_actions*temporal_window + num_inputs;

    // the value function network computes a value of taking any of the possible actions
    // given an input state. Here we specify one explicitly the hard way
    // but user could also equivalently instead use opt.hidden_layer_sizes = [20,20]
    // to just insert simple relu hidden layers.
    var layer_defs = [];
    layer_defs.push({type: 'input', out_sx: 1, out_sy: 1, out_depth:  network_size});
    layer_defs.push({type: 'fc', num_neurons: 40, activation: 'relu'});
    layer_defs.push({type: 'fc', num_neurons: 40, activation: 'relu'});
    layer_defs.push({type: 'regression', num_neurons: num_actions});

    // options for the Temporal Difference learner that trains the above net
    // by backpropping the temporal difference learning rule.
    // var tdtrainer_options = {learning_rate: 0.00001, momentum: 0.01, batch_size: 12, l2_decay: 0.01};
    var tdtrainer_options = {learning_rate: 0.001, momentum: 0.0, batch_size: 12, l2_decay: 0.01};

    var opt: any = {};
    opt.temporal_window = temporal_window;
    opt.experience_size = 30000;
    opt.start_learn_threshold = 1000;
    opt.gamma = 0.7;
    opt.learning_steps_total = 200000;
    opt.learning_steps_burnin = 3000;
    opt.epsilon_min = 0.05;
    opt.epsilon_test_time = 0.05;
    opt.layer_defs = layer_defs;
    opt.tdtrainer_options = tdtrainer_options;

    this.brain = new deepqlearn.Brain(num_inputs, num_actions, opt); // woohoo
  }

  private savenet(){
    var j = this.brain.value_net.toJSON();
    var t = JSON.stringify(j);
    return t;
  }
  private loadnet(t: string){
    var j = JSON.parse(t);
    this.brain.value_net.fromJSON(j);
  }

}
