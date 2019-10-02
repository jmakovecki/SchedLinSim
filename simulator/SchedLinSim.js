/*
 * @name SchedLinSim.js
 * @fileOverview SchedLinSim scheduling simulator
 * @author Jan Makovecki
 * @version 1.0.0
 */

/**
 * An enum type used for distinguishing log events stored in processes.
 * Possible values: enqueue, dequeue, pick, block, exit.
 * @readonly
 * @type {LogEvent}
 * @enum {number}
 */
const LogEvent = Object.freeze({
    "enqueue": 1,
    "dequeue": 2,
    "pick": 3,
    "block": 4,
    "preempt": 5,
    "exit": 6
});


/**
 * An enum type used for distinguishing exit conditions used for ending a process of the simulation. Used in ExitEvent.
 * Possible values: procExec, simExec, execCnt.
 * @readonly
 * @type {ExitCond}
 * @enum {number}
 */
const ExitCond = Object.freeze({
	"procExec": 1,
	"simExec": 2,
	"execCnt": 3
});


/**
 * LogEntry is a class used for storing a history of process's activity.
 * @param {number}   timestamp	The time in nanoseconds of simulation at which the logged event occured.
 * @param {LogEvent} evt		The event that occured.
 */
class LogEntry {
	constructor(timestamp, evt) {
		this.timestamp = timestamp;
		this.event = evt;
	}
}


/**
 * A general class that represents a simulator scheduling class. The actual implementations should extend it and use
 * the same methods. SchedClass implementations exist in the global namespace, not under this SchedClass.
 *
 * If you wish to implement a scheduling class of your own, please refer to
 * {@link index.html#schedclasstemplate SchedClassTemplate}, which serves as an example scheduling class implementation
 * with extra instructions and explainations.
 * @param {string} name The name that will be used to refer to the new class.
 */
 class SchedClass {
	constructor(name) {
		this.name = name;

        /**
         * The runqueue object of the scheduling class. Individual classes are free to re-implement this in any way they
         * see fit.
         * @type {Object}
         */
		this.runqueue = {};

        /**
         * The number of processes that are currently on the runqueue or running. Kept up to date by SchedClass
         * inheritable functions for all final scheduling classes.
         * @type {Number}
         */
        this.nrRunning = 0;
        /**
         * The number of processes that are currently on the runqueue. Does not include the currently running process.
         * Kept up to date by SchedClass inheritable functions for all final scheduling classes.
         * @type {Number}
         */
        this.nrWaiting = 0;
        /**
         * The current sum of latency (time spent waiting from last enqueue) for all processes on the runqueue.
         * @type {Number}
         */
        this.latencySum = 0;
        /**
         * The simulation time at which latencySum was last updated.
         * @type {Number}
         */
        this.latencyUpdate = 0;
        /**
         * An array of latency measurements, used in latency statistic calculations.
         * @type {Array}
         */
        this.latencyLog = [];
	}

	/**
 	 * Initialize the scheduling class and runqueue to a state where it's ready to be used in simulator. This function
 	 * is called before the simulation is started, so it should handle the initial setup as well as clean up any old
 	 * values from previous simulations.
 	 * @param {Object | undefined} classParams An object containing any additional parameters that can be passed to the
 	 * schedClass. The point of this object is to allow simulation definition objects (simConf) to contain parameters
 	 * with which they can configure scheduling classes. This object is passed to the simulator as
 	 * "simConf.[schedClassName]". The structure and contents of this objects are up to the author of the scheduling
 	 * class.
 	 */
	init() {
        this.nrRunning = 0;
        this.nrWaiting = 0;
        this.latencySum = 0;
        this.latencyUpdate = Simulator.time();
        this.latencyLog = [];
	}

    /**
     * A method that returns an object with all the parameters that the class supports set to their default values.
     * Class implementations should re-emplement this method to make it return any settings that they accept. This is
     * not important as far as functioning of the simulator goes, but it is helpful to the user and SHOULD be
     * implemented.
     * @return {Object} An object contatining all the parameters that the class supports as undefined variables.
     */
    classParamsTemplate() {
        return {};
    }

    /**
     * A method that returns a description of the scheduling class. Class implementations should re-emplement this
     * method and return something useful, like an explaination of the scheduling strategy they use and a description of
     * parameters that the class accepts.
     * @return {string} A description of the scheduling class.
     */
    getDescription() {
        return "No description.";
    }

	/**
	 * Enqueues a process into the class's runqueue.
	 * @param  {Process} proc The process to enqueue.
	 */
	enqueue(proc) {
        /* Make sure the process is alive and not on the runqueue. */
        if (!proc.alive) {
            throw new Error("attempting to enqueue a dead process.");
        } else if (proc.onRq) {
            throw new Error("attempting to enqueue a process that's already on the runqueue.");
        }
        /* Mark the process as currently enqueued on the runqueue. */
		proc.onRq = true;
        /* Log the enqueue event in the process's execution log. */
        proc.execLog.push(new LogEntry(Simulator.time(), LogEvent.enqueue));
	}

	/**
	 * Dequeues a process from the class's runqueue.
	 * @param  {Process} proc The process to enqueue.
	 */
	dequeue(proc) {
        /* Make sure the process is on runqueue. */
        if (!proc.onRq) {
            throw new Error("attempting to dequeue a process that's not on the runqueue.");
        }
        /* Mark the process as not currently in the runqueue. */
		proc.onRq = false;
        /* Log the dequeue event in the process's execution log. */
        proc.execLog.push(new LogEntry(Simulator.time(), LogEvent.dequeue));
	}

	/**
	 * Picks the next process to be run.
	 *
	 * **WARNING**: This method ***MUST*** call "prev.schedClass.putPrev(prev)" at some point during its execution if
	 * the scheduling class returns a process to run! The timing of this call can be delicate in some scheduling classes
	 * for their own logic, therefore this method invocation is left to the implementation of a given scheduling class.
	 * Still, it is absolutely essential that the call to putPrev is made in pickNext if a process is returned! If the
	 * scheduling class DOESN'T have a process to run and returns null instead, then this call shouldn't be made either.
	 * @param  {Process} prev The process that ran previously and just finished executing.
	 * @return {Process} The process to be run next.
	 */
	pickNext() {   // param: "prev", add if required
        if (Simulator.calledPutPrev) { // DO NOT REMOVE THIS. Read above warning!
            throw new Error("simulatorPutPrev true at the start of pickNext. A previous scheduling class likely called putPrev but returned null!");
        }
        var now = Simulator.time();

        /* Update latency sum. */
        this.latencySum += (now - this.latencyUpdate) * this.nrWaiting;
        this.latencyUpdate = now;
        /* Log the latency for average latency calculation. */
        this.latencyLog.push(this.latencySum);
	}

	/**
	 * Cleans up after the previous process that ran.
	 * @param  {Process} prev The process that ran previously and just finished executing.
	 */
	putPrev() {    // param: "prev", add if required
		Simulator.calledPutPrev = true; // DO NOT REMOVE THIS. Read the warning on "SchedClass.pickNext()"!
	}

	/**
	 * Check whether a newly appeared process should preempt the currently running process.
	 * @param  {Process} proc The newly appeared process that could potentially preempt the running one.
	 */
	checkPreempt() {   // param: "proc", add if required

	}

	/**
	 * A regular timer interrupt. Decrease task's timeslice, decide whether it should be preempted, etc.
	 */
	taskTick() {

	}

    /**
     * A method to update and log the current latency of all the processes waiting on the runqueue of this scheduling
     * class. This method does the same thing as the latency update code in pickNext. This method should be called when
     * picking a next process to run for all the classes that do not get to pick a process, since a higher priority
     * class has already picked one. It is meant to keep latency measurements consistent between classes, regardless of
     * whether they got to pick a process or not.
     * Actual implementations of scheduling classes should not re-implement this method.
     */
    updateLatency() {
        var now = Simulator.time();
        /* Update latency sum. */
        this.latencySum += (now - this.latencyUpdate) * this.nrWaiting;
        this.latencyUpdate = now;
        /* Log the latency for average latency calculation. */
        this.latencyLog.push(this.latencySum);
    }

    /**
     * A helper method that returns the current latency of the scheduling class. Specifically, this is the sum of time
     * that all the processes that are currently on the runqueue have spent waiting since they were enqueued. Using this
     * really only makes sense during a simulation, if you need latency statistics after a simulation has ended you
     * probably want to use {@link index.html#schedclassgetaveragelatency SchedClass.getAverageLatency()}.
     * Actual implementations of scheduling classes should not re-implement this method.
     * @return {number} Current latency of the scheduling class.
     */
    getLatency() {
        var lastBit = (Simulator.time() - this.latencyUpdate) * this.nrWaiting;
        return this.latencySum + lastBit;
    }

    /**
     * A helper method that returns the average latency and standard deviation of it for the given scheduling class.
     * Should mainly be used once the simulation has ended, if you need latency during a simulation you probably want
     * {@link index.html#schedclassgetlatency SchedClass.getLatency()}.
     * Aside from average latency, this function also returns the population standard deviation of all the latency
     * measurements. The actual object returned therefore contains two entries: "avg" for average latency and "dev" for
     * standard deviation.
     * Actual implementations of scheduling classes should not re-implement this method.
     * @return {Object} An object with entries:
     * - **avg**: (floating point number) average latency of processes in this class during the last simulation run,
     * sampled on process picks.
     * - **dev**: (floating point number) population standard deviation of processes in this class during the last
     * simulation run, sampled on process picks.
     */
    getAverageLatency() {
        if (this.latencyLog.length > 0) {
            var avgLat = this.latencyLog.reduce((acc, curr) => acc + curr) / this.latencyLog.length;
            var varLat = this.latencyLog.reduce((acc, curr) => acc + Math.pow((curr - avgLat), 2)) / this.latencyLog.length;
            return {avg: avgLat, dev: Math.sqrt(varLat)};
        } else {
            return {avg: 0, dev: 0};
        }
    }
    /**
     * A simple helper method that returns the average latency of the scheduling class. Should mainly be used once the
     * simulation has ended. If you need latency during a simulation you probably want
     * {@link index.html#schedclassgetlatency SchedClass.getLatency()}.
     * Actual implementations of scheduling classes should not re-implement this method.
     * @return {number} The average latency of the scheduling class in the last simulation run.
     */
    getAverageLatencySimple() {
        return this.getAverageLatency().avg;
    }


    /**
     * A helper method that returns the average turnaround time and standard deviation of it for the given scheduling
     * class. Should mainly be used once the simulation has ended. Because not all processes are guaranteed to end by
     * the time that simulation does, this function also reports the number of processes that have exited and the number
     * of processes that are still running. Turnaround time can be (and is) calculated only for the processes that have
     * already exited.
     * Actual implementations of scheduling classes should not re-implement this method. This function is a
     * class-specific reimplementation of
     * {@link index.html#simulatorgetaverageturnaround Simulator.getAverageTurnaround}.
     * @return {Object} An object with 4 entries pertaining to the processes of this class in the last simulation run:
     * - avg: average process turnaround time,
     * - dev: population standard deviation of process turnaround time,
     * - exited: the number of processes that have exited and were therefore used in turnaround time calculations,
     * - running: the number of processes that were still running and were therefore not used in turnaround time
     * calculations.
     */
    getAverageTurnaround() {
        return Simulator.getAverageTurnaround(this.name);
    }
    /**
     * A simple helper method that returns the average turnaround time of the scheduling class. Should mainly be used
     * once the simulation has ended.
     * Actual implementations of scheduling classes should not re-implement this method. There's a similar method
     * available for all processes in the simulator in
     * {@link index.html#simulatorgetaverageturnaround Simulator.getAverageTurnaround}.
     * @return {number} The average turnaround time of processes belonging to this scheduling class in the last
     * simulation run.
     */
    getAverageTurnaroundSimple() {
        return this.getAverageTurnaround().avg;
    }


    /**
     * A method that returns the class's execution statistics in the form of n*2 2D array of description:value pairs.
     * Used at the end of execution to report the scheduling class's execution statistics. Scheduling class
     * implementations should append any results that they wish to add to the end of the array.
     * @return {Array} A 2D array of results.
     */
    getClassStats() {
        var lat = this.getAverageLatency();
        var res = [
            ["Latency average", lat.avg],
            ["Latency standard deviation", lat.dev],
        ]
        return res;
    }


} /* SchedClass */



/**
 * A simplified scheduling class used only for the idle task. **DO NOT** use this class as a reference when implementing
 * a new one, as it is non-standard and does not make calls to inherited methods! Refer instead to
 * {@link index.html#schedclasstemplate SchedClassTemplate}, which serves as an example scheduling class implementation
 * with extra instructions and explainations.
 * @extends SchedClass
 */
class IdleClass extends SchedClass {
	constructor() {
		super("IdleClass");

		this.runqueue = null;
	}

	init() {

	}

	enqueue() {

	}

	dequeue() {

	}

    /* Runqueue here is just the idle task, return it after calling putPrev. */
	pickNext(prev) {
        Simulator.calledPutPrev = false;
        Simulator.putPrev(prev);
		return this.runqueue;
	}

	putPrev() {
        Simulator.calledPutPrev = true;
	}

    checkPreempt() {
        // this should never even get called
	}

    taskTick() {
        /* Nothing we do here could get us a new process to run, just do nothing. A new process will be run via
         * Simulator.checkPreempt as soon as it appears. */
	}
}


/**
 * An object representing a process in the simulator. It contains all the information needed to simulate a process and
 * its behaviors. Additional fields can be added to the process by including them in the "custom" object inside the
 * process definition in simulation configuration. Scheduling classes can add properties to all processes at once by
 * using the {@link index.html#simulatormodproc Simulator.modProc} method, for example to add timeslices.
 * @param {number} pid A process ID that will be assigned to a new process.
 * @param {string} pname A name for the process to use.
 */
class Process {
	constructor(pid, pname) {
		/* creation variables, set on creation and remain the same */
		/** Process ID, a unique ID that represents one process.
          * @type {number} */
		this.pid = pid;
		/** Process name.
          * @type {string} */
		this.pname = pname;

        /** Process alive status. False before it's spawned (ForkEvent) and after it exits (ExitEvent). This switch is
          * here as an extra safety check to make sure that dead processes stay dead. No zombies please.
          * @type {boolean} */
        this.alive = false;
        /** Process runnable status. Only true when the process is running or can be run (so enqueued or picked). Used
          * for checking whether the process was preempted or blocked on its own.
          * @type {boolean} */
        this.runnable = false;
		/** Process onRq status, true when the process is enqueued on a runqueue. This needs to be precise at all
		  * times! It's updated automatically in the SchedClass super enqueue / dequeue, but if scheduling classes ever
		  * enqueue / dequeue processes in any other way, they need to update this variable accordingly.
		  * @type {boolean} */
		this.onRq = false;
        /** Process waiting status, true when the process is waiting to be executed. This is used for latency
          * calculations and differs from onRq to make sure that latency calculations stay correct even if scheduling
          * classes decide to keep their running process off the runqueue.
		  * @type {boolean} */
		this.waiting = false;
		/** This logs the remaining time that the process wishes to run before it will block voluntarily. That doesn't
		  * mean that it WILL get to run that long though - it might be preempted. If it is preempted, this time
		  * decreases .
		  * @type {number} */
		this.remainingRuntime = 0;

		/** Process scheduing policy, tells us how to schedule it.
          * @type {string} */
		this.policy = "";
		/** Process scheduling class, links the class responsible for scheduling the process.
          * @type {SchedClass} */
		this.schedClass = {};

		/** Process creation timestamp (first enqueue).
          * @type {number} */
		this.spawned = -1;
        /** Process exit timestamp (exit event processed by the simulator).
          * @type {number} */
		this.exited = -1;
		/** Simulation time at which the process was last enqueued (entered the "waiting" status, not literally
          * enqueued on the runqueue). Getting preempted also counts as enqueued! The time of the last actual enqueue
          * can be found in Process.execLog as the most recent {@link LogEntry} where LogEntry.evt
          * === {@link LogEvent}.enqueue.
          * @type {number} */
		this.enqueued = -1;
		/** Simulation time at which the process was last picked.
          * @type {number} */
		this.picked = -1;
        /** Simulation time at which the process was last updated. This value can be used by the scheduling classes in
          * whatever way they see fit, but most likely for calculating process time slice usage.
          * @type {number} */
        this.updated = -1;
		/** The next event related to this process that shall occur. Important value: nextEvent.time: time at which the
          * next event related to this process shall occur (enqueue, block, exit).
          * @type {Event} */
		this.nextEvent = null;
		/** A specific, non-nice, simulation time ({@link ExitCond ExitCond.simExec}) based exit event of this process,
		  * if it was set. We need it for specific cases where this exit event was set, but the process got preempted
		  * and could end up in runqueue when it needs to end.
		  * @type {ExitEvent} */
		this.strictEndEvent = null;

		/** Process execution counter, counts the number of times that the process was picked.
          * @type {number} */
		this.execCnt = 0;
		/** Process execution timer, logs the amount of simulation nanoseconds that the process has spent running.
          * @type {number} */
		this.execTime = 0;
		/** Process wait timer, logs the amount of simulation nanoseconds that the process has spent in a runqueue.
          * @type {number} */
		this.waitTime = 0;

		/** Current behavior struct, describes the way that the process behaves at current time of simulation.
          * @type {Object} */
		this.currBehavior = null;
		/** Next behavior index, holds the index of the behavior entry in {@link Process#behavior} list that will
		  * be used to update the process's behavior next.
          * @type {number} */
		this.nextBehIndex = 0;
		/** Process behavior list, holds all the possible behaviors that the process can enter during its run.
          * @type {Object[]} */
		this.behavior = [];

		/** Execution log, holds history of the process's execution in the form of {@link LogEntry} entries.
          * @type {LogEntry[]} */
		this.execLog = [];
        /**
         * Run log, holds history of the process's run times, where each entry is taken when the process stops executing
         * on the simulated processor.
         * @type {number[]} */
        this.runLog = [];
        /**
         * Latency log, holds history of the process's wait times, where each entry is taken when the process is picked
         * (or exits).
         * @type {number[]} */
        this.latencyLog = [];
	}
}


/**
 * Idle process class.
 * @extends Process
 */
class IdleProcess extends Process {
    constructor() {
        super(-1, "idle");

        this.policy = "IdleClass";
        this.schedClass = {};
        this.alive = true;

        /* one behavior: run forever */
        this.behavior = [{
            priority: Infinity, // higher number === lower priority!!!
            run: 1,		// should be set to match simulation duration
            block: 0	// basically unneeded
        }];
    }
}


/**
 * An object representing an event in the simulator. Other event types are extended from it and exist in global
 * namespace.
 * @namespace Event
 * @param {number} time Time of event in nanoseconds of the simulation.
 */
class Event {
	constructor(time) {
		this.time = time;
        this.setOn = Simulator.time();
	}
}

/**
 * SimStartEvent is the first event in a simulation and starts things up. Mainly responsible for the first process pick.
 * @memberof Event
 * @extends Event
 * @param {number} time Time of event in nanoseconds of the simulation.
 */
class SimStartEvent extends Event {
	constructor(time) {
		super(time);
	}
}

/**
 * SimStopEvent ends the simulation when read.
 * @memberof Event
 * @extends Event
 * @param {number} time Time of event in nanoseconds of the simulation.
 */
class SimStopEvent extends Event {
	constructor(time) {
		super(time);
	}
}

/**
 * ForkEvent happens when a new process is created (forked / spawned) and added to the simulation. In other words, it is
 * the first event that any new process will cause.
 * @memberof Event
 * @extends Event
 * @param {number}	time	Time of event in nanoseconds of the simulation.
 * @param {Process}	process	The process object that just got spawned.
 */
class ForkEvent extends Event {
	constructor(time, process) {
		super(time);
		this.process = process;
	}
}

/**
 * ExitEvent happens when a process completes its execution and exits.
 * @memberof Event
 * @extends Event
 * @param {number}	 time		Time of event in nanoseconds of the simulation.
 * @param {Process}  process	The process that is exiting.
 * @param {ExitCond} cond		The exit condition that set the event. Available types: procExec, simExec, execCnt.
 * @param {boolean}  nice		Defines whether the process should exit nicely, after it finishes its execution or is
 * 								preempted, or abruptly, right away.
 */
class ExitEvent extends Event {
	constructor(time, process, cond, nice) {
		super(time);

		this.process = process;
		this.type = cond;
		this.nice = nice;
	}
}

/**
 * EnqueueEvent happens when a process is enqueued on the runqueue of a scheduling class. In other words, it happens
 * when a process wishes to be executed and enters a runnable state.
 * @memberof Event
 * @extends Event
 * @param {number} time Time of event in nanoseconds of the simulation.
 */
class EnqueueEvent extends Event {
	constructor(time, process) {
		super(time);
		this.process = process;
	}
}

/**
 * BlockEvent happens when a process finishes executing on its own and exits runnable state (blocks). It means that the
 * process has exited runnable state and is waiting for something (IO, event, ...). In simulation this means that we
 * need to set an enqueue event for when block time passes.
 * @memberof Event
 * @extends Event
 * @param {number}	time	Time of event in nanoseconds of the simulation.
 * @param {Process}	process	The process that has just blocked.
 */
class BlockEvent extends Event {
	constructor(time, process) {
		super(time);
		this.process = process;
	}
}

/**
 * TimerEvent happens when a timer finishes its countdown. It generally means a scheduler interruption and a process
 * preemption decision.
 * @memberof Event
 * @extends Event
 * @param {number} time Time of event in nanoseconds of the simulation.
 */
class TimerEvent extends Event {
	constructor(time) {
		super(time);
	}
}

/**
 * PickEvent is a special type of event that does not get used in the simulationQueue. Its purpose is logging the picked
 * prosses in the simEventLog (simEvents array of {@link SimResult}).
 * @memberof Event
 * @extends Event
 * @param {number} time Time of event in nanoseconds of the simulation.
 */
class PickEvent extends Event {
	constructor(time, process) {
		super(time);
        this.process = process;
	}
}


/**
 * Simulation result object. Holds all the results of the simulation, such as simulation variables, statistics and
 * processes with process logs. // TODO: quick start guide, how to run a simulation
 *
 * @param {number}		    timestamp           The time at which simulation was completed, in milliseconds since the
 * Unix epoch (1.1.1970, 00:00:00 UTC).
 *
 * @property {string}       name                Simulation run name, used to distinguish it from others.
 *
 * @property {number}       wallClockTime       The time it took for the simulation to complete, measured in
 * milliseconds from the start of the simulation (stored as {@link Simulator simWallTimeStart} in the Simulator
 * object). This measurement functions as a benchmark when running a simulation all at once or as a measurement of time
 * spent examining it when running step-by-step (as it also includes the time for which the simulation was paused).
 *
 * @property {boolean}      finished            Tells whether the simulation is really complete (true) or if this is
 * just a partial result of step-by-step execution (false). Partial results do not include any statistics.
 *
 * @property {number}       runTime             Time the simulation spent running. If the simulation is finished this is
 * the same as length.
 *
 * @property {number}       length              Simulation length in simulation nanoseconds.
 *
 * @property {number}       contextSwitches     The number of times that a new process as picked during simulation.
 *
 * @property {Process[]}    processList         An array of all processes that were loaded into the simulation, in the
 * order in which they were added. The index of a process in the array matches its process ID.
 *
 * @property {Event[]}      simEvents		    An array of all events that happened in a simulation, in the order that
 * they happened. Events that change the currently running process have also had the process that they ended up running
 * attached to their process field.
 *
 * @property {number}       averageLoad         A value between 0 and 1 that describes the ratio of time spent executing
 * processes (other than idle). Effectively the fraction of time for whiich the processor was in use.
 *
 * @property {Object}       averageLatency      An object with the entries ***general*** and ***byClass***:
 *
 * ***general***: (Object) General simulator latency statistics, generated by
 * {@link index.html#simulatorgetaveragelatency Simulator.getAverageLatency} for the classes whose processes were used
 * in the last simulation run. Included fields are:
 * - **avg** (floating point number):   average process turnaround time,
 * - **dev** (floating point number):   population standard deviation of process turnaround time,
 *
 * ***byClass***: (Object[]) Class specific average latency measurements.
 *
 * Each of class specific results is an object with entries:
 * - **name**: (string) name of the scheduling class
 * - **avg**: (floating point number) average latency of processes in this class during the last simulation run,
 * sampled on process picks.
 * - **dev**: (floating point number) population standard deviation of processes in this class during the last
 * simulation run, sampled on process picks.
 *
 *
 * @property {Object}       averageTurnaround   An object with 4 entries pertaining to the processes in the last
 * simulation run:
 * - **avg** (floating point number):       average process turnaround time,
 * - **dev** (floating point number):       population standard deviation of process turnaround time,
 * - **exited** (integer):  the number of processes that have exited and were therefore used in turnaround time
 * calculations,
 * - **running** (integer): the number of processes that were still running and were therefore not used in turnaround
 * time calculations.
 *
 * @property {string[]}     activeClasses       The names of classes whose processes were included in the last run.
 *
 * @property {Object}       classStats          An object containing the statistics obtained from each of the active
 * classes by calling {@link index.html#schedclassgetclassstats SchedClass.getClassStats} on them. Object keys are
 * scheduling class names.
 *
 * @property {Object[]}     processStats        An array of objects returned by
 * {@link index.html#simulatorprocstats Simulator.procStats} that holds per-class statistics for the simulation.
 * Processes in this array are indexed by their process id (PID).
 *
 */
class SimResult {
	constructor(timestamp) {
		this.timestamp = timestamp;
        this.name = "";
        this.wallClockTime = 0;
        this.finished = null;
        this.runTime = 0;

		this.length = 0;
		this.contextSwitches = 0;

		this.processList = [];
		this.simEvents = [];

        this.averageLoad = -1;
        this.averageLatency = {};
        this.averageTurnaround = {};

        this.classStats = {};
        this.processStats = [];
	}
}



/**
 * @namespace Simulator
 * @description A scheduling simulator inspired by the Linux Completely Fair Scheduler design and implemented in
 * JavaScript. This is the main class representing the simulator namespace.
 *
 * @property {string}   simulatorVersion  Private variable, access with
 * {@link index.html#simulatorgetversion Simulator.getVersion()}. Holds the current version of the simulator.
 *
 * @property {string}   simulationName  Private variable. Holds the name that is used for distinguishing a simulation
 * run (and simulation result) from others.
 *
 * @property {number}	simulationLen	Private variable, access with
 * {@link index.html#simulatorsetsimlen Simulator.setSimLen(number)}. This variable holds the length of time in
 * simulation nanoseconds for which the simulation should run.
 *
 * @property {number}   timerTickLen      Private variable, access with
 * {@link index.html#simulatorgettimerticklen Simulator.getTimerTickLen()} and
 * {@link index.html#simulatorsettimerticklen Simulator.setTimerTickLen(number)}. The frequency with which the task tick
 * timer event will occur, in simulation nanoseconds. By default it will occur every millisecond.
 * This variable cannot be changed while a simulation is running.
 *
 * @property {string}   schedClassName  Private variable. The name of the scheduling class to which the processes
 * without individual scheduling class specifications belong.
 *
 * @property {boolean}  preemption      Public variable. Global preemption switch. Set to true by default, it allows the
 * scheduling classes to decide on their own whether to use preemption or not. When set to false, it disables task tick
 * timer events, as well as stops simulator from making calls to checkPreempt. (not fully tested on false)
 *
 * @property {boolean}	processesLoaded	Private variable. Tells us whether all the processes were successfully loaded
 * into the simulation.
 *
 * @property {boolean}	simNameSet		Private variable. Tells us whether simulation name was set. Used when checking
 * if the simulation can be run.
 *
 * @property {boolean}	simLenSet		Private variable. Tells us whether simulation length was set. Used when
 * checking if the simulation can be run.
 *
 * @property {boolean}	timerTickLenSet Private variable. Tells us whether simulation timer tick length was set.
 * Used when checking if the simulation can be run.
 *
 * @property {boolean}	schedClassNameSet Private variable. Tells us whether a default scheduling class for the
 * simulation was set. Used in process initializations.
 *
 * @property {boolean}  simInitDone     Private variable. True after simulation init has been done and before the
 * simulation was run.
 *
 * @property {boolean}  simRunning      Private variable. True while a simulation is running.
 *
 * @property {number}   simWallTimeStart Private variable. Holds the actual, real-world time (wall clock time) at which
 * the simulation was started. Calculated into {@link SimResult SimResult.wallClockTime} in final result, it functions
 * as a benchmark when running a simulation all at once or as a measurement of time spent examining it when running
 * step-by-step.
 *
 * @property {number}	simulationTime	Private variable, access with {@link index.html#simulatortime Simulator.time()}.
 * The main simulation clock, holds the amount of time that has passed up to this point in the simulation. The unit of
 * this field is simulated nanoseconds, as are all other times in the simulator (unless explicitly stated differently).
 *
 * @property {number}	contextSwitches	Private variable, access with
 * {@link index.html#simulatorgetcontextswitches Simulator.getContextSwitches()}. The number of times that a new process
 * was picked during simulation.
 *
 * @property {number}   liveProcessCount Private variable. Tracks the number of processes in the simulation that have
 * not yet exited. Used for potentially ending the simulation when all the processes exit.
 *
 * @property {Tree}		simulationQueue	Private variable, access with
 * {@link index.html#simulatorgetsimulationqueue Simulator.getSimulationQueue()}. The main simulation queue. Every event
 * that occurs in the simulation gets added to this queue before it happens and removed from it afterwards. It is
 * implemented as a red-black self-balancing binary tree in order to stay ordered, as well as allow us to add and remove
 * events in logarithmic time. When more than one event happens at the same time they are stored in the tree as an
 * array. For the red-black tree implementation details, refer to {@link ../redblack.js}.
 *
 * **WARNING**: one should never access the simulation queue directly! Instead, methods for working with it are
 * provided:
 * * {@link index.html#simulatorinsertevent insertEvent} to insert event at a given time,
 * * {@link index.html#simulatorgetevent getEvent} to retrieve and remove a specific event from the queue,
 * * {@link index.html#simulatordeleteevent deleteEvent} to retrieve and remove a specific event from the queue
 * (identical to getEvent),
 * * {@link index.html#simulatorgetnextevent getNextEvent} to get the next event to be processed in the simulation and
 * remove it from the queue (leftmost from tree),
 * * {@link index.html#simulatorpeeknextevent peekNextEvent} to inspect the next event to be processed in the simulation
 * without removing it from the queue (leftmost from tree).
 *
 * @property {Event[]}	simEventLog     Private variable. access with
 * {@link index.html#simulatorgetsimeventlog Simulator.getSimEventLog()}. Holds the simulation events that were
 * already completed, in form of a queue. Pick events have added processes that they picked. This array is used in
 * simulation result instedad of the simulation queue, which is a working structure that constantly changes.
 *
 * @property {Object}	schedClassRegistered  Private variable, access with
 * {@link index.html#simulatorgetschedclassregistered Simulator.getSchedClassRegistered()}. An object that holds all the
 * registered scheduling classes in the form of name:class pairs ({@link string}: {@link SchedClass}). Not to be
 * confused with schedClassActive, that holds only the active classes - that is, the classes that the loaded simulation
 * actually uses.
 *
 * @property {Object}	schedClassPrioRegistered Private variable, access with
 * {@link index.html#simulatorgetschedclassprioregistered Simulator.getSchedClassPrioRegistered()}. An array of strings
 * that holds the names of all registered scheduling classes in order of descending priority. Any new scheduling class
 * gets added at the end. Scheduling classes should thus be registered in order from highest to lowest priority. This
 * can be done by ordering script tags in html head in the desired priority order. Not to be confused with
 * schedClassPrio, that holds only the names of active classes, ordered by priority.
 *
 * @property {Object}	schedClassActive Private variable, access with
 * {@link index.html#simulatorgetschedclassactive Simulator.getSchedClassActive()}. An object that holds all the ACTIVE
 * registered scheduling classes in the form of name:class pairs ({@link string}: {@link SchedClass}). Active scheduling
 * classes are all the classes that are actually used in the loaded simulation. Not to be confused with
 * schedClassRegistered, that holds all the registered classes, even if they aren't active.
 *
 * @property {Object}	schedClassPrio  Private variable, access with
 * {@link index.html#simulatorgetschedclassprio Simulator.getSchedClassPrio()}. An array of strings that holds the names
 * of all ACTIVE registered scheduling classes in order of descending priority. The priority order is initially copied
 * from schedClassPrioRegistered, which includes initial priorities of all classes, regardles of whether they're active
 * or not.
 *
 * @property {Process[]} procList		Private variable, access with
 * {@link index.html#simulatorgetproclist Simulator.getProcList()}. An array of all processes that were loaded into the
 * simulation, in the order in which they were added. The index of a process in the array matches its process ID.
 *
 * @property {boolean}	calledPutPrev	Public variable. Changed to true when a call to
 * "{@link SchedClass#putPrev putPrev()}" method of the {@link SchedClass scheduling class} of last executed process is
 * made. This is a bit of a safeguard to make sure that "pickNext()" implementations of
 * {@link SchedClass scheduling classes} make this call and make it only when they actually return a process.
 *
 * @property {Process}	curr			Private variable, access with
 * {@link index.html#simulatorgetcurr Simulator.getCurr()}. The currently running process. Used to track the process
 * that is currently running during the simulation.
 *
 * @property {Process}	idle			Private variable, access with
 * {@link index.html#simulatorgetidle Simulator.getIdle()}. The simulator idle process. This process is run when nothing
 * else is available.
 *
 * @property {Process}	idleClass		Private variable. The idle scheduling class. This is a simplified class that
 * only handles the idle task and does not implement all the features that regular scheduling classes should.
 */
var Simulator = {};
(function(sim) {
	/* private variables -------------------------------------------------------------------------------------------- */
    var simulatorVersion = "1.0.0";

    var defaultTimerTickLen = 1000000;  // 1ms, set this high so that long simulations that forget it don't freeze

    var simNameSet = false;
    var simLenSet = false;
    var timerTickLenSet = false;
    var schedClassNameSet = false;
    var processesLoaded = false;

    var simInitDone = false;
    var simRunning = false;
    var simWallTimeStart = 0;

    var simulationName = "";
    var timerTickLen = 0;
	var simulationLen = 0;
    var schedClassName = "";

    var simulationTime = 0;
	var contextSwitches = 0;
    var liveProcessCount = 0;

	var simulationQueue = null;
	var simEventLog = [];
    var schedClassRegistered = {};
    var schedClassPrioRegistered = [];
    var schedClassActive = {};
	var schedClassPrio = [];
	var procList = [];

	var curr = null;
	var idle = null;
	var idleClass = null;

	/* public variables --------------------------------------------------------------------------------------------- */
    sim.preemption = true;

    sim.calledPutPrev = false;


	/* simple getters and setters ----------------------------------------------------------------------------------- */

    /**
     * Simulator.getVersion; Returns {@link Simulator simulatorVersion}, the current version of the simulator.
     * @memberof Simulator
     * @return {string} The current version of the simulator.
     */
    sim.getVersion = function() {
        return simulatorVersion;
    }

	/**
	 * Simulator.getSimulationQueue; returns {@link Simulator simulationQueue}, a red-black tree containing upcoming
	 * simulation Events. **WARNING**: never access this directly! A list of methods for working with
	 * {@link Simulator simulationQueue} is provided in its description under Simulator entry.
	 * @memberof Simulator
	 * @return {Tree} simulationQueue
	 */
	sim.getSimulationQueue = function() {
		return simulationQueue;
	}

    /**
	 * Simulator.getSimEventLog; returns {@link Simulator simEventLog}, an array containing simulation Events that have
	 * already happened, in chronological order.
	 * @memberof Simulator
	 * @return {Event[]} simEventLog
	 */
    sim.getSimEventLog = function() {
        return simEventLog;
    }

    /**
	 * Simulator.getSchedClassRegistered; returns {@link Simulator schedClassRegistered}.
	 * @memberof Simulator
	 * @return {Object} schedClassRegistered
	 */
    sim.getSchedClassRegistered = function() {
        return schedClassRegistered;
    }

    /**
	 * Simulator.getSchedClassPrioRegistered; returns {@link Simulator schedClassPrioRegistered}.
	 * @memberof Simulator
	 * @return {string[]} schedClassPrioRegistered
	 */
	sim.getSchedClassPrioRegistered = function() {
		return schedClassPrioRegistered;
	}

    /**
	 * Simulator.getSchedClassActive; returns {@link Simulator schedClassActive}.
	 * @memberof Simulator
	 * @return {Object} schedClassActive
	 */
	sim.getSchedClassActive = function() {
		return schedClassActive;
	}

	/**
	 * Simulator.getSchedClassPrio; returns {@link 0Simulator schedClassPrio}.
	 * @memberof Simulator
	 * @return {string[]} schedClassPrio
	 */
	sim.getSchedClassPrio = function() {
		return schedClassPrio;
	}

	/**
	 * Simulator.getProcList; returns {@link Simulator procList}, the list of all processes in the simulation.
	 * @memberof Simulator
	 * @return {Process[]} procList
	 */
	sim.getProcList = function() {
		return procList;
	}

	/**
	 * Simulator.getContextSwitches; returns the number of context switches, stored in
	 * {@link Simulator contextSwitches}.
	 * @memberof Simulator
	 * @return {number} The number of context switches in the simulation so far.
	 */
	sim.getContextSwitches = function() {
		return contextSwitches;
	}

	/**
	 * Simulator.getIdle; returns the simulation {@link Simulator idle} process.
	 * @memberof Simulator
	 * @return {Process} The idle process.
	 */
	sim.getIdle = function() {
		return idle;
	}

	/**
	 * Simulator.getCurr; returns the currently running process {@link Simulator curr}.
	 * @memberof Simulator
	 * @return {Process} The currently running process.
	 */
	sim.getCurr = function() {
		return curr;
	}

    /**
     * Simulator.getLiveProcessCount; returns {@link Simulator liveProcessCount}: the number of live processes, that is
     * the number of processes, that are not necessarily on the runqueue nor even forked and have simply not exited
     * yet.
     * @memberof Simulator
     * @return {number}
     */
    sim.getLiveProcessCount = function() {
        return liveProcessCount;
    }

    /**
     * Simulator.setSimName; Set the simulationName variable that's used to distinguish a particular simulation run
     * (and simulation result) from others. Will set a general name when called without an argument.
     * @memberof Simulator
     * @param  {string} name Simulation name.
     */
    sim.setSimName = function(name) {
        if (name !== undefined && typeof(name) === "string") {
            simulationName = name;
        } else {
            simulationName = "unnamed simulation";
        }
        simNameSet = true;
    }
    /**
     * Simulator.getSimName; Returns the current simulation name.
     * @memberof Simulator
     * @return {string} Simulation name.
     */
    sim.getSimName = function() {
        return simulationName;
    }


    /**
	 * Simulator.setSimLen; Sets the simulation length in simulated nanoseconds.
	 * @memberof Simulator
	 * @param  {number} time The amount of nanoseconds for which the simulation should run.
	 */
	sim.setSimLen = function(time) {
		if (time === undefined || typeof(time) !== "number" || time < 0) {
            throw new Error("Simulator.setSimLen was called with an invalid time value.");
		}

        simulationLen = time;
        simLenSet = true;
	}
	/**
	 * Simulator.getSimLen; Returns length of simulation in simulated nanoseconds.
	 * @memberof Simulator
	 * @return {number}      Time.
	 */
	sim.getSimLen = function() {
		return simulationLen;
	}


    /**
     * Simulator.setTimerTickLen; Set the timerTickLen parameter that decides the frequency of task tick timer events.
     * This function should only be called while a simulation is not in progress.
     * @memberof Simulator
     * @param  {number} timLen A positive integer, representing the frequency of timer ticks in simulation nanoseconds.
     * This number should be larger than 1, since setting it to 1 would prevent the simulator from setting any other
     * events.
     */
    sim.setTimerTickLen = function(timLen) {
        if (simRunning) {
            throw new Error("attempting to change timerTickLen while simulation is running. Did you forget to stop " +
                            "it beforehand (Simulator.break())?");
        } else if (typeof(timLen) !== "number" || timLen <= 1) {
            throw new Error("setTimerTickLen expects a positive number larger than 1, instead found: "+timLen);
        }

        timerTickLen = timLen;
        timerTickLenSet = true;
    }
    /**
     * Simulator.getTimerTickLen; Returns timerTickLen that decides the frequency of task tick timer events.
     * @memberof Simulator
     * @return {number} The frequency of task tick timer events in simulation nanoseconds.
     */
    sim.getTimerTickLen = function() {
        return timerTickLen;
    }
    /**
     * Simulator.getDefaultTimerTickLen; Returns defaultTimerTickLen that decides the frequency of task tick timer
     * events. This method exists because timer tick length is not obligatory in definitions, so the default value
     * should be accessible from outside too.
     * @memberof Simulator
     * @return {number} The frequency of task tick timer events in simulation nanoseconds.
     */
    sim.getDefaultTimerTickLen = function() {
        return defaultTimerTickLen;
    }


    /**
     * Simulator.setSchedClassName; Set the schedClassName parameter that decides the default scheduling class for the
     * processes that don't have one defined explicitly.
     * It makes sense to call {@link index.html#simulatorloadproc Simulator.loadProc} after this to update process
     * scheduling classes.
     * This function should only be called while a simulation is not in progress.
     * @memberof Simulator
     * @param  {string} name The name of the scheduling class that we wish to set as default. Needs to be already
     * registered in the simulator.
     */
    sim.setSchedClassName = function(name) {
        if (simRunning) {
            throw new Error("attempting to change schedClassName while simulation is running. Did you forget to stop " +
                            "it beforehand (Simulator.break())?");
        } else if (typeof(name) !== "string" || !(schedClassPrioRegistered.includes(name))) {
            throw new Error("invalid schedClassName given: " + name);
        }

        schedClassName = name;
        schedClassNameSet = true;
    }
    /**
     * Simulator.getSchedClassName; Returns schedClassName that decides the default scheduling class for the processes
     * that don't have one defined explicitly.
     * @memberof Simulator
     * @return {string} The name of the default scheduling class.
     */
    sim.getSchedClassName = function() {
        return schedClassName;
    }


    /**
     * Simulator.handleSuffix;
     * Handle suffixes "ns, us, ms, s, min" for simulation configuration entries that support them. The entries with
     * suffixes are converted to appropriate number of nanoseconds and processed as numbers henceforth.
     * @memberof Simulator
     * @param  {(string | string[] | number | number[])} entry The entry to be checked.
     * @param  {string} location A description of the entry's location to be used in case of errors.
     * @param  {number} defaultScale The number by which the values with no suffix should be multiplied.
     * @return {(number | number[])} Converted value or array of values. If nothing to convert was found or the input
     * is of wrong type, the input is just returned.
     */
    sim.handleSuffix = function(entry, location, defaultScale) {
        /* an internal function that actually converts the values */
        var convertVal = function(input) {
            if (typeof(defaultScale) !== "number") {
                defaultScale = 1;
            }

            let regex = /^\s*(\d*)[.,]*(\d*)\s*(|ns|us|\u00b5s|microseconds*|ms|milliseconds*|s|secs*|seconds*|m|mins*|minutes*|h|hrs*|hours*)\s*$/i;
            let analysis = regex.exec(input);
            if (typeof(input) === "string" && analysis !== null) {

                let num = parseFloat(analysis[1] + "." + analysis[2]);

                if (isNaN(num)) {
                    throw new Error("invalid value found in " + location + ": " + input);
                }

                switch (analysis[3].toLowerCase()) {
                case "":
                    num *= defaultScale;
                    break;
                case "ns": case "nanosecond": case "nanoseconds":
                    break;
                case "us": case "µs": case "microsecond": case "microseconds":
                    num *= 1000;
                    break;
                case "ms": case "millisecond": case "milliseconds":
                    num *= 1000000;
                    break;
                case "s": case "sec": case "secs": case "second": case "seconds":
                    num *= 1000000000;
                    break;
                case "m": case "min": case "mins": case "minute": case "minutes":
                    num *= 60000000000;
                    break;
                case "h": case "hr": case "hrs": case "hour": case "hours":
                    num *= 3600000000000;
                    break;
                }

                return Math.round(num);
            } else {
                throw new Error("invalid value found in " + location + ": " + input);
            }
        }

        /* find and replace the string values */
        if (entry instanceof Array) {
            for (let i = 0; i < entry.length; i++) {
                if (typeof(entry[i]) !== "number") {
                    entry[i] = convertVal(entry[i]);
                }
            }
        } else if (typeof(entry) === "string") {
            entry = convertVal(entry);
        } else if (typeof(entry) !== "number") {    // catch any unsupported types
            throw new Error("invalid value found in " + location + ": " + entry);
        }
        return entry;
    };


	/* simulator private functions ---------------------------------------------------------------------------------- */
	/* These are  the helper functions that should only be used by the simulator, from within the simulator. They are
	 * not and should not be visible from the outside and to the sched classes. */

	/**
	 * getProcVal; private method - accessible only within simulator.
	 * A method that parses a value in process definition and returns either its exact value in case of a number, or
	 * a randomly selected number from the interval in case of an interval (array with two numbers).
	 * @memberof Simulator
	 * @param  {(number|number[])} entry A value from process definition.
	 * @return {number}       An exact integer value to use.
	 */
	var getProcVal = function (entry) {
		if (entry !== undefined) {
			if (typeof(entry) === "number") {
				return entry;
			} else if (entry instanceof Array && entry.length === 2 && typeof(entry[0]) === "number" &&
				typeof(entry[1]) === "number"  && entry[0] <= entry[1]) {
					return entry[0] + Math.floor( Math.random() * (entry[1] - entry[0]) );
			}
		}
		throw new Error("parsing an ivnalid entity with getVal.");
	}


    /**
     * checkProcProp; private method - accessible only within simulator.
     * Checks any additional property names that the user has added to the processes, either via configuration or via
     * {@link index.html#simulatormodproc Simulator.modProc} method. Makes sure that the property names are valid and
     * don't overwrite any existing properties that are essential for the proper functioning of the simulator. Out of
     * all process properties, the exception that CAN be overwritten is "updated", since its there for the purposes of
     * scheduling classes (it's mainly meant for timeslice calculations).
     * @memberof Simulator
     * @param  {(string | string[])} property A property name or array of names to be checked.
     * @return {boolean} Returns true if all property names are valid (really just errors out otherwise).
     */
    var checkProcProp = function(property) {
        var bannedNameList = [
            "pid", "pname", "alive", "onRq", "waiting", "remainingRuntime", "policy", "schedClasss", "spawned",
            "exited", "enqueued", "picked", "nextEvent", "strictEndEvent", "execCnt", "execTime", "waitTime",
            "currBehavior", "nextBehIndex", "behavior", "execLog", "latencyLog", "runLog"];
        if (typeof(property) === "string") {
            if (bannedNameList.includes(property)) {
                throw new Error("reserved process property discovered, please use another name: "+property);
            }
        } else if (property instanceof Array) {
            for (let i = 0; i < property.length; i++) {
                if (typeof(property[i]) !== "string") {
                    throw new Error("process property with index "+i+" is of invalid type. Expected string, found "+typeof(property[i]));
                }
                if (bannedNameList.includes(property[i])) {
                    throw new Error("reserved process property discovered, please use another name: "+property[i]);
                }
            }
        } else {
            throw new Error("process property of wrong type, expected string or string[], found: "+typeof(property))
        }
        return true;
    }


	/**
	 * insertEvent; private method - accessible only within simulator.
 	 * Insert an event into the simulation queue at a precise time. This function should **ALWAYS** be used when pushing
 	 * an event into the tree, one should never insert into simulationQueue directly because doing so can overwrite any
 	 * events already set at that time. This function handles that by creating an array when more than one event is
 	 * scheduled at the same time. Similarly, for accessing events one should always use the provided functions (such
 	 * as {@link index.html#simulatorgetevent getEvent}).
 	 * @memberof Simulator
 	 * @param  {Event}	evt The event to be inserted into the simulation queue.
 	 * @return {Event}	The same event.
 	 */
	var insertEvent = function(evt) {
        var putTime = evt.time;
        if (putTime < sim.time()) {
            throw new Error("cannot insert event at a time that has already passed.");
        }

        var holder = simulationQueue.getDelete(putTime);
        if (holder instanceof Event) {
            holder = [holder, evt];
        } else if (holder instanceof Array) {
            holder.push(evt);
        } else {
            holder = evt;
        }
        simulationQueue.insert(putTime, holder);
        return evt;
	}

    /**
	 * getEvent; private method - accessible only within simulator.
 	 * Get an event and delete it from simulationQueue. One should **NEVER** access the simulationQueue directly because
 	 * multiple events can be stored at the same time in the form of an array and they need to be handled properly in
 	 * order to not accidentally delete any. Similarly, for inserting events into the queue one should always use
 	 * {@link index.html#simulatorinsertevent insertEvent}.
 	 * @memberof Simulator
 	 * @param  {Event}	evt The event to get from the simulation queue.
 	 * @return {Event}	The desired event (same as parameter).
 	 */
    var getEvent = function(evt) {
        if (!(evt instanceof Event)) {
            throw new Error("pass a valid event as an argument.");
        }
        var getTime = evt.time;
        if (getTime < sim.time()) {
            throw new Error("cannot get an event that has already passed, check simEventLog instead.");
        }

        var holder = simulationQueue.getDelete(getTime);
        if (holder instanceof Event) {
            return holder;
        } else if (holder instanceof Array) {
            if (holder.length === 1) {
                return holder[0];
            } else if (holder.length === 2) {
                if (holder[0] === evt) {
                    simulationQueue.insert(getTime, holder[1]);
                    return holder[0];
                } else if (holder[1] === evt) {
                    simulationQueue.insert(getTime, holder[0]);
                    return holder[1];
                } else {
                    throw new Error("the event was not found at the time it should be at: "+evt);
                }
            } else if (holder.length > 2) {
                let retVal;
                for (let i = 0; i < holder.length; i++) {
                    if (holder[i] === evt) {
                        retVal = holder.splice(i, 1)[0];
                        simulationQueue.insert(getTime, holder);
                        return retVal;
                    }
                }
                throw new Error("the event was not found at the time it should be at: "+evt);
            }
        } else {
            throw new Error("the event was not found at the time it should be at: "+evt);
        }
	}

    /**
     * deleteEvent; private method - accessible only within simulator.
     * Same as {@link index.html#simulatorgetevent getEvent}, but provided for code clarity.
     * @memberof Simulator
     * @param  {Event}	evt The event to get from the simulation queue.
 	 * @return {Event}	The desired event (same as parameter).
     */
    var deleteEvent = function(evt) {
        return getEvent(evt);
    }

    /**
     * getNextEvent; private method - accessible only within simulator.
     * Return the next event to be processed in the simulation and delete it from the simulationQueue. This method
     * should be used only to process the next event of the simulation, to just check it there is
     * {@link index.html#simulatorpeeknextevent peekNextEvent}. The simulationQueue should **NEVER** be accessed
     * directly, use the provided functions (such as this one) that take into account its peculiarities instead!
     * @memberof Simulator
     * @return {Event} The next event in the simulation.
     */
    var getNextEvent = function() {
        var holder = simulationQueue.leftmostDelete();
        if (holder instanceof Event) {
            return holder;
        } else if (holder instanceof Array) {
            if (holder.length === 1) {
                return holder[0];
            } else if (holder.length === 2) {
                simulationQueue.insert(holder[1].time, holder[1]);
                return holder[0];
            } else if (holder.length > 2) {
                let retVal = holder.shift();
                simulationQueue.insert(holder[0].time, holder);
                return retVal;
            }
        } else {
            throw new Error("the simulation queue is empty or has an invalid value stored in it.");
        }
    }

    /**
     * peekNextEvent; private method - accessible only within simulator.
     * Return the next event to be processed in the simulation without deleting it from the simulationQueue. This method
     * should be used only to inspect the next event of the simulation, to actually process it there is
     * {@link index.html#simulatorgetnextevent getNextEvent}. The simulationQueue should **NEVER** be accessed directly,
     * use the provided functions (such as this one) that take into account its peculiarities instead!
     * @memberof Simulator
     * @return {Event} The next event in the simulation.
     */
    var peekNextEvent = function() {
        var holder = simulationQueue.leftmost();
        if (holder instanceof Event) {
            return holder;
        } else if (holder instanceof Array) {
            return holder[0];
        } else {
            throw new Error("the simulation queue is empty or invalid value stored in it.");
        }
    }


	/**
	 * handlePreempt; private method - accessible only within simulator.
	 * Handle preemption of a processs depending on its end event (block or exit).
	 * @memberof Simulator
	 * @param  {Process} proc The process that got preempted.
	 */
	var handlePreempt = function(proc) {
        if (!proc.alive) {
            throw new Error("attempting to handle a dead process.");
        }

        var now = sim.time();

        /* Calculate last run time. */
        var lastRun = now - proc.picked;
		/* Decrease remaining runtime. */
		proc.remainingRuntime -= lastRun;

        /* It can happen that a process gets preempted right at the same nanosecond when it should block or exit, before
         * its end event is processed. Such cases get handled here to avoid having waiting processes with remaining
         * runtime of zero, as they cause all sorts of edge cases and headaches.
         *
         * if (proc.remainingRuntime <= 0 || proc.nextEvent.time === now) { ... }
         * - if either condition is true then both need to be, check for errors
         * - determine end event (next, this same time)
         * - push event to event log
         * - call handlers depending on type (block / exit)
         * - delete event from runqueue
         * - delete event from process
         * - return after handling, since these are special cases
         */
        if (proc.remainingRuntime <= 0 || proc.nextEvent.time === now) {
            if (proc.remainingRuntime > 0) {
                throw new Error("next event of preempted process at current time, but remainingRuntime > 0: " + proc.remainingRuntime);
            } else if (proc.nextEvent.time !== now) {
                throw new Error("remainingRuntime == 0 for preempted process at "+now+", but its next event is at "+proc.nextEvent.time);
            }

            /* push event to event log */
            simEventLog.push(proc.nextEvent);
            /* handleBlock replaces nextEvent with enqueue and we lose the reference to our block event. If we just
             * delete nextEvent after handleBlock call, we end up deleting the enqueue event. Save our block event
             * before the call and delete it afterwards.
             * handleExit just leaves nextEvent as is (in this case), but saving it in advance anyway prevents future
             * issues if that were ever to change. */
            let currNextEvent = proc.nextEvent;
            if (proc.nextEvent instanceof BlockEvent) {
                handleBlock(proc.nextEvent);
            } else if (proc.nextEvent instanceof ExitEvent) {
                handleExit(proc.nextEvent);
                proc.nextEvent = null;
            } else {
                throw new Error("proc.nextEvent is not an end event (block or exit): " + proc.nextEvent);
            }
            if (currNextEvent instanceof Event) {
                deleteEvent(currNextEvent);
                proc.nextEvent = null;
            }

            return;
        }

        /* Update execution time sum. */
        proc.picked = now;  // this reset is to prevent doubling up on runtime
        proc.execTime += lastRun;
        proc.runLog.push(lastRun);

        /* Get the preempted process's scheduling class. */
        let schedClass = proc.schedClass;
        /* Update latency sum. */
        schedClass.latencySum += (now - schedClass.latencyUpdate) * schedClass.nrWaiting;
        schedClass.latencyUpdate = now;

        /* Note down the time at which the process started waiting again. */
        proc.enqueued = now;
        proc.waiting = true;
        schedClass.nrWaiting++;

        /* Log the premption. */
        proc.execLog.push(new LogEntry(sim.time(), LogEvent.preempt));

		/* Special case preemption rules */
		if (proc.nextEvent instanceof ExitEvent) {
			if (proc.nextEvent.type === ExitCond.simExec && !proc.nextEvent.nice) {
				/* A strict exit at a certain simulation time, the event saved in proc.strictEndEvent. This will exit
				 * at any process state, just ignore the set event and exit. */
				return;
			} else if (proc.nextEvent.type === ExitCond.execCnt && !proc.nextEvent.nice) {
                /* Delete the previously set (now obsolete) block event. */
                deleteEvent(proc.nextEvent);
                /* Execution count has been reached, it's not a nice exit so don't wait for the process to use up its
                 * remaining runtime, just set an exit event right after this. */
                proc.nextEvent.time = now;
                insertEvent(proc.nextEvent);
                return;
            }
		}
		/* Anything not caught by the above rules will just be requeued normally. Justifications:
		 * - BlockEvent: default behavior
		 * - ExitEvent, simExec, nice: the program wants to exit the next time it voluntarily blocks, so just re-queue
		 * 		it. Its exit event will be set again on pick.
		 * - ExitEvent, procExec: the program wants to exit after it ran for a determined time. If it's not a nice exit
		 *     then we can be sure that the determined runtime wasn't reached yet: it would've exited already otherwise.
		 *     If it is a nice exit then it doesn't matter if the runtime was reached: it can run until it voluntarily
		 *     blocks (uses up remainingRuntime), it'll get a new exit event in pick.
		 * - ExitEvent, execCnt, nice: the process can run until it voluntarily blocks (uses up remainingRuntime), it'll
		 *     get a new exit event in pick.
		 */

		/* delete the previously set, now obsolete block event */
        if (proc.nextEvent instanceof Event) {
            deleteEvent(proc.nextEvent);
            proc.nextEvent = null;
        }
        /* 20190528: removed enqueue here, classes that keep their running process off the runqueue should enqueue it
         * back themselves in putPrev. */
	}

    /**
	 * handleBlock; private method - accessible only within simulator.
	 * Handle the event of currently executing process blocking and exiting runnable state. This method is called either
	 * from {@link index.html#simulatorrun Simulator.run()} or
	 * {@link index.html#simulatorhandlepreempt handlePreempt()}.
	 * @memberof Simulator
	 * @param  {BlockEvent} evt The block event that needs to be handled.
	 */
    var handleBlock = function(evt) {
        var now = sim.time();
        var proc = evt.process;
        /* zero out remaining runtime */
        proc.remainingRuntime = 0;
        /* mark the process as blocked */
        proc.runnable = false;
        /* update execution time sum */
        let lastRun = now - proc.picked
        proc.picked = now;

        proc.execTime += lastRun;
        proc.runLog.push(lastRun);

        /* if it was enqueued, dequeue the process that blocked */
        if (proc.onRq) {
            proc.schedClass.dequeue(proc);
        }
        /* Set next event for the process that blocked. Check if it's an exit on simExec. */
        let time = getProcVal(proc.currBehavior.block);
        proc.nextEvent = insertEvent(new EnqueueEvent(now + time, proc));

        /* log that the process blocked */
        proc.execLog.push(new LogEntry(now, LogEvent.block));

        proc.schedClass.nrRunning--;
    }

    /**
	 * handleExit; private method - accessible only within simulator.
	 * Handle an event exiting. This method is called either from {@link index.html#simulatorrun Simulator.run()} or
	 * {@link index.html#simulatorhandlepreempt handlePreempt()}.
	 * @memberof Simulator
	 * @param  {ExitEvent} evt The exit event that needs to be handled.
	 */
    var handleExit = function(evt) {
        var now = sim.time();
        var proc = evt.process;
        /* mark as dead */
        proc.runnable = false;
        proc.alive = false;
        /* set exit time */
        proc.exited = now;
        /* dequeue if currently enqueued */
        if (proc.onRq) {
            proc.schedClass.dequeue(proc);
        }
        /* remove any potential nextEvent that was set for the process, this matters when exiting via strictEndEvent */
        if (proc.nextEvent !== evt && proc.nextEvent instanceof Event && proc.nextEvent.time >= now) {
            deleteEvent(proc.nextEvent);
        }
        /* Log the process exit. */
        proc.execLog.push(new LogEntry(now, LogEvent.exit));
        /* Decrement the live process count. */
        liveProcessCount--;

        if (proc === curr) {    /* handle the case where the exiting process was currently executing */
            /* Zero out remaining runtime. This is necessary so that sim.pickNext() doesn't see remaining
             * runtime on previous process (this one) and assume that it was preempted. If it does, it will
             * enqueue it again, which is bad, because we want it to exit. If we decide that the remaining
             * runtime on exit is something that we want to know, we can store the following somewhere:
             * var procFinalRuntime = evt.process.remainingRuntime - (sim.time() - evt.process.picked);
             * Update: the above issue was fixed with "process.alive" check, but let's keep it zeroed out as
             * extra precaution.
             */
            proc.remainingRuntime = 0;
            /* Update execution time sum. */
            let lastRun = now - proc.picked;
            proc.picked = now;
            proc.execTime += lastRun;
            proc.runLog.push(lastRun);
            /* Don't pick the next event here, that's done outside this function. */

        } else if (proc.waiting) {  /* handle the case where the exiting process was currently waiting */
            let pWaitTime = now - proc.enqueued;

            /* Log the time that the process spent waiting. */
            proc.latencyLog.push(pWaitTime);
            proc.waitTime += pWaitTime;
            proc.waiting = false;

            /* Update latency sum. */
            proc.schedClass.latencySum += (now - proc.schedClass.latencyUpdate) * proc.schedClass.nrWaiting;
            proc.schedClass.latencyUpdate = now;
            /* Subtract the process's wait time from latency sum. */
            proc.schedClass.latencySum -= pWaitTime;
            /* Decrease the numbers of waiting & running processes. */
            proc.schedClass.nrWaiting--;
            proc.schedClass.nrRunning--;
        }
    }


    /* simulator statistics functions ------------------------------------------------------------------------------- */
	/* Functions that deal with simulation statistics. */

    /**
     * Simulator.getLatency; Returns the current latency of the entire simulator. This is just a helper function that
     * goes through all active scheduling classes and calls
     * {@link index.html#schedclassgetlatency SchedClass.getLatency()} on each of them, then sums up the results and
     * returns them.
     * @memberof Simulator
     * @return {number} The sum of current latency of all scheduling classes.
     */
    sim.getLatency = function() {
        var latSum = 0;
        for (var i = 0; i < schedClassPrio; i++) {
            latSum += schedClassActive[schedClassPrio[i]].getLatency();
        }
        return latSum;
    }


    /**
     * Simulator.getAverageLatency; Returns the average latency of specified scheduling classes. As latency is more of
     * a scheduling class specific statistic, this function works by accepting one or multiple scheduling class names as
     * arguments and calculating their latency. For a single scheduling class, the same result can be achieved by
     * calling {@link index.html#schedclassgetaveragelatency SchedClass.getAverageLatency()} directly.
     * @memberof Simulator
     * @param  {(undefined | null | string)} classes Accepts multiple arguments in the form of class names (strings) of
     * the classes that should be included in the average latency calculation. Without parameter, or when parameter is
     * null, "all" or "active", the average latency of all active scheduling classes will be calculated - that is, of
     * all the classes whose processes were part of the latest simulation.
     * @return {Object} An object containing two entries:
     * * **avg** (number): An average latency of all selected scheduling classes, calculated from a population of
     * latency values that were logged every time that Simulator.pickNext() method was called.
     * - **dev** (number): A population standard deviation of the same samples used in avg.
     */
    sim.getAverageLatency = function(classes) {
        var classList = [];
        if (classes === undefined || classes === null ||
            (typeof(classes) === "string" && (classes.toLowerCase() === "active" || classes.toLowerCase() === "all"))) {
                classList = schedClassPrio;
        } else {
            for (let i = 0; i < arguments.length; i++) {
                if (schedClassActive[arguments[i]] !== undefined) {
                    classList.push(arguments[i]);
                } else {
                    throw new Error("unknown scheduling class name or class not active in current simulation: " + arguments[i]);
                }
            }
        }

        var tmpLatLog, summedLatLog;
        var latSum = 0;
        var latEntryCount = schedClassActive[classList[0]].latencyLog.length;
        for (let i = 0; i < classList.length; i++) {
            tmpLatLog = schedClassActive[classList[i]].latencyLog;
            if (tmpLatLog.length !== latEntryCount) {
                throw new Error("number of entries in latency log differs between classes - it shouldn't!");
            }

            latSum += tmpLatLog.reduce((acc, curr) => acc + curr);

            if (i === 0) {
                summedLatLog = Array.from(tmpLatLog);
            } else {
                for (let j = 0; j < latEntryCount; j++) {
                    summedLatLog[j] += tmpLatLog[j];
                }
            }
        }

        var avg = latSum / latEntryCount;
        var latDev = Math.sqrt(summedLatLog.reduce((acc, curr) => acc + Math.pow((curr - avg), 2)) / latEntryCount);

        return {
            avg: avg,
            dev: latDev
        };
    }


    /**
     * Simulator.getAverageLoad; Returns the average processor load during the simulation. This is basically just the
     * time spent executing actual processes (as in not the idle process) divided by entire simulation time.
     * Note that this function calculates the load over the entire simulation, from start to finish (or current moment).
     * If you need a load statistic during the simulation itself you probably want to use
     * {@link index.html#simulatorgetcurrload Simulator.getCurrLoad(reqTime)}.
     * @memberof Simulator
     * @return {number} A value between 0 and 1 that describes the ratio of time spent executing processes (not idle).
     */
    sim.getAverageLoad = function() {
        var execStats = simEventLog.reduceRight((acc, evt) => {
            /* Note down the times between pick events and differentiate between idle and regular processes. */
            if (evt instanceof PickEvent) {
                acc.all += acc.timestamp - evt.time;
                if (!(evt.process instanceof IdleProcess)) {
                    acc.active += acc.timestamp - evt.time;
                }
                acc.timestamp = evt.time;
            }
            return acc;
        }, {all: 0, active: 0, timestamp: simEventLog[simEventLog.length - 1].time});
        return execStats.active / execStats.all;
    }


    /**
     * Simulator.getCurrLoad; Returns the processor load in the last *reqTime* simulation nanoseconds. The processor
     * load statistic is really just the fraction of time that was spent executing something useful in a given time
     * period - so something that isn't the idle process. This time period should be passed as a parameter so that the
     * result makes sense in the context in which this function was called (returning load in a time period of 50ns
     * wouldn't make much sense when testing batch processes).
     * @memberof Simulator
     * @param  {number} reqTime The amount of nanoseconds before the current moment that should be taken into account
     * when calculating system load. In other words, calculate processor load for last *reqTime* simulation nanoseconds.
     * @return {number} A number between 0 and 1 representing simulated processor load in the last *reqTime* simulation
     * nanoseconds.
     */
    sim.getCurrLoad = function(reqTime) {
        var all = 0, active = 0, thisTime = 0;
        var timestamp = simEventLog[simEventLog.length - 1].time;
        for (var i = simEventLog.length - 2; i >= 0; i--) {
            if (simEventLog[i] instanceof PickEvent) {
                if (all + timestamp - simEventLog[i].time < reqTime) {
                    /* Requested time not reached, add this time interval to time sum "all". Also add it to "active" if
                     * any other process than idle ran. */
                    thisTime = timestamp - simEventLog[i].time;
                    all += thisTime;
                    if (!(simEventLog[i].process instanceof IdleProcess)) {
                        active += thisTime;
                    }
                    timestamp = simEventLog[i].time;
                } else {
                    /* We reached requested time, just fill up the remainder with whatever was executing. */
                    thisTime = reqTime - all;
                    all += thisTime;
                    if (!(simEventLog[i].process instanceof IdleProcess)) {
                        active += thisTime;
                    }
                    break;
                }
            }
        }
        if (all === 0) {
            return 0;   /* Probably called before anything even ran. Return 0 to avoid zero division. */
        } else {
            return active / all;
        }
    }


    /**
     * Simulator.getAverageTurnaround; A helper method that returns the average turnaround time and standard deviation
     * of it for the entire simulation. Should mainly be used once the simulation has ended. Because not all processes
     * are guaranteed to end by the time that simulation does, this function also reports the number of processes that
     * have exited and the number of processes that are still running. Turnaround time can be (and is) calculated only
     * for the processes that have already exited.
     * This function can be invoked from a scheduling class for the processes of that class via
     * {@link index.html#schedclassgetaverageturnaround SchedClass.getAverageTurnaround}. It can also filter by
     * scheduling class by providing a policy string (SchedClass name) as a parameter.
     * @memberof Simulator
     * @param {string | null} policy A string containing the name of the scheduling class for whose processes the
     * average turnaround time should be calculated. If undefined or null, the calculation will be done for all
     * processes in the simulation.
     * @return {Object} An object with 4 entries pertaining to the selected processes in the last simulation run:
     * - **avg**:       average process turnaround time,
     * - **dev**:       population standard deviation of process turnaround time,
     * - **exited**:    the number of processes that have exited and were therefore used in turnaround time calculations,
     * - **running**:   the number of processes that were still running and were therefore not used in turnaround time
     * calculations.
     */
    sim.getAverageTurnaround = function(policy) {
        var processes = procList;
        var tmp;
        var result = processes.reduce((acc, proc) => {
            if (policy === null || policy === undefined || proc.policy === policy) {
                if (proc.exited > 0) {
                    tmp = proc.exited - proc.spawned;
                    acc.sum += tmp;
                    acc.values.push(tmp);
                    acc.exited++;
                } else {
                    acc.running++;
                }
            }
            return acc;
        }, {sum: 0, exited: 0, running: 0, values: []});
        var avg = result.sum / result.exited;
        var result2 = result.values.reduce((acc, val) => {
            acc.sum += Math.pow((val - acc.avg), 2);
            return acc;
        }, {sum: 0, avg: avg});
        var dev = Math.sqrt(result2.sum / result.exited);

        return {
            avg: avg,
            dev: dev,
            exited: result.exited,
            running: result.running
        };
    }
    /**
     * A simple helper method that returns the average turnaround time for all processes in the simulation. Should
     * mainly be used once the simulation has ended.
     * Scheduling classes have a similar method for their own processes in
     * {@link index.html#schedclassgetaverageturnaroundsimple SchedClass.getAverageTurnaroundSimple}.
     * @memberof Simulator
     * @return {number} The average turnaround time of all processes in the last simulation run.
     */
    sim.getAverageTurnaroundSimple = function() {
        return sim.getAverageTurnaround().avg;
    }


	/* simulator public functions ----------------------------------------------------------------------------------- */
	/* The main functions of the simulator, its interface to the outside world and scheduling classes. */

    /**
     * Simulator.init; The starting function of the simulator, used to load processes and set up the simulation
     * environment before running the simulation with sim.run().
     * @memberof Simulator
     * @param {Object | string} simConf A simulation configuration object. Will also accept a string that corresponds to
     * a name of a simulation configuration in {@link SimulationPresets}. A template for writing simulation
     * configurations, complete with instructions and explainations, can be found in
     * {@link templates/Simulation-definition-template.js /docs/templates/Simulation-definition-template.js}.
     */
    sim.init = function(simConf) {
        if (simRunning) {
            throw new Error("a simulation is already underway. Finish it, or stop it with \"Simulator.break()\" before starting a new one.");
        }

        if (simConf === undefined) {
            throw new Error("ran Simulator.init without any arguments.");
        } else if (typeof(simConf) === "string") {
            if (SimulationPresets[simConf] === undefined) {
                throw new Error("unknown preset: " + simConf);
            }

            simConf = SimulationPresets[simConf];
        }

        /* set initial simulation time */
        sim.time(0);

        /* init simulation queue */
        simulationQueue = redblack.tree()

        /* push simulation start event */
		insertEvent(new SimStartEvent(0));

        /* reset general simulation variable checks */
        simNameSet = false;
        simLenSet = false;
        timerTickLenSet = false;
        schedClassNameSet = false;

        /* set general simulation variables */
        sim.setSimName(simConf.name);
        simConf.simLen = sim.handleSuffix(simConf.simLen, 'simulation configuration, simulation length ("simLen")');
        sim.setSimLen(simConf.simLen);
        if (simConf.timerTickLen !== undefined) {   // timerTickLen is not obligatory, some classes do not use it...
            simConf.timerTickLen = sim.handleSuffix(simConf.timerTickLen), 'simulation configuration, timer tick length ("timerTickLen")';
            sim.setTimerTickLen(simConf.timerTickLen);
        } else {                                    // ...but set it to default
            sim.setTimerTickLen(defaultTimerTickLen);
        }
        if (simConf.policy !== undefined) { // policy is not obligatory, can be set per-process
            sim.setSchedClassName(simConf.policy)
        } else {
            schedClassName = null;
        }
        sim.loadProc(simConf.processes);
        if (simConf.classPrio !== undefined) {
            sim.parseClassPrio(simConf.classPrio);
        }

        /* simulator init */
        simulationTime = 0;
		contextSwitches = 0;
        liveProcessCount = sim.getProcList().length;
        simEventLog = [];
		curr = idle;

        /* set up idle process */
        idle.behavior[0].run = sim.getSimLen();
        idle.currBehavior = idle.behavior[0];

        /* Init scheduling classes. Active classes get set in loadProc, so as long this comes after that it's fine. */
        for (var i = 0; i < schedClassPrio.length; i++) {
            if (typeof(simConf.classParams) === "object") {
                schedClassActive[schedClassPrio[i]].init(simConf.classParams[schedClassPrio[i]]);
            } else {
                if (simConf.classParams !== undefined) {
                    throw new Error("simConf.classParam needs to be either an object or undefined. Found " + typeof(simConf.classParams));
                }
                schedClassActive[schedClassPrio[i]].init();
            }
        }

        /* push simulation stop event */
		insertEvent(new SimStopEvent(sim.getSimLen()));
        /* set the first timer event */
        insertEvent(new TimerEvent(timerTickLen));

        /* mark down that init was done */
        simInitDone = true;
    }


	/**
	 * Simulator.time; Returns the current simulation time in simulation nanoseconds.
	 * When called with a number, sets the current simulation time in nanoseconds to match that number.
	 * @memberof Simulator
	 * @param {(undefined|number)} time The simulation time to set.
	 * @return {number} The current simulation time.
	 */
	sim.time = function(time) {
		if (time !== undefined) {
			if (typeof(time) !== "number" || time < 0) {
				throw new Error("called sim.time with an invalid argument.")
			} else {
				simulationTime = time;
			}
		}
		return simulationTime;
	}


    /**
	 * Simulator.registerSchedClass; Register a scheduling class to be used in the simulator. To implement a custom
	 * scheduling class, please refer to
	 * {@link index.html#schedclasstemplate SchedClassTemplate}, which serves as an example scheduling class
	 * implementation with extra instructions and explainations.
	 * @memberof Simulator
	 * @param  {string} className A name for the new scheduling class.
	 * @param  {SchedClass} schedClass An implementation of a scheduling class that extends SchedClass.
	 */
	sim.registerSchedClass = function(className, schedClass) {
        if (schedClass.name !== undefined && typeof(schedClass.name) === "string" &&
			schedClass.init !== undefined && typeof(schedClass.init) === "function" &&
			schedClass.enqueue !== undefined && typeof(schedClass.enqueue) === "function" &&
			schedClass.dequeue !== undefined && typeof(schedClass.dequeue) === "function" &&
			schedClass.pickNext !== undefined && typeof(schedClass.pickNext) === "function" &&
			schedClass.putPrev !== undefined && typeof(schedClass.putPrev) === "function" &&
			schedClass.taskTick !== undefined && typeof(schedClass.taskTick) === "function" &&
			schedClass.checkPreempt !== undefined && typeof(schedClass.checkPreempt) === "function") {
                if (schedClassPrioRegistered.includes(schedClass.name)) {
                    throw new Error("a scheduling class with the name \""+schedClass.name+"\" already exists, please pick a different name");
                } else if (schedClass.name !== className) {
                    // let's make sure that we're actually registring what we think we are
                    throw new Error("schedClass.name ("+schedClass.name+") and className ("+className+") need to be the same");
                }

				schedClassRegistered[className] = schedClass;
				schedClassPrioRegistered.push(className);
		} else {
				throw new Error("malformed SchedClass: "+schedClass.constructor.name);
		}
	}

    /**
     * Simulator.reorderRegisteredClasses; Reorder the scheduling classes in order to change their priority. Accepts
     * an aray of indexes of classes that are ordered in the desired order. For example, if we have classses
     * <code>["a", "b", "c"]</code> then passing an orderArray <code>[2, 0, 1]</code> will reorder them to
     * <code>["c", "a", "b"]</code> - "c" now has the highest priority and "b" the lowest.
     * This function has a counterpart for only the active classes (those used in loaded simulation) in
     * {@link index.html#simulatorreorderactiveclasses Simulator.reorderActiveClasses}.
     * @memberof Simulator
     * @param  {number[]} orderArray An array of indexes in the desired order.
     */
    sim.reorderRegisteredClasses = function(orderArray) {
        if (simRunning) {
            throw new Error("a simulation is running, finish or break it (Simulator.break()) before reordering scheduling classes.");
        } else if (!(orderArray instanceof Array)) {
            throw new Error("orderArray needs to be an array of integers.");
        } else if (orderArray.length != schedClassPrioRegistered.length) {
            throw new Error("orderArray length needs to match the numer of registered scheduling classes (Simulator.getSchedClassPrioRegistered().length).");
        }

        var checkArray = [];
        for (let i = 0; i < orderArray.length; i++) {
            if (typeof(orderArray[i]) !== "number") {
                throw new Error("orderArray must only include numbers, but slot "+i+" contains "+typeof(orderArray[i]));
            }
            checkArray[orderArray[i]] = true;
        }
        for (let i = 0; i < checkArray.length; i++) {
            if (checkArray[i] !== true) {
                throw new Error("orderArray needs to include all numbers from 0 to length-1. Missing: "+i);
            }
        }

        schedClassPrioRegistered = orderArray.map(i => schedClassPrioRegistered[i]);

        /* If the active scheduling class array isn't empty, reorder that too. */
        if (schedClassPrio.length > 1) { // don't check for simInitDone, GUI maintains active classes when it isn't too
            let newActivePrio = [];
            for (let i = 0; i < schedClassPrioRegistered.length; i++) {
                if (schedClassPrio.includes(schedClassPrioRegistered[i])) {
                    newActivePrio.push(schedClassPrioRegistered[i]);
                }
            }
            schedClassPrio = newActivePrio;
        }
    }

    /**
     * Simulator.parseClassPrio; Reorders the scheduling classes according to an ordered list of class names. Ignores
     * any class names that are not currently registered. Places the ordered classes at the top of registered and active
     * class priority arrays.
     * @memberof Simulator
     * @param  {string[]} activeClassArray An array containing class names in order of desired priority.
     */
    sim.parseClassPrio = function(activeClassArray) {
        let regClass = [...schedClassPrioRegistered];   // clone array
        for (let i = activeClassArray.length - 1; i >= 0; i--) {
            if (typeof(activeClassArray[i]) !== "string") {
                throw new Error("while parsing class priorities, at index " + i + ", expected a string, found " + activeClassArray[i]);
            }
            for (let j in regClass) {
                if (activeClassArray[i] === regClass[j]) {
                    regClass.unshift(regClass.splice(j, 1)[0]);     // push j-th element to start
                    break;
                }
            }
        }

        let actClass = [];
        for (let i in regClass) {
            if (schedClassPrio.includes(regClass[i])) {
                actClass.push(regClass[i]);
            }
        }

        schedClassPrioRegistered = regClass;
        schedClassPrio = actClass;
    }

    /**
     * Simulator.reorderActiveClasses; Reorder the active scheduling classes (those used in the loaded simulation) in
     * order to change their priority. Accepts an aray of indexes of classes that are ordered in the desired order.
     * For example, if we have classses <code>["a", "b", "c"]</code> then passing an orderArray <code>[2, 0, 1]</code>
     * will reorder them to <code>["c", "a", "b"]</code> - "c" now has the highest priority and "b" the lowest.
     * This function has a counterpart for all registered classes in
     * {@link index.html#simulatorreorderregisteredclasses Simulator.reorderRegisteredClasses}.
     * @memberof Simulator
     * @param  {number[]} orderArray An array of indexes in the desired order.
     */
    sim.reorderActiveClasses = function(orderArray) {
        if (!simInitDone) {
            throw new Error("simulation has not been initialised yet, no active classes to reorder.");
        } else if (schedClassPrio.length < 2) {
            return;
        } else if (simRunning) {
            throw new Error("a simulation is running, finish or break it (Simulator.break()) before reordering scheduling classes.");
        } else if (!(orderArray instanceof Array)) {
            throw new Error("orderArray needs to be an array of integers.");
        } else if (orderArray.length != schedClassPrio.length) {
            throw new Error("orderArray length needs to match the numer of active scheduling classes (Simulator.getSchedClassPrio().length).");
        }

        var checkArray = [];
        for (let i = 0; i < orderArray.length; i++) {
            if (typeof(orderArray[i]) !== "number") {
                throw new Error("orderArray must only include numbers, but slot "+i+" contains "+typeof(orderArray[i]));
            }
            checkArray[orderArray[i]] = true;
        }
        for (let i = 0; i < checkArray.length; i++) {
            if (checkArray[i] !== true) {
                throw new Error("orderArray needs to include all numbers from 0 to length-1. Missing: "+i);
            }
        }

        schedClassPrio = orderArray.map(i => schedClassPrio[i]);
    }


	/**
	 * Simulator.loaded; A method that checks whether processes for simulation have been successfully loaded yet.
	 * @memberof Simulator
	 * @return {boolean} Returns true if the load was run and successfully completed and false otherwise.
	 */
	sim.loaded = function() {
		return processesLoaded;
	}


	/**
	 * @namespace loadProc
	 * @description Simulator.loadProc; Loads a list of processes to be run into the simulator. This function should not
	 * be called on its own - instead, use {@link index.html#simulatorinit Simulator.init()}. If you are just looking
	 * to write a simulation definition or a process list, refer to
     * {@link templates/Simulation-definition-template.js /docs/templates/Simulation-definition-template.js}, which
     * contains a template for writing simulation configurations, complete with instructions and explainations.
	 *
	 * @memberof Simulator
	 * @param  {Object} procListDef An object containing processes.
	 */
	sim.loadProc = function(procListDef) {
		processesLoaded = false;
        procList = [];
        schedClassPrio = [];
        schedClassActive = {};
        var activeClassList = [];

        if (schedClassNameSet) {
            activeClassList.push(schedClassName);
        }

		if (procListDef === undefined || typeof(procListDef) !== "object" || procListDef.length < 1) {
			throw new Error("missing or invalid process list passed to loadProc.");
		}

		var proc;

        /* process list sanity check */
		for (let i = 0; i < procListDef.length; i++) {
			proc = procListDef[i];

			/* SchedClass sanity check, can be undefined if schedClassName is passed as parameter */
			if (!schedClassNameSet && proc.policy === undefined) {
				throw new Error("while reading process "+i+": missing policy definition. This field can be skipped if a default policy / scheduling class is defined for entire simulation.");
			} else if (proc.policy !== undefined && typeof(proc.policy) !== "string") {
                throw new Error("while reading process "+i+":invalid policy definition type: \"" + typeof(proc.policy) + "\", needs to be a string. This field can be skipped if a policy is defined for entire simulation.");
            } else if (proc.policy !== undefined && schedClassRegistered[proc.policy] === undefined) {
                throw new Error("while reading process "+i+": given policy does not exist: \"" + proc.policy + "\". This field can be skipped if a policy is defined for entire simulation.");
            }

			/* pname isn't necessary, but should be a string */
			if (proc.pname !== undefined && typeof(proc.pname) !== "string") {
				throw new Error("while reading process "+i+": pname should be either undefined or string.");
			}

			/* spawn field can be a number or an array of 2 [from, to] and can't contain negative values */
            proc.spawn = sim.handleSuffix(proc.spawn, "process "+i+": process spawn entry");
			if (proc.spawn === undefined) {
				throw new Error("while reading process "+i+": spawn value must be defined.");
			} else if (typeof(proc.spawn) === "number") {
				if (proc.spawn < 0) {
					throw new Error("while reading process "+i+": spawn value cannot be negative.");
				}
			} else if (typeof(proc.spawn) === "object") {
				if (proc.spawn.length !== 2 || proc.spawn[0] > proc.spawn[1] || proc.spawn[0] < 0) {
					throw new Error("while reading process "+i+": invalid spawn range.");
				}
			}

			/* behavior list */
			if (proc.behavior === undefined || typeof(proc.behavior) !== "object" || proc.behavior.length < 1) {
					throw new Error("while reading process "+i+": missing or invalid behavior list.");
			}

			/**
			 * Counts the number fields in a behavior entry and checks whether they are valid.
			 * Returns a negative number if any of the fields are invalid. The number corresponds to the invalid
			 * field:
			 * 		-1 : priority
			 * 		-2 : run
			 * 		-3 : block
			 *
			 * @memberof Simulator.loadProc
			 * @param  {Object} entry A behavior list entry.
			 * @return {number} The number of valid fields.
			 */
			var checkFields = function(entry) {
				var validFields = 0;
				if (entry.priority !== undefined) {
					if (entry.priority instanceof Array) {
						if (entry.priority.length !== 2 || entry.priority[0] > entry.priority[1]) {
							return -1;
						}
					} else if (typeof(entry.priority) !== "number") {
						return -1;
					}
					validFields++;
				}
				if (entry.run !== undefined) {
					if (typeof(entry.run) === "number") {
						if (entry.run < 1) {
							return -2;
						}
					} else if (typeof(entry.run) === "object") {
						if (entry.run.length !== 2 || entry.run[0] > entry.run[1] || entry.run[0] < 1) {
							return -2;
						}
					} else {
						return -2;
					}
					validFields++;
				}
				if (entry.block !== undefined) {
					if (typeof(entry.block) === "number") {
						if (entry.block < 1) {
							return -3;
						}
					} else if (typeof(entry.block) === "object") {
						if (entry.block.length !== 2 || entry.block[0] > entry.block[1] || entry.block[0] < 1) {
							return -3;
						}
					} else {
						return -3;
					}
					validFields++;
				}
				return validFields;
			} /* checkFields() */

			/**
			 * Checks whether a behavior entry's execution condition is valid.
			 * @memberof Simulator.loadProc
			 * @param  {Object} execCond Execution condition field.
			 * @return {boolean} If the field is valid returns true, otherwise false.
			 */
			var execCondValid = function(execCond) {
				if (typeof(execCond) === "number") {
					if (execCond < 1) {
						return false;
					}
				} else if (typeof(execCond) === "object") {
					if (execCond.length !== 2 || typeof(execCond[0]) !== "number" || typeof(execCond[1]) !== "number" ||
                     execCond[0] > execCond[1] || execCond[0] < 0) {
						return false;
					}
				} else {
					return false;
				}
				return true;
			}

			/* Check behavior list entries. The first one must contain all necessary fields, the subsequent must all
			 * contain at least one, as well as exactly one condition on which they get parsed.
			 * (this could later be extended on multiple conditions plus a formula joining them with and / or)
			 *
			 * First behavior check entry.
			 */
			var validFields;
            proc.behavior[0].run = sim.handleSuffix(proc.behavior[0].run, 'process '+i+': the first behavior entry, "run" field (missing or invalid)');
            proc.behavior[0].block = sim.handleSuffix(proc.behavior[0].block, 'process '+i+': the first behavior entry, "block" field (missing or invalid)');
            validFields = checkFields(proc.behavior[0]);
			if (validFields < 3) {
				if (validFields > -1) {			// 0, 1, 2
					throw new Error('while reading process '+i+': the first behavior entry does not contain all the required fields: "priority", "run", "block".');
				} else if (validFields < -2) {	// -3
					throw new Error('while reading process '+i+': the first behavior entry contains an invalid "block" field. Make sure that it has correct syntax and its value is > 0.');
				} else if (validFields < -1) {	// -2
					throw new Error('while reading process '+i+': the first behavior entry contains an invalid "run" field. Make sure that it has correct syntax and its value is > 0.');
				} else {						// -1
					throw new Error('while reading process '+i+': the first behavior entry contains an invalid "priority" field.');
				}
			}

			/* Subsequent behavior enrty checks */
			for (let j = 1; j < proc.behavior.length; j++) {
				if (proc.behavior[j].final === undefined || proc.behavior[j].final !== true &&
					typeof(proc.behavior[j].final) === "string" &&
					proc.behavior[j].final.toLowerCase() !== "true") {
						/* check behavior definition fields if current entry isn't a process ending behavior entry */
                        if (proc.behavior[j].run !== undefined) {
                            proc.behavior[j].run = sim.handleSuffix(proc.behavior[j].run, 'process '+i+': behavior entry '+j+', "run" field');
                        }
                        if (proc.behavior[j].block !== undefined) {
                            proc.behavior[j].block = sim.handleSuffix(proc.behavior[j].block, 'process '+i+': behavior entry '+j+', "block" field');
                        }
						validFields = checkFields(proc.behavior[j]);
						if (validFields === 0) {			// 0
							throw new Error('while reading process '+i+': behavior entry '+j+' contains no behavior update fields.');
						} else if (validFields < -2) {	// -3
							throw new Error('while reading process '+i+': behavior entry '+j+' contains an invalid "block" field.');
						} else if (validFields < -1) {	// -2
							throw new Error('while reading process '+i+': behavior entry '+j+' contains an invalid "run" field.');
						} else if (validFields <  0) {	// -1
							throw new Error('while reading process '+i+': behavior entry '+j+' contains an invalid "priority" field.');
						}
				} else {
					proc.behavior[j].final = true;

					/* process ending behavior, determine if it ends nicely (if true the process runs past ending
					 * condition to finish execution, otherwise it exits immediately upon reaching it) */
					if (proc.behavior[j].endNicely === false || typeof(proc.behavior[j].endNicely) === "string" &&
						proc.behavior[j].endNicely.toLowerCase() === "false") {
							proc.behavior[j].endNicely = false;
					} else {
						proc.behavior[j].endNicely = true;
					}
				}

				/*
				 * Valid fields for parse conditions are represented by id numbers: 1, 2, 4.
				 * When we sum them up we can instantly see which of them have been defined from the value of the sum.
				 */
				validFields = 0;
				if (proc.behavior[j].procExec !== undefined) {	// 1
                    proc.behavior[j].procExec = sim.handleSuffix(proc.behavior[j].procExec, 'while reading process '+i+': behavior entry '+j+', "procExec" field');
					if (!execCondValid(proc.behavior[j].procExec)) {
						throw new Error('Error while reading process '+i+': behavior entry '+j+' contains an invalid "procExec" field.');
					}
					validFields += 1;
				}
				if (proc.behavior[j].simExec !== undefined) {	// 2
                    proc.behavior[j].simExec = sim.handleSuffix(proc.behavior[j].simExec, 'while reading process '+i+': behavior entry '+j+', "simExec" field');
					if (!execCondValid(proc.behavior[j].simExec)) {
						throw new Error('Error while reading process '+i+': behavior entry '+j+' contains an invalid "simExec" field.');
					}
					validFields += 2;
				}
				if (proc.behavior[j].execCnt !== undefined) {	// 4
					if (!execCondValid(proc.behavior[j].execCnt)) {
						throw new Error('Error while reading process '+i+': behavior entry '+j+' contains an invalid "execCnt" field.');
					}
					validFields += 4;
				}
				if (validFields === 0) {
					throw new Error('Error while reading process '+i+': behavior entry '+j+' contains no parse conditions (fields "procExec", "simExec", "execCnt").');
				} else if (validFields === 3 || validFields > 4) {
					throw new Error('Error while reading process '+i+': behavior entry '+j+' contains more than one parse condition.');
				}
			} /* behavior list for loop (j) */

            /* "custom" field check */
            if (proc.custom instanceof Object) {
                checkProcProp(Object.keys(proc.custom));
            }


		} /* process list for loop (i) */

		/* ============ Populate simulation queue ============ */

        /* MAKE SURE THAT SIMULATION QUEUE CONTAINS ONLY SIMULATION START EVENT HERE. In other words, it should be
         * clean, not littered from a previous simulation. */

		/* Length of the number string used in process names. (for 100+ processes: proc_5 -> proc_005) */
		var pidPadLength = Math.floor(Math.log10(procListDef.length));

		for (let i = 0; i < procListDef.length; i++) {
			var procDef = procListDef[i];

			/* decide on pname */
			var procName = "";
			if (procDef.pname !== undefined && typeof(procDef.pname) === "string") {
				procName = procDef.pname;
			} else {
				var tmpPid = i.toString();
				procName = "proc_" + tmpPid.padStart(pidPadLength, "0");
			}

			/* create a new process object */
			var newProc = new Process(i, procName);

			/* determine spawn time */
			var spawnTime = getProcVal(procDef.spawn);

			/* set timestamps */
			newProc.spawned = spawnTime;
			newProc.enqueued = spawnTime;

			/* log the enqueue - this seems to be unnecessary, enqueue function does it too */
			//newProc.execLog.push(new LogEntry(spawnTime, LogEvent.enqueue));

			/* set sched policy and sched class reference */
            if (typeof(procDef.policy) === "string") {
                newProc.policy = procDef.policy;
                newProc.schedClass = schedClassRegistered[procDef.policy];
                if (!activeClassList.includes(procDef.policy)) {
                    activeClassList.push(procDef.policy);
                }
            } else {
                newProc.policy = schedClassName;
                newProc.schedClass = schedClassRegistered[schedClassName];
            }

			/* Set behavior. The behaviors need to be deep copied. Otherwise, behavior updates change the values in
             * definition and mess up subsequent runs in multiRun mode. */
            newProc.behavior = JSON.parse(JSON.stringify(procDef.behavior));
            newProc.currBehavior = newProc.behavior[0];
			newProc.nextBehIndex = 1;

            /* set final values of behavior execution conditions */
            for (let j = 1; j < newProc.behavior.length; j++) {
                if (newProc.behavior[j].procExec instanceof Array) {
                    newProc.behavior[j].procExec = getProcVal(newProc.behavior[j].procExec);
                } else if (newProc.behavior[j].simExec instanceof Array) {
                    newProc.behavior[j].simExec = getProcVal(newProc.behavior[j].simExec);
                } else if (newProc.behavior[j].execCnt instanceof Array) {
                    newProc.behavior[j].execCnt = getProcVal(newProc.behavior[j].execCnt);
                }
            }

            /* add the properties from "custom" field into the process */
            if (procDef.custom instanceof Object) {
                for (let prop in procDef.custom) {
                    newProc[prop] = procDef.custom[prop];
                }
            }

            /* add the process to procList */
            procList.push(newProc);

			/* finally, insert the process enqueue into the simulation queue */
			insertEvent(new ForkEvent(spawnTime, newProc));

		} /* process list for loop (i) */

        /* populate active class list and priority list - in the order of registered priority list */
        for (let i = 0; i < schedClassPrioRegistered.length; i++) {
            if (activeClassList.includes(schedClassPrioRegistered[i])) {
                schedClassPrio.push(schedClassPrioRegistered[i]);
                schedClassActive[schedClassPrioRegistered[i]] = schedClassRegistered[schedClassPrioRegistered[i]];
            }
        }

		/* initialize idle class and process */
		idleClass = new IdleClass;
		idle = new IdleProcess;
		idle.schedClass = idleClass;

		processesLoaded = true;
	} /* sim.loadProc */


    /**
	 * Simulator.run; Run the simulation. Make sure that {@link index.html#simulatorinit Simulator.init()} has been
	 * called before starting a simulation. The simulation can be executed for a given number of nanoseconds by passing
	 * a number as an argument. Helper functions can be used as well:
	 * {@link index.html#simulatorrunto Simulator.runTo(stopTime)} to execute up to a certain time and
	 * {@link index.html#simulatorstep Simulator.step(steps)} to execute one or multiple steps of simulation.
	 * @memberof Simulator
	 * @param {undefined | number} runFor The amount of simulation nanoseconds that the simulation should run for before
	 * it stops. If undefined, the entire simulation will be run without stopping. If negative, the simulation will run
	 * for (runFor * -1) steps, where a step is counted after all the events within a given simulation nanosecond have
	 * been processed. Running this function with negative arguments should be avoided, use
	 * {@link index.html#simulatorstep Simulator.step(steps)} instead.
	 * @return	{SimResult}	Returns a simulation result object with all the relevant data.
	 */
	sim.run = function(runFor) {
        if (!simInitDone) {
            throw new Error("simulation has not been properly started. Run Simulator.init() first.");
        } else if (!sim.loaded()) {
			throw new Error("atttempting to run simulation before the processes were successfully loaded.");
        } else if (!simNameSet) {
            throw new Error("atttempting to run simulation before simulation name was set. Run either Simulator.init() or Simulator.setSimName(name).");
        } else if (!simLenSet) {
			throw new Error("atttempting to run simulation before simulation length was set. Run either Simulator.init() or Simulator.setSimLen(length).");
        } else if (!timerTickLenSet) {
            throw new Error("atttempting to run simulation before timer tick length was set. Run either Simulator.init() or Simulator.setTimerTickLen(length).");
		} else if (typeof(sim.preemption) !== "boolean") {
            throw new Error("invalid value of Simulator.preemption set, needs to be a boolean (true/false).");
        } else if (sim.time() === 0) {
            simWallTimeStart = Date.now();
        }

        /* mark that the simulation has started */
        simRunning = true;

        /* private variables */
		var runMode;    /* runMode: 0 = run to end, 1 = run until runAmount time, 2 = run for runAmount steps */
        var runAmount;  /* time until which to run on runMode 1; number of steps to do on runMode 2 */
        var stepsDone;  /* only on runMode 2, amount of steps already done */
        var partialExit = false;    /* exit on runMode 1 and 2; true after condition is fulfilled */

        if (runFor !== undefined && runFor !== null) {
            if (typeof(runFor) !== "number") {
                throw new Error("the run function parameter \"runFor\" must be either null or a number.")
            }

            if (runFor > 0) {           // run until runAmount time
                runMode = 1
                runAmount = runFor + sim.time();
            } else if (runFor < 0) {    // run for runAmount steps
                runMode = 2;
                runAmount = runFor * (-1);
                stepsDone = 0;
            } else {
                return null;
            }
        } else {
            runMode = 0;
        }

		/* main simulation loop */
        var evt;
		for (evt = getNextEvent(); !(evt instanceof SimStopEvent); evt = getNextEvent()) {
            if (evt.time > sim.getSimLen()) {
				throw new Error("current simulation time exceeded simuletion length! Missing SimStopEvent?")
			} else if (evt.time < sim.time()) {
                throw new Error("event time (" + evt.time + ") is lower than current simulation time (" + sim.time()
                    + "). We can't time travel. Event: " + evt);
            }

            /* update simulation time */
            sim.time(evt.time);

            /* push event to simulation log */
            simEventLog.push(evt);

			if (evt instanceof ForkEvent || evt instanceof EnqueueEvent) {
                let proc = evt.process;
                let now = sim.time();

                if (evt instanceof ForkEvent) {
                    proc.alive = true;
                }
                proc.runnable = true;

                /* Log the process enqueue time. */
                proc.waiting = true;
                proc.enqueued = now;

                /* Update latency sum. */
                proc.schedClass.latencySum += (now - proc.schedClass.latencyUpdate) * proc.schedClass.nrWaiting;
                proc.schedClass.latencyUpdate = now;
                /* Increase the numbers of waiting & running processes. */
                proc.schedClass.nrWaiting++;
                proc.schedClass.nrRunning++;

				evt.process.schedClass.enqueue(evt.process);
                sim.checkPreempt(evt.process);

			} else if (evt instanceof BlockEvent) {
                /* handle process blocking */
                handleBlock(evt);
				/* pick the next process to run & run it */
				sim.pickNext();

			} else if (evt instanceof TimerEvent) {
                if (sim.preemption) {
                    curr.schedClass.taskTick();
                    /* set the next timer tick event */
                    var nextTickTime = sim.time() + sim.getTimerTickLen();
                    insertEvent(new TimerEvent(nextTickTime));
                }

			} else if (evt instanceof ExitEvent) {
                /* handle process exit */
                handleExit(evt);
                /* pick a new process if the exiting one was just executing */
                if (evt.process === curr) {
                    sim.pickNext();
                }

			} else if (evt instanceof SimStartEvent) {
				sim.pickNext();

			} else if (evt instanceof PickEvent) {
				throw new Error("found a PickEvent in the simulation queue: this should not be here!");
			}

			/* add the current process to events that don't have one by themselves (timer, block) */
			if (evt.process === undefined) {
				evt.process = curr;
			}

            /* handle updates and checks related to different run modes */
            if (runMode == 1) {         // run until runAmount time
                var nextTime = peekNextEvent().time;
                if (nextTime > runAmount) {
                    sim.time(runAmount);
                    partialExit = true;
                    break;
                }

            } else if (runMode == 2) {  // run for runAmount steps
                // only increment steps when time changes
                if (peekNextEvent().time !== sim.time()) {
                    stepsDone++;
                }
                if (stepsDone === runAmount) {
                    partialExit = true;
                    break;
                }
            }
		}

        /* create simulation result object */
        var wallTime = Date.now();
        var simRes = new SimResult(wallTime);
        simRes.wallClockTime = wallTime - simWallTimeStart;

        if (partialExit) {
            /* partial exit, simulation is not yet complete */
            simRes.finished = false;
            simRes.runTime = sim.time();

        } else {
            /* final exit, simulation is complete */
            simRes.finished = true;
            simRes.runTime = sim.getSimLen();

            /* update simulation time to the final event */
            sim.time(evt.time);

            /* update the final process's execTime */
            let now = sim.time();
            let lastRun = now - curr.picked;
            curr.picked = now;
            curr.execTime += lastRun;
            curr.runLog.push(lastRun);

            /* update any possible wait times (but don't log them for latency as the processes never got picked) */
            for (let i in procList) {
                if (procList[i].waiting) {
                    procList[i].waitTime += sim.time() - procList[i].enqueued;
                }
            }

            /* push final event */
            evt.process = idle;
            simEventLog.push(evt);
            simRunning = false;
            simInitDone = false;

            /* Statistics */
            simRes.averageLoad = sim.getAverageLoad();
            simRes.averageLatency.general = sim.getAverageLatency();
            simRes.averageLatency.byClass = [];
            for (let k = 0; k < schedClassPrio.length; k++) {
                simRes.averageLatency.byClass.push(schedClassActive[schedClassPrio[k]].getAverageLatency());
                simRes.averageLatency.byClass[k].name = schedClassPrio[k];

                simRes.classStats[schedClassPrio[k]] = schedClassActive[schedClassPrio[k]].getClassStats();
            }
            simRes.averageTurnaround = sim.getAverageTurnaround();

            /* Per-process statistics */
            simRes.processStats = sim.procStats();
        }

        simRes.name = sim.getSimName();
		simRes.length = sim.getSimLen();
		simRes.contextSwitches = contextSwitches;

		simRes.simEvents = simEventLog;
		simRes.processList = procList;
        simRes.activeClasses = schedClassPrio;

		return simRes;
	};


    /**
     * Simulator.step; Run the simulation for one / multiple steps, then stop. Each step processes all the events at the
     * simulation nanosecond of the next event. If the simulation finishes, returns the final result.
     * @memberof Simulator
     * @param {undefined | number} steps
     */
    sim.step = function(steps) {
        if (!simInitDone) {
            throw new Error("simulation has not been properly started. Run Simulator.init() first.");
        }

        if (typeof(steps) !== "number" || steps < 1) {
            steps = 1;
        }

        return sim.run(-steps);
    }


    /**
     * Simulator.runTo; Run the simulation until the specified time or until the simulation finishes.
     * @memberof Simulator
     * @param {number} stopTime The nanosecond of simulation at which the execution should stop.
     */
    sim.runTo = function(stopTime) {
        if (!simInitDone) {
            throw new Error("simulation has not been properly started. Run Simulator.init() first.");
        } else if (typeof(stopTime) !== "number") {
            throw new Error("expected a number, found " + typeof(stopTime) + ": " + stopTime);
        }

        var now = sim.time();
        if (stopTime <= now) {
            return null;
        }
        return sim.run(stopTime - now);
    }


    /**
     * Simulator.break; Stop executing the current simulation midway and unlock the simulator to allow setting up a new
     * one.
     * @memberof Simulator
     */
    sim.break = function() {
        simRunning = false;
        simInitDone = false;
    }


    /**
     * Simulator.multiRun; A collection of functions used for performing batch simulations and analysing their results.
     * @memberof Simulator
     * @namespace multiRun
     * @type {Object}
     */
    sim.multiRun = {
        simConf: null,
        results: [],
        initDone: false,
        simDone: false,

        /**
         * Simulator.multiRun.init; Initialize the simulator to perform multiple simulations in a row. Must be run
         * before any other multiRun functions.
         * @memberof Simulator.multiRun
         * @param {Object | string} simConf A simulation configuration object. Will also accept a string that
         * corresponds to a name of a simulation configuration in {@link SimulationPresets}.
         */
        init: function(simConf) {
            sim.init(simConf);
            sim.multiRun.simConf = simConf;
            sim.multiRun.results = [];
            sim.multiRun.initDone = true;
            sim.multiRun.simDone = false;
        },

        /**
         * Simulator.multiRun.run; Run a simulation multiple times and store the results.
         * {@link index.html#simulatormultirun Simulator.multiRun.init} must be called before this.
         * @memberof Simulator.multiRun
         * @param  {number} times Number of times that the simulation should run.
         * @returns {Object} An object containing the following entries:
         * - **simulationsRan** (number): The number of simulations that were executed in the multiRun
         * - **realTimeTaken** (number): The real time that it took to complete the multirun, in milliseconds
         * - **averageLatency** (Object): The object returned by
         * {@link index.html#simulatormultirungetaveragelatency Simulator.multiRun.getAverageLatency()}.
         * - **schedClassLatency** (Object): An array of objects with latency information for each of the active
         * scheduling classes in our simulation. The objects in array are created by calling
         * {@link index.html#simulatormultirungetaveragelatency Simulator.multiRun.getAverageLatency()} with names of
         * individual active scheduling classes.
         * - **averageLoad** (Object): The object returned by
         * {@link index.html#simulatormultirungetaverageload Simulator.multiRun.getAverageLoad()}.
         * - **averageTurnaround** (Object): The object returned by
         * {@link index.html#simulatormultirungetaverageturnaround Simulator.multiRun.getAverageTurnaround()}.
         * - **processStats** (Array[Object]): The array of per-process stats returned by
         * {@link index.html#simulatormultirunprocstats Simulator.multiRun.procStats()}.
         */
        run: function(times){
            if (!sim.multiRun.initDone) {
                throw new Error("initialization was not done. Call \"Simulator.multiRun.init\" first.");
            } else if (typeof(times) !== "number" || times < 1) {
                throw new Error("missing or invalid number of times to run: " + times + ". Needs to be a positive number.");
            }

            var startTime = Date.now();

            sim.multiRun.results.push(sim.run());
            for (var i = 1; i < times; i++) {
                sim.init(sim.multiRun.simConf);
                sim.multiRun.results.push(sim.run());
            }

            sim.multiRun.initDone = false;
            sim.multiRun.simDone = true;

            var schedClassLatency = [];
            for (let i in schedClassPrio) {
                schedClassLatency.push(sim.multiRun.getAverageLatency(schedClassPrio[i]));
            }

            return {
                simulationsRan: times,
                realTimeTaken: Date.now() - startTime,
                averageLatency: sim.multiRun.getAverageLatency(),
                schedClassLatency: schedClassLatency,
                averageLoad: sim.multiRun.getAverageLoad(),
                averageTurnaround: sim.multiRun.getAverageTurnaround(),
                processStats: sim.multiRun.procStats(),
            }
        },

        /**
         * Simulator.multiRun.getAverageLatency; Calculate the average latency across all simulation runs of the last
         * multiRun execution.
         * @memberof Simulator.multiRun
         * @param  {string | undefined} className The name of the class for the processes of which the average latency
         * should be gathered. If no parameter is given, the average latency shall be calculated for all the "active"
         * classes, that is, all the classes that were referenced by the processes in the simulation.
         * @return {Object} An object containing the following entries:
         * - **avgAvg** (number): the average value of average latencies across all multiRun simulation runs
         * - **devAvg** (number): the standard deviation of the average latencies across all multiRun simulation runs
         * - **avgDev** (number): the average value of population standard deviations, calculated for average latencies
         * of individual simulation runs
         * - **classes** (string[]): an array of names of classes that were used in the calculations
         */
        getAverageLatency: function(className) {
            var avgAvg = 0;
            var avgDev = 0;
            var devAvg;
            var retClasses;
            if (className !== undefined) {
                if (typeof(className) !== "string") {
                    throw new Error("className of wrong type, needs to be a string.");
                } else if (schedClassActive[className] === undefined) {
                    throw new Error("unknown className: " + className);
                }

                let j;
                for (j = 0; sim.multiRun.results[0].averageLatency.byClass[j].name !== className; j++);
                for (let i in sim.multiRun.results) {
                    avgAvg += sim.multiRun.results[i].averageLatency.byClass[j].avg;
                    avgDev += sim.multiRun.results[i].averageLatency.byClass[j].dev;
                }
                avgAvg /= sim.multiRun.results.length;
                avgDev /= sim.multiRun.results.length;

                devAvg = Math.sqrt(
                    sim.multiRun.results.reduce(
                        (acc, curr) => acc + Math.pow(curr.averageLatency.byClass[j].avg - avgAvg, 2), 0
                    ) / sim.multiRun.results.length
                );
                retClasses = [sim.multiRun.results[0].averageLatency.byClass[j].name];

            } else {
                for (let i in sim.multiRun.results) {
                    avgAvg += sim.multiRun.results[i].averageLatency.general.avg;
                    avgDev += sim.multiRun.results[i].averageLatency.general.dev;
                }
                avgAvg /= sim.multiRun.results.length;
                avgDev /= sim.multiRun.results.length;

                devAvg = Math.sqrt(
                    sim.multiRun.results.reduce(
                        (acc, curr) => acc + Math.pow(curr.averageLatency.general.avg - avgAvg, 2), 0
                    ) / sim.multiRun.results.length
                );
                retClasses = sim.multiRun.results[0].activeClasses;
            }

            return {
                avgAvg: avgAvg,
                devAvg: devAvg,
                avgDev: avgDev,
                classes: retClasses
            }
        },

        /**
         * Simulator.multiRun.getAverageLoad; Calculate the average simulated processor load across all the simulation
         * runs of the last multirun execution.
         * @memberof Simulator.multiRun
         * @return {Object} An object containing the following entries:
         * - **avg** (number): the average load
         * - **dev** (number): the population standard deviation of the average load
         */
        getAverageLoad: function() {
            var avg = 0, dev = 0;

            avg = this.results.reduce((acc, curr) => acc + curr.averageLoad, 0) / this.results.length;
            dev = this.results.reduce((acc, curr) => acc + Math.pow((curr.averageLoad - avg), 2), 0)
                / this.results.length;

            return {
                avg: avg,
                dev: Math.sqrt(dev)
            }
        },

        /**
         * Simulator.multiRun.getAverageTurnaround; Get the average value of average turnaround of the processes that
         * have run in individual simulation runs of the last multiRun. Note that this function ignores any runs in
         * which no processes have exited, as those have all values set to 0 and would significantly (and wrongly)
         * lower the final results. Each calculation is run for all hte processes in individual simulations, regardless
         * of their scheduling class.
         * @memberof Simulator.multiRun
         * @return {Object} An object containing 5 entries:
         * - **avgAvg** (number): the average value of average turnaround times across all multiRun simulation runs
         * - **devAvg** (number): the standard deviation of the average latencies across all multiRun simulation runs
         * - **avgDev** (number): the average value of population standard deviation, calculated for average latencies
         * of individual simulation runs
         * - **avgExited**: (number): the average number of processes that have exited (and were hence used in the
         * turnaround time calculation) in individual simulation runs
         * - **avgRunning** (number): the average number of processes that have not exited (and were hence not used in
         * the turnaround time calculation) in individual simulation runs
         * - **resultsUsed** (number): the number of simulation runs of the last multiRun execution that were used in
         * above calculations. The simulations in which 0 processes have exited were skipped.
         */
        getAverageTurnaround: function() {
            var res = this.results.reduce((acc, curr) => {
                if (curr.averageTurnaround.exited > 0) {
                    acc.avg += curr.averageTurnaround.avg;
                    acc.dev += curr.averageTurnaround.dev;
                    acc.exitAvg += curr.averageTurnaround.exited;
                    acc.runAvg += curr.averageTurnaround.running;
                    acc.resultsUsed++;
                }
                return acc;
            }, {
                avg: 0,
                dev: 0,
                exitAvg: 0,
                runAvg: 0,
                resultsUsed: 0
            });

            var devAvg;
            if (res.resultsUsed > 0) {
                res.avg /= res.resultsUsed;
                res.dev /= res.resultsUsed;
                res.exitAvg /= res.resultsUsed;
                res.runAvg /= res.resultsUsed;

                devAvg = Math.sqrt(
                    this.results.reduce((acc, curr) => {
                        if (curr.averageTurnaround.exited > 0) {
                            acc += (Math.pow(curr.averageTurnaround.avg - res.avg, 2));
                        }
                        return acc;
                    }, 0) / res.resultsUsed
                );
            }

            return {
                avgAvg: res.avg,
                devAvg: devAvg,
                avgDev: res.dev,
                avgExited: res.exitAvg,
                avgRunning: res.runAvg,
                resultsUsed: res.resultsUsed
            };
        },

        /**
         * Simulator.multiRun.procStats; Get the average values of per-process simulation results, calculated over all
         * the simulations that ran in the last {@link index.html#simulatormultirunrun Simulator.multiRun.run()} call.
         * @memberof Simulator.multiRun
         * @return {Object[]} An array of objects that contain per-process statistics. The PID of the process that the
         * statistics belong to corresponds to the object's index in array. The structure of the objects returned in the
         * array is largely the same as with {@link index.html#simulatorprocstats Simulator.procStats()} call, with the
         * main difference being that all the values are now avereges, calculated from the values that
         * {@link index.html#simulatorprocstats Simulator.procStats()} returned for individual simulations. Other than
         * that, the turnaround.valid value changes from boolean to a number. That number represents the number of
         * simulations in which the process exited, making it possible to calculate its turnaround time and use it in
         * the average turnaround time calculation. Each of the objects in the array is hence as follows:
         * <pre><code>
         * {
         *     pid: the process ID of the given process,
         *     latency: {
         *         sum: the average sum of time that the process spent waiting
         *              over all of the simulations executed as part of
         *              multiRun,
         *         avg: the average value of the average time that the process
         *              spent waiting before it was picked to run over all the
         *              executed simulations,
         *         dev: the standard deviation of the above "avg" value
         *     },
         *     execution: {
         *         cnt: the average count of how many times the process was
         *              picked to run on the simulated processor in individual
         *              multiRun simulations,
         *         sum: the average sum of time that the process spent running
         *              in individual multiRun simulations,
         *         avg: the average value of the average time that the process
         *              spent running in individual multiRun simulations before
         *              it blocked or was preempted,
         *         dev: the standard deviation of the average "avg" value
         *     },
         *     turnaround: {
         *         valid: number, the number of individual simulations within
         *                multiRun result in which the process has concluded,
         *                the number of simulations that were used in the
         *                average turnaround time calculation,
         *         avg:   the average time from process's first appearance in
         *                the simulator to the time it exited, sampled from
         *                individual multirun simulations
         *         dev:   the standard deviation of the average of valid
         *                turnaround calculations
         *     }
         * }
         * </code></pre>
         */
        procStats: function() {
            var procRes = [];
            for (let i in this.results[0].processStats) {
                procRes.push({
                    pid: i,
                    pname: this.results[0].processList[i].pname,
                    latency: {
                        sum: 0,
                        avg: 0,
                        dev: 0,
                    },
                    execution: {
                        cnt: 0,
                        sum: 0,
                        avg: 0,
                        dev: 0,
                    },
                    turnaround: {
                        valid: 0,
                        avg: 0,
                        dev: 0,
                    }
                });
            }

            /* sum up values for averages */
            for (let i in this.results) {
                for (let j in this.results[i].processStats) {
                    let proc = this.results[i].processStats[j];
                    procRes[j].execution.cnt += proc.execution.cnt;
                    procRes[j].execution.sum += proc.execution.sum;
                    procRes[j].execution.avg += proc.execution.avg;
                    procRes[j].latency.sum += proc.latency.sum;
                    procRes[j].latency.avg += proc.latency.avg;
                    if (proc.turnaround.valid) {
                        procRes[j].turnaround.valid++;
                        procRes[j].turnaround.avg += proc.turnaround.value;
                    }
                }
            }

            /* calculate averages */
            let count = this.results.length;
            for (let i in procRes) {
                procRes[i].execution.cnt /= count;
                procRes[i].execution.sum /= count;
                procRes[i].execution.avg /= count;
                procRes[i].latency.sum /= count;
                procRes[i].latency.avg /= count;
                if (procRes[i].turnaround.valid > 0) {
                    procRes[i].turnaround.avg /= procRes[i].turnaround.valid;
                }
            }

            /* sum up values for standard deviations */
            for (let i in this.results) {
                for (let j in this.results[i].processStats) {
                    let proc = this.results[i].processStats[j];
                    procRes[j].execution.dev += Math.pow((proc.execution.avg - procRes[j].execution.avg), 2);
                    procRes[j].latency.dev += Math.pow((proc.latency.avg - procRes[j].latency.avg), 2);
                    if (proc.turnaround.valid) {
                        procRes[j].turnaround.dev += Math.pow((proc.turnaround.value - procRes[j].turnaround.avg), 2);
                    }
                }
            }

            /* calculate standard deviations */
            for (let i in procRes) {
                procRes[i].execution.dev = Math.sqrt(procRes[i].execution.dev / count);
                procRes[i].latency.dev = Math.sqrt(procRes[i].latency.dev / count);
                if (procRes[i].turnaround.valid > 0) {
                    procRes[i].turnaround.dev = Math.sqrt(procRes[i].turnaround.dev / procRes[i].turnaround.valid);
                }
            }

            return procRes;
        }

    }; /* Simulator.multiRun */


    /**
     * Simulator.procStats; Calculates and returns a list of per-process statistics. Should be run after the simulation
     * has concluded.
     *
     * @memberof Simulator
     * @return {Object[]} An array of objects that contain per-process statistics. The PID of the process that the
     * statistics belong to corresponds to the object's index in array. The structure of the objects returned in the
     * array is as follows:
     * <pre><code>
     * {
     *     pid: the process ID of the given process,
     *     latency: {
     *         sum: the sum of time that the process spent waiting,
     *         avg: the average time that the process spent waiting before it
     *              was picked to run,
     *         dev: the standard deviation of the average waiting time
     *     },
     *     execution: {
     *         cnt: the count of how many times the process was picked to run
     *              on the simulated processor,
     *         sum: the sum of time that the process spent running,
     *         avg: the average time that the process spent running before it
     *              blocked or was preempted,
     *         dev: the standard deviation of the average runtime
     *     },
     *     turnaround: {
     *         valid: boolean, true if the process has concluded and the
     *                turnaround time is a valid piece of information,
     *         value: the time from process's first appearance in the simulator
     *                to the time it exited
     *     }
     * }
     * </code></pre>
     */
    sim.procStats = function() {
        var results = [];

        let latAvg, latDev, runAvg, runDev;

        for (let i in procList) {
            let proc = procList[i];

            if (proc.latencyLog.length > 0) {
                latAvg = proc.latencyLog.reduce((acc, curr) => acc + curr) / proc.latencyLog.length;
                latDev = Math.sqrt(
                    proc.latencyLog.reduce((acc, curr) =>
                        acc + Math.pow((curr - latAvg), 2)
                    ) / proc.latencyLog.length);
            } else {
                latAvg = null;
                latDev = null;
            }

            if (proc.runLog.length > 0) {
                runAvg = proc.runLog.reduce((acc, curr) => acc + curr) / proc.runLog.length;
                runDev = Math.sqrt(
                    proc.runLog.reduce((acc, curr) =>
                        acc + Math.pow((curr - runAvg), 2)
                    ) / proc.runLog.length);
            } else {
                runAvg = null;
                runDev = null;
            }


            let turnaround = proc.alive ? null : proc.exited - proc.spawned;

            results.push({
                pid: i,
                latency: {
                    sum: proc.waitTime,
                    avg: latAvg,
                    dev: latDev
                },
                execution: {
                    cnt: proc.execCnt,
                    sum: proc.execTime,
                    avg: runAvg,
                    dev: runDev
                },
                turnaround: {
                    valid: !proc.alive,
                    value: turnaround
                }
            });
        }

        return results;
    }


    /**
     * Simulator.modProc; This function is used to modify the fields of process objects to store any additional
     * information that the scheduling classes require. Complex classes might need the processes to be modified in some
     * way and this function allows doing so without editing any of the core simulator code.
     *
     * This function can be used in two ways:
     * - **same value**: a string is supplied as propName and a value of any type as propVal. Each process will have a
     * new property added, with the name specified by propName and value specified by propVal. If propVal is an object,
     * it will be deep copied so that modifications of one process don't carry over to others.
     * - **different value**: an array of strings is supplied as propName and an array of values of any type as propVal.
     * Both arrays need to be of the same length, which is equal to number of processes in the simulation. The number
     * of processes can be obtained via "{@link index.html#simulatorgetproclist Simulator.getProcList()}.length". If
     * an array passed as propVal contains any objects, they are **not** deep copied, so that the user can decide by
     * themselves whether they need copied or referenced objects. Object deep copies can be done via
     * "var objectCopy = JSON.parse(JSON.stringify(objectToCopy))".
     *
     * @memberof Simulator
     * @param {string | string[]}   propName    The name of new (or existing) property of the process object that we
     * wish to assign a new value to.
     * @param {any | Array}         propVal     The new value to assign.
     * @param {string}              className   The name of the scheduling class whose processes should be edited. Use
     * "all" here to edit the processes of all classes.
     */
    sim.modProc = function(propName, propVal, className) {
        var modAll = false;
        if (typeof(className) !== "string") {
            throw new Error("className needs to be a string holding either a name of a scheduling class or \"all\", found: " + className);
        } else if (!schedClassPrio.includes(className)) {
            if (schedClassPrioRegistered.includes(className)) {
                throw new Error("The class referenced in className is not currently active, change className or assign a process to " + className);
            } else {
                throw new Error("Unknown scheduling class: " + className);
            }
        } else if (className === "all") {
            modAll = true;
        }

        var i;
        checkProcProp(propName);
        if (typeof(propName) === "string") {
            if (propVal instanceof Object) {    // objects are deep copied
                var propValStr = JSON.stringify(propVal);
                for (i = 0; i < procList.length; i++) {
                    if (modAll || procList[i].policy === className) {
                        procList[i][propName] = JSON.parse(propValStr);
                    }
                }
            } else {                            // simple values are assigned
                for (i = 0; i < procList.length; i++) {
                    if (modAll || procList[i].policy === className) {
                        procList[i][propName] = propVal;
                    }
                }
            }

        } else if (propName instanceof Array) {
            if (propName.length !== sim.getProcList().length) {
                throw new Error("propName is an array, but its size doesn't match the number of processes.");
            } else if (!(propVal instanceof Array)) {
                throw new Error("propName is an array, but propVal isn't: propVal needs to be an array with an entry for each string in propName.");
            } else if (propVal.length !== sim.getProcList().length) {
                throw new Error("propName is an array, but its size doesn't match the number of processes. There has to be an entry in propVal for each string in propName.");
            }

            for (i = 0; i < procList.length; i++) {
                if (modAll || procList[i].policy === className) {
                    procList[i][propName[i]] = propVal[i];
                }
            }
        } else {
            throw new Error("propName is neither a string nor an array of strings.");
        }
    }


	/* Scheduling related functions --------------------------------------------------------------------------------- */

	/**
	 * Simulator.pickNext; Pick the next process to be run. This method also:
	 * - calls handlePreempt if the previously running process didn't block on its own
	 * - updates the picked process's behavior
	 * - sets the picked process's end event (block or exit)
	 * @memberof Simulator
	 */
	sim.pickNext = function() {
		var prev;
        var next = null;
        var now = sim.time();

        /* store the process that ran up until now */
        prev = curr;

        /* handle preemption of the previously running process */
        if (prev !== null && prev !== undefined && prev.runnable) {
            handlePreempt(prev);
        }

		/* get next process from scheduling classes, call updateLatency on those that don't get to pick a process */
        sim.calledPutPrev = false;
		for (var i = 0; i < schedClassPrio.length; i++) {
            if (next === null) {
                next = schedClassActive[schedClassPrio[i]].pickNext(prev);
                if (next !== null && !sim.calledPutPrev) {
                    throw new Error("the scheduling class "+schedClassPrio[i]+" returned a process to run, but never made a call to \"Simulator.putPrev(prev)\". This call is essential to the functioning of the simulator and MUST be made if a process is picked.");
                } else if (next === null && sim.calledPutPrev) {
                    throw new Error("the scheduling class "+schedClassPrio[i]+" returned null, but made a call to \"prev.schedClass.putPrev(prev)\". Please only call putPrev() when a process is actually returned! If it's not, another class that does return a process will make the call instead.");
                }
            } else {
                schedClassActive[schedClassPrio[i]].updateLatency();
            }
		}
		/* run idle if we got nothing, otherwise handle process's latency */
		if (next === null || next === undefined) {
			next = idle;
		} else {
			contextSwitches++;

            /* update the process's latency stats */
            if (next.waiting) {
                let schedClass = next.schedClass;

                /* calculate the waiting time of the process */
                let pWaitTime = now - next.enqueued;

                /* log the time that the process spent waiting */
                next.latencyLog.push(pWaitTime);
                next.waitTime += pWaitTime;
                next.waiting = false;

                /* update latency sum */
                schedClass.latencySum += (now - schedClass.latencyUpdate) * schedClass.nrWaiting;
                schedClass.latencyUpdate = now;
                /* subtract the process's wait time from latency sum */
                schedClass.latencySum -= pWaitTime;
                /* decrement the number of waiting processes */
                schedClass.nrWaiting--;
            }
		}

        /* Log the pick in the process. */
        next.execLog.push(new LogEntry(now, LogEvent.pick));
        /* Log the pick in the simulation log. */
        simEventLog.push(new PickEvent(now, next));

		/* The time for which the task shall run. Actually determined later on. */
		var runTime = -1;
		/* Exit event parameters. */
		var exitCond, exitNice;

		/* Tells us whether the process block/exit event has been set already. We can set an exit event inside process
		 * behavior update, but if we have a neverending process on its last behavior update we never enter the behavior
		 * update code in the first place. For this reason, the block event is set outside of the behavior check, but
		 * only if an exit event wasn't set already. This variable tells us if it was. */
		var endEventSet = false;

		/* update process's behavior */
        /* NOTE: this currently picks the next behavior if its conditions are met. This means that it will always only
         * check the next behavior, even though the conditions for the next few could be met. This could be modified
         * to offer an option to keep checking and updating behaviors for as long as possible - so as long as new ones
         * meet the conditions.
         * Current behavior allows processes to have multiple behaviors determined on the same condition: each time the
         * process is picked the next behavior will be consumed.
         * Suggested edit would allow behavior to be updated with multiple behavior entries at once. It would also offer
         * a simple "AND" clause - multiple behaviors could be passed in a single pick, so long as ALL their conditions
         * were met (so behavior1_cond && behavior2_cond && ...) */
		if (next.nextBehIndex < next.behavior.length) {
			var nextBeh = next.behavior[next.nextBehIndex];
			if (!nextBeh.final && (
                nextBeh.procExec !== undefined && next.execTime >= nextBeh.procExec ||
				nextBeh.simExec  !== undefined && now >= nextBeh.simExec ||
				nextBeh.execCnt  !== undefined && next.execCnt >= nextBeh.execCnt)) {
					if (nextBeh.run !== undefined) {
						next.currBehavior.run = nextBeh.run;
					}
					if (nextBeh.block !== undefined) {
						next.currBehavior.block = nextBeh.block;
					}
					if (nextBeh.priority !== undefined) {
						next.currBehavior.priority = nextBeh.priority;
					}
					next.nextBehIndex++;
			}

			/* handle the case where the next behavior entry is a final/exit behavior */
			if (next.nextBehIndex < next.behavior.length && next.behavior[next.nextBehIndex].final) {
				nextBeh = next.behavior[next.nextBehIndex];

				/* determine the time for which the task shall run */
                if (next.remainingRuntime > 0) {
                    /* use up remaining runtme if there's still any left */
                    runTime = next.remainingRuntime;
                } else {
                    /* decide on a new runtime value */
                    runTime = getProcVal(next.currBehavior.run);
                    /* store it in process */
                    next.remainingRuntime = runTime;
                }

				var endTime = -1;
				if (nextBeh.procExec !== undefined && next.execTime + runTime >= nextBeh.procExec) {
					exitCond = ExitCond.procExec;
					if (nextBeh.endNicely) {
						exitNice = true;
						endTime = now + runTime;
					} else {
						exitNice = false;
                        if (next.execTime >= nextBeh.procExec) {
                            /* exit right away if we have already passed the set time */
                            endTime = now + 1;
                        } else {
                            endTime = now + (nextBeh.procExec - next.execTime);
                        }

					}
				} else if (nextBeh.simExec !== undefined) {
					exitCond = ExitCond.simExec;
					if (nextBeh.endNicely) {
                        if (now + runTime >= nextBeh.simExec) {
                            exitNice = true;
                            endTime = now + runTime;
                        } // else nothing, simExec time wouldn't be reached yet
					} else {
                        // this check could probably just NOT set an event if one is already there, needs testing
                        if (next.strictEndEvent instanceof Event) {
                            deleteEvent(next.strictEndEvent);
                        }

                        /* Set a non-nice exit on sim exec differently, as it can happen at any time in any process
                         * state. More on this in Process.strictEndEvent documentation. */
                        let strictEndTime = nextBeh.simExec < now ? now : nextBeh.simExec;
                        next.strictEndEvent = insertEvent(new ExitEvent(strictEndTime, next, ExitCond.simExec, false));

                        /* Check if the process should exit during its runtime. If so, set our ExitEvent as
                         * next.nextEvent as well, to let other parts of the simulator know that the process is supposed
                         * to be exiting soon. Leave endTime alone, but mark that we already set the end event. */
                        if (now + runTime >= nextBeh.simExec) {
                            next.nextEvent = next.strictEndEvent;
                            endEventSet = true;
                        }
                        /* else: Leave endTime alone, so a normal block event still gets set. */
					}
				} else if (nextBeh.execCnt  !== undefined && next.execCnt + 1 >= nextBeh.execCnt) {
					exitCond = ExitCond.execCnt;
                    if (nextBeh.endNicely) {
                        exitNice = true;    // exits when runTime is used up
                    } else {
                        exitNice = false;   // exits on preempt too
                    }
					endTime = now + runTime;
				}

				if (endTime > 0) {	// end time was set, place an exit event at it
					next.nextEvent = insertEvent(new ExitEvent(endTime, next, exitCond, exitNice));
					endEventSet = true;
				}

			}
		} /* update process's behavior */

		/* Increment execution counter. We use it in behaviors above, so it's a good idea to calculate it after the
		 * behavior-related operations are done. */
		next.execCnt++;

		/* Set block event and link it in the process, IF we didn't already set an exit event for the process above. */
		if (!endEventSet) {
            /* If a runTime was already set above it was also stored in "next.remainingRuntime" and will be reused here,
             * so no worries about picking a new value that would differ from one previously used in exit checks. */
            if (next.remainingRuntime > 0) {
                /* use up remaining runtme if there's still any left */
                runTime = next.remainingRuntime;
            } else {
                /* decide on a new runtime value */
                runTime = getProcVal(next.currBehavior.run);
                /* store it in process */
                next.remainingRuntime = runTime;
            }
			next.nextEvent = insertEvent(new BlockEvent(now + runTime, next));
		}

		/* Set the process's picked time. */
		next.picked = now;

        /* Set the running process. */
        curr = next;

		return null;
	} /* sim.pickNext */


    /**
     * A helper for calling the {@link index.html#schedclassputprev SchedClass.putPrev(prev)} method. This MUST be
     * called inside every {@link index.html#schedclasspicknext SchedClass.pickNext()} method!
     * @memberof Simulator
     * @param  {Process} prev The process that was running up until now.
     */
    sim.putPrev = function(prev) {
        prev.schedClass.putPrev(prev);
    }

    /**
     * A method for checking priority of a newly runnable process and deciding whether it should be run straight away.
     * If the new process belongs to a scheduling class with a higher priority than the currently running one, it will
     * always preempt the current one and run straight away. If the new process belongs to the same scheduling class as
     * the currently running one, the {@link index.html#schedclasscheckpreempt SchedClass.checkPreempt} method of this
     * scheduling class shall be called to make the decision. Processes from lower priority classes cannot preempt
     * higher priority ones.
     * @memberof Simulator
     * @param  {Process} proc The process that just entered a runnable state (got enqueued).
     */
    sim.checkPreempt = function(proc) {
        if (proc.schedClass === curr.schedClass && sim.preemption) {
            proc.schedClass.checkPreempt(proc);
        } else {
            for (let i = 0; i < schedClassPrio.length; i++) {
                if (schedClassActive[schedClassPrio[i]] === proc.schedClass) {
                    sim.pickNext();
                } else if (schedClassActive[schedClassPrio[i]] === curr.schedClass) {
                    return;
                }
            }
        }
    }


}) (Simulator);
