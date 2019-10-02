/**
 * An approximation of the scheduling algorithm found in the first release of Linux kernel, as a scheduling class.
 * @extends SchedClass
 * @param {string} name "LinuxOriginalClass", the name that will be used to identify this scheduling class.
 */
class LinuxOriginalClass extends SchedClass {
	constructor(name) {
		super(name);
	}

	init() {
		super.init();

		/* Init runqueue */
		this.runqueue = [];

		/* Get process list and make sure none of the processes have priority <= 0 */
		var procList = Simulator.getProcList();
		var t = [], timeSliceList = [];

		for (let i in procList) {
			t.push("timeSlice");
			if (procList[i].currBehavior.priority <= 0) {
				procList[i].currBehavior.priority = 1;
				timeSliceList.push(1);
			} else {
				timeSliceList.push(procList[i].currBehavior.priority);
			}
		}

		/* Add timeslices to the processes. List needs to contain an entry for every process, but only our processes
		 * will have timeslice values added. */
		Simulator.modProc(t, timeSliceList, this.name);
	}

	classParamsTemplate() {
		/* return an object with all possible class parameters */
		return super.classParamsTemplate();
    }

	getDescription() {
		return "A scheduling policy that mimics the scheduler released with the first version of Linux. Process\
		priority translates directly to timeslices, a priority of 20 will yield a timeslice of 20 nanoseconds. When\
		picking the next process, the one with highest remaining timeslice is chosen. When a process uses up its\
		timeslice, it is preempted. If no process on the runqueue has a timeslice above zero, the timeslices are\
		recalculated.\n\n\
		Accepted parameters: none."
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

		/* Call putPrev and return a process if we have one. Just return null without putPrev call otherwise. */
		var picked;
		var maxRemaining = -1;
		if (this.runqueue.length > 0) {
			Simulator.putPrev(prev);

			/* Find longest remaining timeslice value */
			for (let i in this.runqueue) {
				if (this.runqueue[i].timeSlice > maxRemaining) {
					maxRemaining = this.runqueue[i].timeSlice;
					picked = this.runqueue[i]
				}
			}

			/* If all timeslices of runnable processes are used up, recalculate timeslices for all processes of our
			 *	class */
			if (maxRemaining <= 0) {
				let procList = Simulator.getProcList();
				for (let i in procList) {
					if (procList[i].policy === this.name) {
						procList[i].timeSlice = Math.round(procList[i].timeSlice / 2) + procList[i].currBehavior.priority;
					}
				}

				/* Pick the highest timeslice among active processes with re-calculated timeslices */
				maxRemaining = -1;
				for (let i in this.runqueue) {
					if (this.runqueue[i].timeSlice > maxRemaining) {
						maxRemaining = this.runqueue[i].timeSlice;
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
	var name = "LinuxOriginalClass";
	var linuxOriginalClass = new LinuxOriginalClass(name);
	Simulator.registerSchedClass(name, linuxOriginalClass);
}) ();
