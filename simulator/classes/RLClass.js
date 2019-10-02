/**
 * An implementation of an experimental reinforcement learning scheduling class using Q-learning.
 * @extends SchedClass
 * @param {string} name The name that will be used to identify this scheduling class.
 */
class RLClass extends SchedClass {
	constructor(name) {
		super(name);
	}

	init(classParams) {
		super.init();
		var i;

		/* Reinforcement learning settings */
		this.stateCount = 9;
		this.optInitialValue = 1000;
		this.alpha = 0.3;
		this.gamma = 0.9;
		this.stateRewards = [100, 90, 70, 60, 50, 10, -20, -30, -60];

		/* Statistics settings */
		this.loadLen = 100;
		this.latThresholds = [10, 30];		// system latency thresholds that separate states
		this.loadThresholds = [0.3, 0.7];	// system load thresholds that separate states

		/* Simulation settings */
		this.timeSlice = 1000;

		/* Runtime variables */
		this.rlPrev = null;
		this.state = 4; // low latency, low load

		/* load class parameters */
		if (classParams !== undefined) {
			if (typeof(classParams.optInitialValue) === "number" && classParams.optInitialValue > 0) {
				this.optInitialValue = classParams.optInitialValue;
			}
			if (typeof(classParams.alpha) === "number" && classParams.alpha > 0 && classParams.alpha <= 1) {
				this.alpha = classParams.alpha;
			}
			if (typeof(classParams.gamma) === "number" && classParams.gamma > 0 && classParams.gamma <= 1) {
				this.gamma = classParams.gamma;
			}
			if (classParams.stateRewards instanceof Array && classParams.stateRewards.length === this.stateCount) {
				for (i = 0; i < this.stateCount; i++) {
					this.stateRewards[i] = classParams.stateRewards[i];
				}
			}
			if (typeof(classParams.loadLen) === "number" && classParams.loadLen > 0) {
				this.loadLen = classParams.loadLen;
			}
			if (classParams.latThresholds instanceof Array && classParams.latThresholds.length === 2 &&
				classParams.latThresholds[0] < classParams.latThresholds[1]) {
					this.latThresholds[0] = classParams.latThresholds[0];
					this.latThresholds[1] = classParams.latThresholds[1];
			}
			if (classParams.loadThresholds instanceof Array && classParams.loadThresholds.length === 2 &&
				classParams.loadThresholds[0] < classParams.loadThresholds[1] && classParams.loadThresholds[0] > 0 &&
				classParams.loadThresholds[1] <= 1) {
					this.loadThresholds[0] = classParams.loadThresholds[0];
					this.loadThresholds[1] = classParams.loadThresholds[1];
			}
			if (typeof(classParams.timeSlice) === "number" && classParams.timeSlice > 0) {
				this.timeSlice = classParams.timeSlice;
			}

		}

		/* Init runqueue */
		this.runqueue = [];

		/* Add Q values list to the processes. */
		var qArray = [];
		for (i = 0; i < this.stateCount; i++) {
			qArray.push(this.optInitialValue);
		}
		Simulator.modProc("qValues", qArray, this.name);

		/* Add timeslices to the processes */
		Simulator.modProc("timeSlice", this.timeSlice, this.name);

	}

	classParamsTemplate() {
		/* return an object with all possible class parameters */
		var params = super.classParamsTemplate();

		params.optInitialValue = 1000;
		params.alpha = 0.3;
		params.gamma = 0.9;
		params.stateRewards = [100, 90, 70, 60, 50, 10, -20, -30, -60];
		params.loadLen = 100;
		params.latThresholds = [10, 30];
		params.loadThresholds = [0.3, 0.7];
		params.timeSlice = 1000;

		return params;
    }

	getDescription() {
		return "An experimental, reinforcement-learning based scheduling strategy. It uses Q-learning to learn about\
		the usefulness of picking a given process in a given state that the system is in. It calculates the state of\
		the system using its processor load and the overall waiting time of the processes running under this scheduling\
		class.\n\
		Note that this policy is highly experimental, not finished and does not actually work well in its current\
		state. It is included as more of a curiosity than a serious scheduling strategy, since it does use the\
		statistics avainable during a simulation.\n\
		This class does not use process priorities.";
	}

	enqueue(proc) {
		super.enqueue(proc);

		this.runqueue.push(proc);
	}

	dequeue(proc) {
		super.dequeue(proc);

		for (var i = 0; i < this.runqueue.length; i++) {
			if (this.runqueue[i] == proc) {
				this.runqueue.splice(i, 1);
				break;
			}
		}
	}

	pickNext(prev) {
		super.pickNext(prev);

		/* Return null if we have no processes. */
		if (this.runqueue.length <= 0) {
			return null;
		}

		var currState = this.getState();

		/* Pick the process with the highest Q value as the next process to run. */
		var picked = this.runqueue[0], secondPicked;
		for (var i = 1; i < this.runqueue.length; i++) {
			if (this.runqueue[i].qValues[currState] > picked.qValues[currState]) {
				secondPicked = picked;
				picked = this.runqueue[i];
			}
		}

		/* Learn about the previously picked process. */
		var reward = this.getReward(this.state);
		if (this.rlPrev !== null) {
			this.rlPrev.qValues[this.state] += this.alpha * (reward
															+ this.gamma * picked.qValues[currState]
															- this.rlPrev.qValues[this.state]);

			/*
			 * We pick the best process to run next before learning so that we only need to go through processes to pick
			 * the highest Q value once, but if the Q value that we're editing is among them it won't have the correct
			 * value in this check. Make sure that its updated value is accounted for here (if needed).
			 */
			if (currState === this.state && this.rlPrev.onRq && this.rlPrev.policy === this.name) {
				if (this.rlPrev === picked && secondPicked !== undefined &&
					secondPicked.qValues[currState] >= picked.qValues[currState]) {
					/*
					 * Learning decreased the Q value of the prev ran process. It got picked again, but the updated
					 * value is too low to be picked again, so pick the second best option instead.
					 */
					picked = secondPicked;
				} else if (this.rlPrev.qValues[currState] > picked.qValues[currState]) {
					/*
					 * Learning increased the Q value of the prev ran process, making it better than what we picked.
					 * Pick prev process again instead of our current pick.
					 */
					picked = this.rlPrev;
				}
			}
		}

		picked.updated = Simulator.time();
		this.state = currState;
		this.rlPrev = picked;

		Simulator.putPrev(prev);
		return picked;
	}

	putPrev(prev) {
		super.putPrev(prev);
	}

	checkPreempt(proc) {
		super.checkPreempt(proc);

		/* Return on first process pick. */
		if (this.rlPrev === null || this.rlPrev === undefined) {
			return;
		}

		var currState = this.getState();
		if (currState !== this.state) {
			/* State changed, learning wouldn't affect this new state so just check if the new process has a higher
			 * value here. */
			if (proc.qValues[currState] > this.rlPrev.qValues[currState]) {
				Simulator.pickNext();
			}
		} else {
			/* Same state, get processs with highest Q value, do a mock learning step, then compare values. */
			var picked = this.runqueue[0];
			for (var i = 1; i < this.runqueue.length; i++) {
				if (this.runqueue[i].qValues[currState] > picked.qValues[currState]) {
					picked = this.runqueue[i];
				}
			}

			var reward = this.getReward(this.state);
			var newQval = this.rlPrev.qValues[this.state];
			newQval += this.alpha * (reward
									+ this.gamma * picked.qValues[currState]
									- this.rlPrev.qValues[this.state]);

			if (proc.qValues[this.state] > newQval) {
				/* New process has a higher Q value than the current one would after learning, reschedule. */
				Simulator.pickNext();
			}
		}
	}

	taskTick() {
		super.taskTick();

		var now = Simulator.time();
		var curr = Simulator.getCurr();

		curr.timeSlice -= now - curr.updated;
		if (curr.timeSlice <= 0) {
			curr.timeSlice = this.timeSlice;
			Simulator.pickNext();
		}

		curr.updated = now;
	}

	/**
	 * State function, calculate the current state the agent is in. States:
	 * (L = low, M = mid, H = high)
	 * - L latency, H load: LH: 0
	 * - L latency, M load: LM: 1
	 * - M latency, H load: MH: 2
	 * - M latency, M load: MM: 3
	 * - L latency, L load: LL: 4
	 * - M latency, L load: ML: 5
	 * - H latency, H load: HH: 6
	 * - H latency, M load: HM: 7
	 * - H latency, L load: HL: 8
	 */
	getState() {
		var currLoad = Simulator.getCurrLoad(this.loadLen);
		var currLat = super.getLatency();

		var latNum, loadNum;
		if (currLat <= this.latThresholds[0]) {
			latNum = 0;
		} else if (currLat <= this.latThresholds[0]) {
			latNum = 1;
		} else {
			latNum = 2;
		}
		if (currLoad < this.loadThresholds[0]) {
			loadNum = 0;
		} else if (currLoad < this.loadThresholds[1]) {
			loadNum = 1;
		} else {
			loadNum = 2;
		}

		var stateArray = [
			[4, 1, 0],	/* LatL:LoadL: 4, LatL:LoadM: 1, LatL:LoadH: 0 */
			[5, 3, 2],	/* LatM:LoadL: 5, LatM:LoadM: 3, LatM:LoadH: 2 */
			[8, 7, 6]	/* LatH:LoadL: 8, LatH:LoadM: 7, LatH:LoadH: 6 */
		]

		return stateArray[latNum][loadNum];
	}

	getReward(state) {
		if (typeof(state) !== "number" || state < 0 || state >= this.stateCount) {
			throw new Error("invalid state: " + state);
		}
		return this.stateRewards[state];
	}
}

(function() {
	var name = "RLClass";
	var rlClass = new RLClass(name);
	Simulator.registerSchedClass(name, rlClass);
}) ();
