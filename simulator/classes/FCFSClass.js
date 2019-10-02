/**
 * An implementation of the first come first served scheduling algorithm as a scheduling class.
 * @extends SchedClass
 * @param {string} name "FCFSClass", the name that will be used to identify this scheduling class.
 */
class FCFSClass extends SchedClass {
	constructor(name) {
		super(name);
	}

	init() {
		super.init();

		/* Init runqueue */
		this.runqueue = [];
	}

	getDescription() {
		return "First-come-first-serve scheduling policy without preemption. Processes are executed in order of arrival\
			and run until they block.\n\
			This class does not use process priorities.\n\n\
			Accepted parameters: none.";
	}

	enqueue(proc) {
		super.enqueue(proc);

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
		if (this.runqueue.length > 0) {
			Simulator.putPrev(prev);
			return this.runqueue[0];
		}

		return null;
	}

	putPrev(prev) {
		super.putPrev(prev);
	}

	checkPreempt(proc) {
		super.checkPreempt(proc);
	}

	taskTick() {
		super.taskTick();
	}
}

(function() {
	var name = "FCFSClass";
	var fcfsClass = new FCFSClass(name);
	Simulator.registerSchedClass(name, fcfsClass);
}) ();
