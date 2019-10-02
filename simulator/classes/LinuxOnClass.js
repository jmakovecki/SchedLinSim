/**
 * An approximation of the scheduling algorithm found around the 2.4 release of Linux kernel, known as the "O(n)"
 * scheduler. It was effectively the second version of the Linux scheduler, after the original scheduler that was
 * included with the first version of the kernel. Loosely implemented here as a scheduling class.
 * @extends SchedClass
 * @param {string} name "LinuxOnClass", the name that will be used to identify this scheduling class.
 */
class LinuxOnClass extends SchedClass {
	constructor(name) {
		super(name);
	}

	init(classParams) {
		super.init();

		/* Init runqueue */
		this.runqueue = [];

		/* Set default timeScale. If Doing simulations on time unit / nanosecond level, this should be 1. If using
		 * microseconds as units, 1000. For realistic simulations with milliseconds, use 1000000. */
		this.timeScale = 1;

		/* load class parameters */
		if (classParams !== undefined) {
			if (classParams.timeScale !== undefined) {
				let timeScale = Simulator.handleSuffix(classParams.timeScale, "simulation configuration, class parameters, LinuxOnClass, timeScale")
				if (timeScale <= 0) {
					throw new Error("timeScale has to be a positive value")
				}
				this.timeScale = timeScale;
			}
		}

		/* Get process list and make sure none of the processes have priority <= 0 */
		var procList = Simulator.getProcList();
		var t = [], timeSliceList = [];

		for (let i in procList) {
			t.push("timeSlice");
			if (procList[i].currBehavior.priority < -20 || procList[i].currBehavior.priority > 19) {
				throw new Error("the process with PID " + i + " has a priority of " +
				procList[i].currBehavior.priority + ", allowed values are from -20 (highest priority) to 19 (lowest priority).")
			} else {
				timeSliceList.push((20 - procList[i].currBehavior.priority) * 2 * this.timeScale);
			}
		}

		/* Add timeslices to the processes. List needs to contain an entry for every process, but only our processes
		 * will have timeslice values added. */
		Simulator.modProc(t, timeSliceList, this.name);
	}

	classParamsTemplate() {
		/* return an object with all possible class parameters */
		var params = super.classParamsTemplate();

		params.timeScale = 1;

		return params;
    }

	getDescription() {
		return "A scheduling policy that mimics the second version of the Linux scheduler, found around the 2.4 version\
		of the Linux kernel and dubbed the \"O(n)\" scheduler. Conceptually similar to the original scheduler, it goes\
		through all the runnable processes (hence the name \"O(n)\") and selects the process with highest remaining\
		timeslice to run. When a process uses up its timeslice, it is preempted. If no process on the runqueue has a\
		timeslice above zero, the timeslices are recalculated, taking into account the process' priorities. The\
		priorities in this class are the standard Unix nice values and range from -20 to 19, where -20 is the highest\
		priority, 19 the lowest and 0 the default.\n\n\
		Accepted parameters:\n\
        timeScale: the length of the default time unit used for the simulation. When doing simulations on \"time unit\" or\
        nanosecond level, this should be 1. When using microseconds as units, 1000. For \"realistic time\"\
        simulations with milliseconds, use 1000000.";
	}

	enqueue(proc) {
		super.enqueue(proc);

		this.runqueue.push(proc);
	}

	dequeue(proc) {
		super.dequeue(proc);

		for (let i = 0; i < this.runqueue.length; i++) {
			if (this.runqueue[i] === proc) {
				this.runqueue.splice(i, 1);
				break;
			}
		}
	}

	pickNext(prev) {
		super.pickNext(prev);

		/* calculate the "goodness" value of a process */
		var goodness = function(proc) {
			if (proc.timeSlice <= 0) {	// shouldn't go below 0, but just in case...
				return 0;
			} else {
				return proc.timeSlice + 20 - proc.currBehavior.priority;
			}
		}

		/* Call putPrev and return a process if we have one. Just return null without putPrev call otherwise. */
		var picked, weight;
		var maxWeight = -1000;
		if (this.runqueue.length > 0) {
			Simulator.putPrev(prev);

			/* Find longest remaining timeslice value */
			for (let i in this.runqueue) {
				weight = goodness(this.runqueue[i]);
				if (weight > maxWeight) {
					maxWeight = weight;
					picked = this.runqueue[i]
				}
			}

			/* If all timeslices of runnable processes are used up, recalculate timeslices for all processes of our
			 *	class */
			if (maxWeight <= 0) {
				let procList = Simulator.getProcList();
				for (let i in procList) {
					if (procList[i].policy === this.name) {
						/* timeslice is (40 * timescale) for default priority of 0, so if timeScale is milliseconds
						 * (1000000) we get 40ms, which is about the same as O(n) scheduler would do at a jiffy
						 * setting of HZ = 500. */
						procList[i].timeSlice = Math.round(procList[i].timeSlice / 2) +
							(20 - procList[i].currBehavior.priority) * 2 * this.timeScale;
					}
				} /* BOOKMARK */

				/* Pick the highest timeslice among active processes with re-calculated timeslices */
				maxWeight = -1000;
				for (let i in this.runqueue) {
					weight = goodness(this.runqueue[i]);
					if (weight > maxWeight) {
						maxWeight = weight;
						picked = this.runqueue[i]
					}
				}
			}

			/* Log the start of task execution */
			picked.updated = Simulator.time();
			return picked;
		}

		return null;
	}

	putPrev(prev) {
		super.putPrev(prev);

		/* decrease / reset timeslice */
		var now = Simulator.time();
		prev.timeSlice = prev.timeSlice - (now - prev.updated) < 0 ? 0 : prev.timeSlice - (now - prev.updated);
		prev.updated = now;		// Log the task timeslice update timer.
	}

	checkPreempt(proc) {
		super.checkPreempt(proc);
	}

	taskTick() {
		super.taskTick();

		/* Decrease timeslice. If it ran out, reset it and call for reschedule. */
		var now = Simulator.time();
		var curr = Simulator.getCurr();
		if (curr.timeSlice - (now - curr.updated) <= 0) {
			curr.timeSlice =  0;
			curr.updated = now;		//Log the task timeslice update timer.
			Simulator.pickNext();
		} else {
			curr.timeSlice -= now - curr.updated;
			curr.updated = now;		//Log the task timeslice update timer.
		}
	}

	getClassStats() {
		var res = super.getClassStats();
		return res;
	}
}

(function() {
	var name = "LinuxOnClass";
	var linuxOnClass = new LinuxOnClass(name);
	Simulator.registerSchedClass(name, linuxOnClass);
}) ();
