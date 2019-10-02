/**
 * An implementation of the round robin scheduling algorithm as a scheduling class.
 * @extends SchedClass
 * @param {string} name "SJFClass", the name that will be used to identify this scheduling class.
 */
class SJFClass extends SchedClass {
	constructor(name) {
		super(name);
	}

	init(classParams) {
		super.init();

		/* load class parameters */
		this.earlyPreemption = false;
		if (classParams !== undefined) {
			if (classParams.earlyPreemption === true) {
				this.earlyPreemption = true;
			}
		}

		/* Init runqueue. We're using a redblack tree to always keep processes organised by remaining runtime. */
		this.runqueue = redblack.tree();
		this.enqueued = 0;

		/* prevRemaining is a value added to processes just in case remainingRuntime changes between enqueue and dequeue
		 * (even though it shouldn't). This is necessary because this value is used as a key for the redblack tree that
		 * the process is kept in while it's on the runqueue and needs to be the same in order to retrieve it without
		 * a full search. */
		Simulator.modProc("prevRemaining", null, this.name);
	}

	classParamsTemplate() {
		/* return an object with all possible class parameters */
		var params = super.classParamsTemplate();

		params.earlyPreemption = false;

		return params;
    }

	getDescription() {
		return "Shortest Job First scheduling policy with full information. This class \"cheats\" by looking at\
		simulator's process data to figure out the precise time that a process will run before blocking. This way, the\
		class can always pick the process that will truly execute for the shortest time before blocking.\n\
		This class can also function as shortest remaining time first by setting parameter \"earlyPreemtion\" to true.\
		After doing so, the scheduler will look at any new process that gets enqueued, compare it with the currently\
		running process and run it immediately, if the new process will block sooner as the currently running process\
		would.\n\
		This class does not use process priorities.\n\n\
		Accepted parameters:\n\
		earlyPreemtion: when set to true, enables early preemption and changes the algorithm from\
		\"shortest job first\" to \"shortest remaining time first\"";
	}

	enqueue(proc) {
		super.enqueue(proc);

		this.enqueued++;

		/* This scheduling class "cheats" and uses the actual remaining runtime of processes to always know exactly for
		 * how long they still wish to run. The problem is that a freshly awoken process only gets its actual remaining
		 * runtime value calculated AFTER it's picked. We can't enqueue it properly without knowing the real remaining
		 * runtime though, so here we set it ourselves, exactly as the simulator does.
		 * There is, however, an issue with this approach - the time gets decided BEFORE the process behaviors can be
		 * checked, so if a process switches to a behavior with a lower runtime it will only come into effect after the
		 * current runtime is used up. We could do behavior update ourselves to prevent this, but that would potentially
		 * allow two behavior switches to happen in a single process pick. Since we do not wish to modify core simulator
		 * to account for an irregular scheduling class such as this one, we will leave this as is. If this behavior
		 * is an issue, one can account for it by making an affected process switch to a new behavior sooner. */
		if (proc.remainingRuntime === 0) {
			let entry = proc.currBehavior.run;
			if (typeof(entry) === "number") {
				proc.remainingRuntime = entry;
			} else {
				proc.remainingRuntime = entry[0] + Math.floor( Math.random() * (entry[1] - entry[0]) );
			}
		}

		proc.prevRemaining = proc.remainingRuntime;
		var remainingRuntime = proc.remainingRuntime;

        var holder = this.runqueue.getDelete(remainingRuntime);
        if (holder instanceof Process) {
            holder = [holder, proc];
        } else if (holder instanceof Array) {
            holder.push(proc);
        } else {
            holder = proc;
        }

		this.runqueue.insert(remainingRuntime, holder);
	}

	dequeue(proc) {
		super.dequeue(proc);

		this.enqueued--;

		var remainingRuntime = proc.prevRemaining;
		var rq = this.runqueue;

		var holder = rq.getDelete(remainingRuntime);
		if (holder instanceof Process) {
			return holder;
		} else if (holder instanceof Array) {
			if (holder.length === 1) {
				return holder[0];
			} else if (holder.length === 2) {
				if (holder[0] === proc) {
					rq.insert(remainingRuntime, holder[1]);
					return holder[0];
				} else if (holder[1] === proc) {
					rq.insert(remainingRuntime, holder[0]);
					return holder[1];
				} else {
					throw new Error("the process was not found at the time it should be at: "+proc);
				}
			} else if (holder.length > 2) {
				let retVal;
				for (let i = 0; i < holder.length; i++) {
					if (holder[i] === proc) {
						retVal = holder.splice(i, 1)[0];
						rq.insert(remainingRuntime, holder);
						return retVal;
					}
				}
				throw new Error("the process was not found at the time it should be at: "+proc);
			}
		} else {
			throw new Error("the process was not found at the time it should be at: "+proc);
		}
	}

	pickNext(prev) {
		super.pickNext(prev);

		/* Call putPrev and return a process. Just return null if the runqueue is empty. */
		if (this.enqueued === 0) {
			return null;
		} else {
			Simulator.putPrev(prev);

			var picked = null;
			var holder = this.runqueue.leftmostDelete();
			if (holder instanceof Process) {
				picked = holder;
			} else if (holder instanceof Array) {
				if (holder.length === 1) {
					picked = holder[0];
				} else if (holder.length === 2) {
					this.runqueue.insert(holder[1].remainingRuntime, holder[1]);
					picked = holder[0];
				} else if (holder.length > 2) {
					picked = holder.shift();
					this.runqueue.insert(holder[0].remainingRuntime, holder);
				}
			} else {
				throw new Error("the runqueue is empty or has an invalid value stored in it.");
			}

			/* We're removing a process from the runqueue without calling dequeue, so we need to update its onRq value
			 * ourselves to let the simulator know it doesn't have to be dequeued after it blocks. */
			picked.onRq = false;
			this.enqueued--;

			return picked;
		}
	}

	putPrev(prev) {
		super.putPrev(prev);

		/* re-enqueue process if it's still runnable (didn't block, just got preempted) */
		if (prev.runnable) {
			this.enqueue(prev);
		}
	}

	checkPreempt(proc) {
		super.checkPreempt(proc);

		if (this.earlyPreemption && Simulator.getCurr().remainingRuntime > proc.remainingRuntime) {
			Simulator.pickNext();
		}
	}

	taskTick() {
		super.taskTick();
	}

	getClassStats() {
		var res = super.getClassStats();
		return res;
	}
}

(function() {
	var name = "SJFClass";
	var sjfClass = new SJFClass(name);
	Simulator.registerSchedClass(name, sjfClass);
}) ();
