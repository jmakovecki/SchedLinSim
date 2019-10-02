/**
 * An approximation of the scheduling algorithm found around the 2.6 release of Linux kernel, known as the "O(1)"
 * scheduler. It was effectively the third version of the Linux scheduler and was named after its O(1) process selection
 * complexity, that contrasted the O(n) complexity of its predecessors. Loosely implemented here as a scheduling class.
 * @extends SchedClass
 * @param {string} name "LinuxO1Class", the name that will be used to identify this scheduling class.
 */
class LinuxO1Class extends SchedClass {
	constructor(name) {
		super(name);
	}

	getTimesliceLen(priority) {
		if (priority < -20) {
			/* RT processes all get same timeslice to simplify things */
			return this.timeScale * 900;
		} else {
			/* change priority to positive values where 0 = lowest & 39 = highest standard & 139 = highest realtime */
			var prio = (priority - 19) * (-1);
			/* timeslices range from 5ms to 800ms in O(1) scheduler for standard processes, so set ours accordingly */
			return this.timeScale * Math.round(prio * 20.4 + 5);
		}
	}

	init(classParams) {
		super.init();

		/* Init runqueue */
		this.runqueue = {
			active: {
				bitmap: [],
				count: 0,
				rq: []
			},
			expired: {
				bitmap: [],
				count: 0,
				rq: []
			}
		};
		for (let i = 0; i < 140; i++) {
			this.runqueue.active.bitmap.push(false);
			this.runqueue.active.rq.push([]);
			this.runqueue.expired.bitmap.push(false);
			this.runqueue.expired.rq.push([]);
		}

		/* Set default timeScale. If Doing simulations on time unit / nanosecond level, this should be 1. If using
		 * microseconds as units, 1000. For realistic simulations with milliseconds, use 1000000. */
		this.timeScale = 1;

		/* load class parameters */
		if (classParams !== undefined) {
			if (classParams.timeScale !== undefined) {
				let timeScale = Simulator.handleSuffix(classParams.timeScale, "simulation configuration, class parameters, LinuxOnClass, timeScale");
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
			if (procList[i].currBehavior.priority < -120 || procList[i].currBehavior.priority > 19) {
				throw new Error("the process with PID " + i + " has a priority of " +
				procList[i].currBehavior.priority + ", allowed values are from -120 (highest priority) to 19 (lowest priority). Note that priorities below -20 are considered realtime.")
			} else {
				timeSliceList.push(this.getTimesliceLen(procList[i].currBehavior.priority));
			}
		}

		/* Add timeslices to the processes. List needs to contain an entry for every process, but only our processes
		 * will have timeslice values added. Also add runqueue references. */
		Simulator.modProc(t, timeSliceList, this.name);
		Simulator.modProc("o1rq", null, this.name);
	}

	classParamsTemplate() {
		/* return an object with all possible class parameters */
		var params = super.classParamsTemplate();

		params.timeScale = 1;

		return params;
    }

	getDescription() {
		return "A scheduling policy that mimics the third version of the Linux scheduler, found around the 2.6 version\
		of the Linux kernel and dubbed the \"O(1)\" scheduler. Unlike its predecessors, it selects the processes in\
		constant time, which got it its name. This scheduler contains two sets of 140 runqueues, where each runqueue\
		represents a priority level. 40 of those levels belong to regular processes (standard Unix priorities, where\
		-20 is highest and 19 lowest) and the other 100 to real time processes (that we, for the sake of simplicity,\
		mark with priorities from -21 to -120). The two sets of runqueues are dubbed \"active\" and \"expired\". When\
		a process uses up its timeslice, it is moved from the active runqueue of its priority to expired one. When all\
		active runqueues are empty, the sets are swapped - the expired runqueues now become the active ones and vice\
		versa.\n\
		The real O(1) scheduler was nutorious for its use of heuristics to decide whether a process was interactive or\
		not, in order to dynamically boost the priority of interactive processes and allow them to execute more often.\
		For the sake of simplicity, we have omitted these heuristics in our implementation - if you wish to model an\
		interactive process, feel free to increase its priority yourself - in theory, the real O(1) scheduler would\
		have done so on its own.\n\n\
		Accepted parameters:\n\
        timeScale: the length of the default time unit used for the simulation. When doing simulations on \"time unit\"\
        or nanosecond level, this should be 1. When using microseconds as units, 1000. For \"realistic time\"\
        simulations with milliseconds, use 1000000.";
	}

	enqueue(proc, expired) {
		super.enqueue(proc);

		/* Enqueue into expired runqueue if expired is explicitely stated, otherwise the active one. */
		var currRq;

		if (expired === true) {
			/* We were explicitly told that the process is expired, treat it as such. */
			currRq = this.runqueue.expired;
		} else if (proc.timeSlice === 0) {
			/* Edge case, process happened to block just as its timeslice ran out. Instead of re-enqueuing it, letting
			 * it be selected and then preempted straight away, just move it onto expired runqueue now. */
			proc.timeSlice = this.getTimesliceLen(proc.currBehavior.priority);	// reset timeslice
			currRq = this.runqueue.expired;		// put onto expired runqueue
		} else {
			currRq = this.runqueue.active;
		}

		var listNo = proc.currBehavior.priority + 120;
		currRq.rq[listNo].push(proc);
		currRq.bitmap[listNo] = true;
		currRq.count++;
		proc.o1rq = currRq;
	}

	dequeue(proc) {
		super.dequeue(proc);

		/* dequeue from process's runqueue, be it active or expired */
		var listNo = proc.currBehavior.priority + 120;
		var currRq = proc.o1rq;

		for (let i = 0; i < currRq.rq[listNo].length; i++) {
			if (currRq.rq[listNo][i] === proc) {
				currRq.rq[listNo].splice(i, 1);
				break;
			}
		}
		if (currRq.rq[listNo].length < 1) {
			currRq.bitmap[listNo] = false;
		}
		currRq.count--;
	}

	pickNext(prev) {
		super.pickNext(prev);

		/* Call putPrev and return a process if we have one. Just return null without putPrev call otherwise. */
		var picked = null;
		if (this.runqueue.active.count > 0 || this.runqueue.expired.count > 0) {
			Simulator.putPrev(prev);

			if (this.runqueue.active.count === 0) {
				/* swap runqueues */
				let tmp = this.runqueue.active;
				this.runqueue.active = this.runqueue.expired;
				this.runqueue.expired = tmp;
			}

			for (let i = 0; i < this.runqueue.active.bitmap.length; i++) {
				if (this.runqueue.active.bitmap[i]) {
					picked = this.runqueue.active.rq[i][0];
					break;
				}
			}
		}

		if (picked !== null) {
			/* Log the start of task execution */
			picked.updated = Simulator.time();
		}
		return picked;
	}

	putPrev(prev) {
		super.putPrev(prev);

		var now = Simulator.time();
		if (prev.updated !== now) {
			prev.timeSlice -= now - prev.updated;
			prev.timeSlice = prev.timeSlice < 0 ? 0 : prev.timeSlice;
			prev.updated = now;
		}

		if (prev.onRq && prev.timeSlice === 0) {
			/* dequeue from active runqueue */
			this.dequeue(prev);

			/* reset timeslice */
			prev.timeSlice = this.getTimesliceLen(prev.currBehavior.priority);

			/* enqueue into expired runqueue, "true" tells the enqueue method that the process is expired */
			this.enqueue(prev, true);
		}
	}

	checkPreempt(proc) {
		super.checkPreempt(proc);

		var curr = Simulator.getCurr();
		if (curr.currBehavior.priority > proc.currBehavior.priority) {
			/* Current process has lower priority (higher number means lower priority) than the new one, preempt. */
			Simulator.pickNext();
		}
	}

	taskTick() {
		super.taskTick();

		/* Decrease timeslice. If it ran out, reset it and call for reschedule. */
		var now = Simulator.time();
		var curr = Simulator.getCurr();
		if (curr.timeSlice - (now - curr.updated) <= 0) {
			curr.timeSlice =  0;	// Just set timeslice to 0, putPrev handles the moving to re-enqueue.
			curr.updated = now;		// Log the task timeslice update timer.
			Simulator.pickNext();
		} else {
			curr.timeSlice -= now - curr.updated;
			curr.updated = now;		// Log the task timeslice update timer.
		}
	}

	getClassStats() {
		var res = super.getClassStats();
		return res;
	}
}

(function() {
	var name = "LinuxO1Class";
	var linuxO1Class = new LinuxO1Class(name);
	Simulator.registerSchedClass(name, linuxO1Class);
}) ();
