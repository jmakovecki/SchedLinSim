/**
 * An implementation of the round robin scheduling algorithm as a scheduling class.
 * @extends SchedClass
 * @param {string} name "RoundClass", the name that will be used to identify this scheduling class.
 */
class RoundClass extends SchedClass {
	constructor(name) {
		super(name);
	}

	init(classParams) {
		super.init();

		/* Simulation settings */
		this.timeSlice = 1000;

		/* load class parameters */
		if (classParams !== undefined) {
			if (classParams.timeSlice !== undefined) {
				let timeSlice = Simulator.handleSuffix(classParams.timeSlice, "simulation configuration, class parameters, RoundClass, timeSlice");
				this.timeSlice = timeSlice;
			}
		}

		/* Init runqueue */
		this.runqueue = [];

		/* Add timeslices to the processes */
		Simulator.modProc("timeSlice", this.timeSlice, this.name);
	}

	classParamsTemplate() {
		/* return an object with all possible class parameters */
		var params = super.classParamsTemplate();

		params.timeSlice = 1000;

		return params;
    }

	getDescription() {
		return "Round robin scheduling policy with preemption. When a process uses up its timeslice or blocks, it is\
			replaced by the next process in the queue. New processes get added to the end of the queue.\n\
			This class does not use process priorities.\n\n\
			Accepted parameters:\n\
			timeSlice: the length of time slice allocated to the processes.";
	}

	enqueue(proc) {
		super.enqueue(proc);

		proc.timeSlice = this.timeSlice;

		this.runqueue.push(proc);
	}

	dequeue(proc) {
		super.dequeue(proc);

		for (var i = 0; i < this.runqueue.length; i++) {
			if (this.runqueue[i] === proc) {
				this.runqueue.splice(i, 1);
				break;
			}
		}
	}

	pickNext(prev) {
		super.pickNext(prev);

		/* Call putPrev and return a process. Just return null if the runqueue is empty. */
		var picked;
		if (this.runqueue.length > 0) {
			Simulator.putPrev(prev);
			picked = this.runqueue[0];
			/* Log the start of task execution */
			picked.updated = Simulator.time();
			return picked;
		}

		return null;
	}

	putPrev(prev) {
		super.putPrev(prev);

		/* re-enqueue process if it's still runnable (didn't block, just got preempted) */
		if (prev.runnable && prev.onRq) {	// these should have the same value here, but still
			this.dequeue(prev);
			this.enqueue(prev);
		}
	}

	checkPreempt(proc) {
		super.checkPreempt(proc);
	}

	taskTick() {
		super.taskTick();

		/* Decrease timeslice. If it ran out, call for reschedule. */
		var now = Simulator.time();
		var curr = Simulator.getCurr();
		curr.timeSlice -= now - curr.updated;
		curr.updated = now;			// Log the task timeslice update timer.
		if (curr.timeSlice <= 0) {
			Simulator.pickNext();	// Pick the next task to run.
		}
	}

	getClassStats() {
		var res = super.getClassStats();
		return res;
	}
}

(function() {
	var name = "RoundClass";
	var roundClass = new RoundClass(name);
	Simulator.registerSchedClass(name, roundClass);
}) ();
