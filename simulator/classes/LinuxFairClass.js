/**
 * An implementation of the main scheduling policy of the current version of the Linux scheduler, known as the
 * "Completely Fair Scheduler". Introduced in the 2.6.23 version of kernel in 2007, the scheduler brought many
 * improvements to the kernel, along with addition of scheduling classes as we know them now.
 * @extends SchedClass
 * @param {string} name "LinuxFairClass", the name that will be used to identify this scheduling class.
 */
class LinuxFairClass extends SchedClass {
	constructor(name) {
		super(name);

		/* array of mappings from niceness to weight, borrowed from "core.c" of the Linux kernel */
		const schedPrioToWeight = [
			/* -20 */     88761,     71755,     56483,     46273,     36291,
			/* -15 */     29154,     23254,     18705,     14949,     11916,
			/* -10 */      9548,      7620,      6100,      4904,      3906,
			/*  -5 */      3121,      2501,      1991,      1586,      1277,
			/*   0 */      1024,       820,       655,       526,       423,
			/*   5 */       335,       272,       215,       172,       137,
			/*  10 */       110,        87,        70,        56,        45,
			/*  15 */        36,        29,        23,        18,        15,
		];
		this.schedPrioToWeight = schedPrioToWeight;
	}

	init(classParams) {
		super.init();

		/* Init runqueue & status variables */
		this.runqueue = redblack.tree();	// redblack tree to always keep processes organised by vruntime
		this.enqueued = 0;			// currend number of processes enqueued on the runqueue
		this.load = 0;				// current load on the runqueue, sum of all process loads

		this.minVruntime = 0;		// minimal vruntime, virtual amount of work that was done on the cpu

		this.curr = null;			// the currently selected (executing) process of fair class

		/* Init class parameters */

		// default timescale here = 1000000ns = 1ms
		this.timeScale = 1000000;

		/* minimal timeslice that should be assigned to a process
		 * (originally set to 0.75 in CFS, so this.timeScale * 0.75) */
		this.minGranularity = this.timeScale * 1;

		// A period of time in which all processes should run; (orig. 6) schedLatency = minGranularity * schedNrLatency
		this.schedLatency = this.timeScale * 8;

		// preemption delay, lets tasks run for at least a little while before getting preempted. */
		this.schedWakeupGranularity = this.timeScale * 1;

		// minimal preemption granularity for CPU-bound tasks (orig. 0.75)
		this.schedMinGranularity = this.timeScale * 1;

		// defer execution of new processes for one period, see comment in "placeEntity()".
		this.startDebit = false;

		// Number of processes that fit into schedLatency. If there are more, schedLatency will be temporarily increased
		this.schedNrLatency = Math.floor(this.schedLatency / this.schedWakeupGranularity);


		/* load class parameters */
		if (classParams !== undefined) {
			if (classParams.timeScale !== undefined) {
				let timeScale = Simulator.handleSuffix(classParams.timeScale, "simulation configuration, class parameters, LinuxFairClass, timeScale");
				if (timeScale <= 0) {
					throw new Error("timeScale has to be a positive value")
				}
				this.timeScale = timeScale;
			}
			if (classParams.minGranularity !== undefined) {
				let minGranularity = Simulator.handleSuffix(classParams.minGranularity, "simulation configuration, class parameters, LinuxFairClass, minGranularity");
				if (minGranularity <= 0) {
					throw new Error("minGranularity has to be a positive value")
				}
				this.minGranularity = minGranularity;
			}
			if (classParams.schedLatency !== undefined) {
				let schedLatency = Simulator.handleSuffix(classParams.schedLatency, "simulation configuration, class parameters, LinuxFairClass, schedLatency");
				if (schedLatency <= 0) {
					throw new Error("schedLatency has to be a positive value")
				}
				this.schedLatency = schedLatency;
				this.schedNrLatency = Math.floor(schedLatency / this.schedWakeupGranularity);
			}
			if (classParams.schedWakeupGranularity !== undefined) {
				let schedWakeupGranularity = Simulator.handleSuffix(classParams.schedWakeupGranularity, "simulation configuration, class parameters, LinuxFairClass, schedWakeupGranularity");
				if (schedWakeupGranularity <= 0) {
					throw new Error("schedWakeupGranularity has to be a positive value")
				}
				this.schedWakeupGranularity = schedWakeupGranularity;
				this.schedNrLatency = Math.floor(this.schedLatency / schedWakeupGranularity);
			}
			if (classParams.schedMinGranularity !== undefined) {
				let schedMinGranularity = Simulator.handleSuffix(classParams.schedMinGranularity, "simulation configuration, class parameters, LinuxFairClass, schedMinGranularity");
				if (schedMinGranularity <= 0) {
					throw new Error("schedMinGranularity has to be a positive value")
				}
				this.schedMinGranularity = schedMinGranularity;
			}
			if (classParams.startDebit !== undefined) {
				if (typeof(classParams.startDebit) === "boolean") {
					this.startDebit = classParams.startDebit;
				} else {
					throw new Error("startDebit needs to be a boolean, instead found: " + classParams.startDebit)
				}
			}
		}

		/* Init  */

		/* Add to processes the variables that will be used during scheduling
		 * - enqueueWakeup - set when the task blocks, tells enqueue function that the task just woke up
		 * - vruntime - CFS virtual runtime
		 * - prevSumExecRuntime - previous execution time counter, updated on pick and used in preemption decisions
		 *  */
		Simulator.modProc("enqueueWakeup", false, this.name);
		Simulator.modProc("vruntime", 0, this.name);
		Simulator.modProc("prevSumExecRuntime", 0, this.name);
	}

	classParamsTemplate() {
		/* return an object with all possible class parameters */
		var params = super.classParamsTemplate();

		params.timeScale = 1000000;
		params.minGranularity = params.timeScale * 1;
		params.schedLatency = params.timeScale * 8;
		params.schedWakeupGranularity = params.timeScale * 1;
		params.schedMinGranularity = params.timeScale * 1;
		params.startDebit = false;

		return params;
    }

	getDescription() {	// todo
		return "A scheduling class that behaves like the current version of the Linux scheduler, \"Completely Fair\
		Scheduler\". Introduced in the 2.6.23 version of kernel in 2007, its main goal is to simulate a perfect\
		multitasking processor, that would run all of its processes simoultaneously, each with a fair share of the\
		system's total computing power. Since such a processor doesn't exist, the fair class approximates it by running\
		the processes for dynamically calculated periods of time, based on their priority and weighted against all\
		other processes that are ready to run. As a process executes, its runtime is logged and recalculated into\
		virtual runtime (vruntime) according to its priority and the priorities of other processes in the system. The\
		virtual clock ticks slower for processes of higher priority, letting them run for a longer time. When picking a\
		process to run, the fair class picks the one with lowest vruntime, which can be done quickly because the\
		waiting processes are stored in a red-black tree and organised by their vruntime. The policy is preemptive and\
		will stop the execution of a process when it deems it fair to do so, or when a process that deserves to run\
		more comes along.\n\
        Priorities in this class follow the standard unix \"nice\" values: a lower number means a higher priority,\
		where 19 is the lowest priority, 0 the default and -20 the highest.\n\n\
		Accepted parameters:\n\
		timeScale: the length of the default time unit used for the simulation. When doing\
		simulations on \"time unit\" or nanosecond level, this should be 1. When using microseconds as units, 1000.\
		For \"realistic time\" simulations with milliseconds, use 1000000.\n\
		schedLatency: The amount of time in which every task should execute once. The lower this is, the better the\
		policy will mimic a perfect multitasking processor, but it will also cause more scheduling overhead with\
		frequent process swtches on a real system. When lowering this, make sure to lower minGranularity and simulator\
		timer tick accordingly.\n\
		minGranularity: the amount of time that is added to schedLatency per task. If the number of tasks on the system\
		times minGranularity exceeds schedLatency, then schedLatency will be temporarily increased.\n\
		schedWakeupGranularity: the amount of time that every task should get to run before being preempted.\n\
		schedMinGranularity: the smallest amount of time by which a new task should be behind the current one\
		in order for the current task to be preempted and the new one run instead.\n\
		startDebit: boolean, if true the execution of new processes will be deferred for a time period, which is more\
		fair to the already waiting processes, but increases latency.";
	}

	/*
	 *		Helper functions
	 */

	/* Return the load that corresponds to a given "nice" value / priority. */
	getLoad(prio) {
		if (typeof(prio) !== "number" || prio < -20 || prio > 19) {
			throw new Error("Invalid priority detected, expected a number on [-20, 19], found: " + prio);
		}

		return this.schedPrioToWeight[prio + 20];
	}


	/* Calculate virtual passage of time, weighted by process priority. Time passes slower for processes with higher
	 * priority, allowing them to execute longer. */
	calcDeltaFair(delta, proc) {
		if (proc.currBehavior.priority === 0) {
			return delta;
		} else {
			return this.calcDelta(delta, this.getLoad(0), this.getLoad(proc.currBehavior.priority));
		}
	}
	calcDelta(deltaExec, weight, loadWeight) {
		return deltaExec * weight / loadWeight;
	}

	/* Calculate the vruntime slice of a process that is to be inserted into the runqueue. */
	schedVslice(proc) {
		return this.calcDeltaFair(this.schedSlice(proc), proc);
	}
	/* Calculate the "wall-time" slice (actually simulated time, as opposed to virtual time / vruntime of fair class)
	 * from the period by taking a part proportional to the weight of the process amongst weights of all processes. */
	schedSlice(proc) {
		let processCount = proc.onRq ? this.enqueued : this.enqueued + 1;
		let slice = this.schedPeriod(processCount);

		let load = this.load;
		/* We note curr as off runqueue whereas CFS doesn't, but its load is still already accounted for. */
		if (!proc.onRq && proc !== this.curr) {
			load += proc.load;
		}

		slice = this.calcDelta(slice, this.getLoad(proc.currBehavior.priority), load);

		return slice;
	}

	/* Return the time period in which each processe should run once. Extend it if the number of processes gets too
	 * big. */
	schedPeriod(processCount) {
		if (processCount > this.schedNrLatency) {
			return processCount * this.minGranularity;
		} else {
			return this.schedLatency;
		}
	}


	/* Update the stats of the currently running process. Take it as parameter just in case it was already replaced. */
	updateCurr(proc) {
		/* Check whether the current process actually belongs to us. */
		if (proc.schedClass !== this) {
			return;
		}

		var now = Simulator.time();
		var deltaExec = now - proc.updated;

		if (deltaExec <= 0) {
			return;
		}

		proc.updated = now;

		proc.vruntime += this.calcDeltaFair(deltaExec, proc);
		this.updateMinVruntime(proc);
	}

	/* Update the minimal vruntime of the scheduling queue. This represents the virtual amount of work that was done on
	 * the cpu and is monotonically increasing. Min vruntime updates from the current process, but we pass it as a
	 * parameter just in case. */
	updateMinVruntime(proc) {
		var vruntime = this.minVruntime;

		if (proc.runnable) {	/* proc.onRq check in CFS, likely just a check if it's runnable */
			vruntime = proc.vruntime;
		}

		if (this.enqueued > 0) {
			let leftmost;
			let holder = this.runqueue.leftmost();
			if (holder instanceof Process) {
				leftmost = holder;
			} else if (holder instanceof Array) {
				leftmost = holder[0];
			} else {
				throw new Error("the runqueue is empty or has an invalid value stored in it: " + holder);
			}

			if (proc.runnable) {
				vruntime = leftmost.vruntime < vruntime ? leftmost.vruntime : vruntime;
			} else {
				vruntime = leftmost.vruntime;
			}
		}

		/* minVruntime should never decrease */
		this.minVruntime = this.minVruntime > vruntime ? this.minVruntime : vruntime;
	}

	/* Place a process on the runqueue. "initial" tells us whether it only just spawned. */
	placeEntity(proc, initial) {
		var vruntime = this.minVruntime;

		if (initial && this.startDebit) {
			/* this part defers the execution of a new task for one time period to account for the fact that the current
			 * time period was calculated with previously enqueued tasks. This feature can be disabled in CFS to improve
			 * latency though and since it seems like a pretty major difference, we support toggling it too. */
			vruntime += this.schedVslice(proc);
		}

		if (!initial) {
			let thresh = this.schedLatency;
			thresh /= 2;	// assume kernel's GENTLE_FAIR_SLEEPERS is on, otherwise we wouldn't halve this
			vruntime -= thresh;
		}

		/* ensure we never gain time by being placed backwards */
		proc.vruntime = proc.vruntime < vruntime ? vruntime : proc.vruntime;
	}

	/* Actually enqueue the entity on the runqueue, redblack tree. (__enqueue_entity) */
	enqueueEntity(proc) {
		var holder = this.runqueue.getDelete(proc.vruntime);
        if (holder instanceof Process) {
            holder = [holder, proc];
        } else if (holder instanceof Array) {
            holder.push(proc);
        } else {
            holder = proc;
        }

		this.runqueue.insert(proc.vruntime, holder);
	}

	/* Actually dequeue the entity from the runqueue, redblack tree. (__dequeue_entity) */
	dequeueEntity(proc) {
		var rq = this.runqueue;

		var holder = rq.getDelete(proc.vruntime);
		if (holder instanceof Process) {
			return holder;
		} else if (holder instanceof Array) {
			if (holder.length === 1) {
				return holder[0];
			} else if (holder.length === 2) {
				if (holder[0] === proc) {
					rq.insert(holder[1].vruntime, holder[1]);
					return holder[0];
				} else if (holder[1] === proc) {
					rq.insert(holder[0].vruntime, holder[0]);
					return holder[1];
				} else {
					throw new Error("the process was not found at the time it should be at: "+proc);
				}
			} else if (holder.length > 2) {
				let retVal;
				for (let i = 0; i < holder.length; i++) {
					if (holder[i] === proc) {
						retVal = holder.splice(i, 1)[0];
						rq.insert(holder[0].vruntime, holder);
						return retVal;
					}
				}
				throw new Error("the process was not found at the time it should be at: "+proc);
			}
		} else {
			throw new Error("the process was not found at the time it should be at: "+proc);
		}
	}

	/*
	 *		Main scheduler functions
	 */
	enqueue(proc) {
		super.enqueue(proc);
		proc.onRq = false;	// super sets this to true, but we don't need it yet, keep it on false for calculations

		/* update the stats for the currently executing process, this also brings minVruntime up to date */
		var curr = Simulator.getCurr();
		this.updateCurr(curr);

		/* account_entity_enqueue;  we don't use scheduling entities, just processes, so it's fine to just calculate
		 * process load from its priority when we need it */
		this.load += this.getLoad(proc.currBehavior.priority);
		this.enqueued++;

		if (proc.vruntime === 0) {			// task is brand new
			if (curr.schedClass === this) {
				this.vruntime = curr.vruntime;
			}
			this.placeEntity(proc, true);
		} else if (proc.enqueueWakeup) {	// task just woke up
			this.placeEntity(proc, false);
			proc.enqueueWakeup = false;
		}

		this.enqueueEntity(proc);

		proc.onRq = true;
	}

	dequeue(proc) {
		super.dequeue(proc);
		proc.onRq = true;	// super sets this to false, but we might still need it, keep it on true for calculations

		/* update the stats for the currently executing process, this also brings minVruntime up to date */
		this.updateCurr(Simulator.getCurr());

		this.dequeueEntity(proc);
		proc.onRq = false;

		/* account_entity_dequeue */
		this.load -= this.getLoad(proc.currBehavior.priority);
		this.enqueued--;

		if (!proc.runnable) {
			/* process went to sleep (or ended), this will let us know that it just woke up if it does */
			proc.enqueueWakeup = true;
		}
	}

	pickNext(prev) {
		super.pickNext(prev);

		/* Call putPrev and return a process. Just return null if the runqueue is empty. */
		if (this.enqueued === 0) {
			if (this.nrRunning === 0) {
				return null;
			} else if (prev.schedClass === this && prev.runnable) {
				Simulator.putPrev(prev);
				return prev;
			}
		}

		Simulator.putPrev(prev);

		var picked;
		var holder = this.runqueue.leftmost();		// don't delete it from tree yet, we do the dequeue later
		if (holder instanceof Process) {
			picked = holder;
		} else if (holder instanceof Array) {
			picked = holder[0];
		} else {
			throw new Error("the runqueue is empty or has an invalid value stored in it: " + holder);
		}

		/* CFS checks if picked ("left") is on rq before following call, but we simplify and always take it from rq */
		this.dequeueEntity(picked);

		/* CFS leaves the "onRq" state on true here, since the running process is runnable, but we take onRq more
		 * literally, as in actually on the runqueue. We have "Process.runnable" to see if something can run. */
		picked.onRq = false;
		this.enqueued--;

		/* update_stats_curr_start */
		picked.updated = Simulator.time();

		/* set picked process as the current process for this class */
		this.curr = picked;

		/* note down picked process's previous execution time */
		picked.prevSumExecRuntime = picked.execTime;

		return picked;
	}

	putPrev(prev) {
		super.putPrev(prev);

		this.updateCurr(prev);

		// return prev to the runqueue, but do check if it blocked first
		if (prev.runnable) {
			this.enqueueEntity(prev);
			prev.onRq = true;
			this.enqueued++;
		}

		this.curr = null;
	}

	checkPreempt(proc) {
		super.checkPreempt(proc);

		var curr = Simulator.getCurr();
		this.updateCurr(curr);

		var vdiff = curr.vruntime - proc.vruntime;

		/* granularity gets scaled, as per comment in fair.c: wakeup_gran */
		var granularity = this.calcDeltaFair(this.schedWakeupGranularity, proc);
		if (vdiff > granularity) {
			Simulator.pickNext();
		}
	}

	taskTick() {	// BOOKMARK ========================================================================================
		super.taskTick();

		var now = Simulator.time();

		var curr = Simulator.getCurr();
		this.updateCurr(curr);

		if (this.nrRunning <= 1) {
			return;
		}

		/* check if ideal runtime was exceeded */
		var idealRuntime = this.schedSlice(curr);
		var deltaExec = (curr.execTime + now - curr.picked) - curr.prevSumExecRuntime;
		if (deltaExec > idealRuntime) {
			Simulator.pickNext();
			return;
		}

		/* check if another task would be more appropriate to run (but account for minimal preemption granularity) */
		if (deltaExec < this.schedMinGranularity || this.enqueued < 1) {
			return;
		}

		var left;	// get leftmost process in tree
		var holder = this.runqueue.leftmost();
		if (holder instanceof Process) {
			left = holder;
		} else if (holder instanceof Array) {
			left = holder[0];
		} else {
			throw new Error("the runqueue is empty or has an invalid value stored in it: " + holder);
		}

		var delta = curr.vruntime - left.vruntime;

		if (delta < 0) {
			return;
		}

		if (delta > idealRuntime) {
			Simulator.pickNext();
		}
	}

	getClassStats() {
		var res = super.getClassStats();
		return res;
	}
}

(function() {
	var name = "LinuxFairClass";
	var linuxFairClass = new LinuxFairClass(name);
	Simulator.registerSchedClass(name, linuxFairClass);
}) ();
