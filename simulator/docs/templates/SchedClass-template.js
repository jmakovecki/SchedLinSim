/**
 * A template of a SchedClass, to be used as an example when implementing a custom scheduling class. It is based on
 * the included RoundClass scheduling class and implemented in
 * {@link templates/SchedClass-template.js /docs/templates/SchedClass-template.js}. Please refer to the implementation
 * file and its comments for further info on implementing a scheduling class.
 *
 * In the comments, we'll mark the parts that are not completely necessary as "optional code".
 * We'll mark the parts that need to be re-implemented as "custom code".
 * Assume that everything else should be left as it is.
 *
 * @extends SchedClass
 * @param {string} name "SchedClassTemplate" in this case, the name that will be used to identify this scheduling class.
 */
class SchedClassTemplate extends SchedClass {	// instead of "SchedClassTemplate" rename your class as you see fit
	constructor(name) {
		super(name);
	}


	/* The init function of the simulation. This gets called at the start of every simulation and sets up our scheduling
	 * class. Inside init we make sure that all the needed structures are present and all of our data is reset to
	 * default values, so that no values from potential previous simulations remain at the start of a new one. */
	init(classParams) {
		super.init();

		// ---- optional code start --------------------------------------------------------------------------------- //

		/* Simulation settings. Take care of any default settings that your class might require here. */

		/* Add a default time slice length that we'll use for the processes unless something else is specified. */
		this.timeSlice = 1000;

		/* Load the parameters that the class receives from simulation definition.
		 * First, check if we received any parameters at all. This check needs to be done when using parameters. */
		if (classParams !== undefined) {
			/* Next, check for individual parameters. We only have one parameter, timeSlice, so we'll check if we were
			 * given that. */
			if (classParams.timeSlice !== undefined) {
				/* We could just read the time slice value and save it as this.timeSlice here, but then it would have
				 * to always be passed as a number, even for huge values. Instead, we'll leverage the simulator's suffix
				 * processing function in order to accept both "17000000" and "17ms" as valid values. The string that
				 * we pass to Simulator.handleSuffix simply tells us where the value we're parsing is from, it's used
				 * to inform the user where they made an error if an invalid value is found. */
				let timeSlice = Simulator.handleSuffix(classParams.timeSlice, "simulation configuration, class parameters, SchedClassTemplate, timeSlice");
				/* The handleSuffix function reads the value and returns a number that we can save as our new
				 * timeSlice. */
				this.timeSlice = timeSlice;
			}
		}

		/* Add timeslices to the processes. For this, we use a modProc call, that can quickly modify all the processes
		 * that belong to our scheduling class at once. It also makes sure that we aren't overwriting any important
		 * process values. In our case, the value of this.timeSlice will be added to every process of this.name
		 * scheduling class, as Process["timeSlice"]. */
		Simulator.modProc("timeSlice", this.timeSlice, this.name);

		// ---- optional code end ----------------------------------------------------------------------------------- //
		// ---- custom code start ----------------------------------------------------------------------------------- //

		/* Set up the runqueue. The proceses that are waiting to be executed are kept in the runqueue.
		 * You can use any type of data structure for this, but you'll definitely need *something*. We'll use a simple
		 * array to implement a FIFO queue. */
		this.runqueue = [];

		// ---- custom code end ------------------------------------------------------------------------------------- //
	}


	/* This function returns an object with default parameters for the scheduling class. It's used to inform the users
	 * of available parameters and their default values. It needs to be here, even if no parameters are used, but can
	 * just return an empty object. */
	classParamsTemplate() {
		var params = super.classParamsTemplate();

		// ---- optional code start --------------------------------------------------------------------------------- //
		params.timeSlice = 1000;
		// ---- optional code end ----------------------------------------------------------------------------------- //

		return params;
    }


	/* This function returns a description of our scheduling class. A new line is supported via \n and will be displayed
	 * correctly in the GUI. Aside from a description of the class, it also makes sense to describe any parameters
	 * that our class accepts. */
	getDescription() {
		// ---- custom code start ----------------------------------------------------------------------------------- //
		return "A template class, used as an example for implementing new scheduling classes. It mostly follows a round\
			robin scheduling policy with preemption. When a process uses up its timeslice or blocks, it is\
			replaced by the next process in the queue. New processes get added to the end of the queue.\n\n\
			Accepted parameters: timeSlice: the length of time slice allocated to the processes.";
		// ---- custom code end  ------------------------------------------------------------------------------------ //
	}


	/* This function adds a process to the runqueue. Note that this doesn't only happen when the process starts or wakes
	 * up, it can also be the result of a process being preempted. For this reason, this function should only do what it
	 * needs to: add the process to the runqueue.
	 * Most of the logic here is optional and can be done in any way you wish, just make sure of the following 2 things:
	 * - that super.enqueue(proc) call gets done at the start
	 * - that the process "proc" gets added to the runqueue */
	enqueue(proc) {
		super.enqueue(proc);

		// ---- custom code start ----------------------------------------------------------------------------------- //

		/* Our scheduling policy is simple, so we'll reset the time slice on every enqueue. You usually wouldn't do this
		 * and would reset it, for example, when the previous time slice is used up. */
		proc.timeSlice = this.timeSlice;

		/* Push the new process to the end of the runqueue. */
		this.runqueue.push(proc);

		// ---- custom code end ------------------------------------------------------------------------------------- //
	}


	/* This function removes a process from the runqueue. Note that this can happen for multiple reasons, so the
	 * function should be kept simple and only make sure of two things:
	 * - that it calls super.dequeue(proc);
	 * - that the process "proc" gets removed from the runqueue */
	dequeue(proc) {
		super.dequeue(proc);

		// ---- custom code start ----------------------------------------------------------------------------------- //

		/* Go through all of out processes and remove "proc" once we find it. */
		for (var i = 0; i < this.runqueue.length; i++) {
			if (this.runqueue[i] === proc) {
				this.runqueue.splice(i, 1);
				break;
			}
		}

		// ---- custom code end ------------------------------------------------------------------------------------- //
	}


	/* This function picks and returns the next process to be run. It needs to make sure of the following:
	 * - that it calls super.pickNext(prev) at the start
	 * - that it returns a process if the runqueue contains any
	 *   - that it calls Simulator.putPrev(prev) ONLY IF it returns a process
	 * - that it returns null if the runqueue is empty and there aren't any processes to run
	 *   - that it does NOT call Simulator.putPrev(prev) IF it returns null
	 * So, in short, either return a process and call Simulator.putPrev(prev), or return null and don't call it.
	 *
	 * Note that the running process can be either kept on the runqueue or off the runqueue. The decision about this is
	 * yours to make, just make sure of one thing: if you remove a process from the runqueue without calling
	 * this.dequeue(proc), then you MUST set its onRq value to false (proc.onRq = false). This value needs to be kept
	 * correct at all times, as it makes sure that the simulator doesn't try to enqueue or dequeue a process when it
	 * doesn't need to, which could cause errors. */
	pickNext(prev) {
		super.pickNext(prev);

		// ---- custom code start ----------------------------------------------------------------------------------- //

		/* If we have any processes, call putPrev and return a process. Just return null if the runqueue is empty. */
		var picked;
		if (this.runqueue.length > 0) {
			Simulator.putPrev(prev);	// we have a process to return, call Simulator.putPrev with the previous process
			picked = this.runqueue[0];	// pick the first process on the runqueue, since it was in there the longest

			/* Log the starting time of task execution. The Process.updated variable is free to be used by scheduling
			 * classes for whatever reason they see fit, but most likely timeslice update times. */
			picked.updated = Simulator.time();

			return picked;	// return our picked process
		}

		return null;		// if we don't have a process to return, just return null

		// ---- custom code end ------------------------------------------------------------------------------------- //
	}


	/* This function cleans up after a process that has finished executing. It gets called by the simulator. It can do
	 * many things, such as decrease remaining timeslice length, update statistics, ets, but it NEEDS to do the
	 * following two:
	 * - call super.putPrev(prev) at the start
	 * - put a process that got preempted back onto the runqueue
	 *
	 * Even if your class doesn't support preemption, the process can still be interrupted during its execution by a
	 * process of a higher priority scheduling class. A preempted process can be differentiated from a sleeping process
	 * via its "Process.runnable" value. If "prev.runnable" is false, it blocked. If "prev.runnable" is true, it was
	 * preempted and needs to be re-enqueued. */
	putPrev(prev) {
		super.putPrev(prev);

		// ---- custom code start ----------------------------------------------------------------------------------- //
		/* Re-enqueue process if it's still runnable (didn't block, just got preempted). We don't decrease the timeslice
		 * here because we use really simple timeslices that get reset on enqueue, but many other scheduling policies
		 * would. */
		if (prev.runnable) {
			this.dequeue(prev);		// we keep the active process on the runqueue, dequeue it now that it's done
			this.enqueue(prev);		// enqueue the process to put it at the back of the runqueue
		}
		// ---- custom code end ----------------------------------------------------------------------------------- //
	}


	/* This function gets called when a new process of our class wakes up while a process of our class is already
	 * executing. It can decide whether the new process should be run instead of current one and call for a reschedule.
	 * Our scheduling class doesn't support this feature, so we left it empty, but many others do. */
	checkPreempt(proc) {
		super.checkPreempt(proc);

		// ---- optional code start --------------------------------------------------------------------------------- //
		/* As noted, this class does not use this sort of preemption, but another class, for example one that uses
		 * process priorities, could. That could be implemented similar to the following:
		 *
		 * var currentProcess = Simulator.getCurr();
		 * if (currentProcess.currBehavior.priority < proc.currBehavior.priority) {
		 *     Simulator.pickNext();
		 * }
		 *
		 * */
		// ---- optional code end ----------------------------------------------------------------------------------- //
	}


	/* This function gets called periodically during the simulation, in intervals specified by the timerTickLen value
	 * in simulation configuration. It is mostly used to update process timeslices and decide whether the currently
	 * running process has executed long enough and should hence be preempted. */
	taskTick() {
		super.taskTick();

		// ---- optional code start --------------------------------------------------------------------------------- //

		/* Decrease timeslice. If it ran out, call for reschedule. */
		var now = Simulator.time();
		var curr = Simulator.getCurr();
		curr.timeSlice -= now - curr.updated;
		curr.updated = now;			// Log the task timeslice update timer.

		if (curr.timeSlice <= 0) {
			Simulator.pickNext();	// Pick the next task to run.
		}

		// ---- optional code end ----------------------------------------------------------------------------------- //
	}

	/* This function returns a 2D array of class-specific statistics, set up as an array of name-value pairs. The super
	 * method already provides 2 basic statistics, but a scheduling class can add their own as well. The statistics
	 * returned by this method get included in the simulation result and displayed in the GUI. Our class doesn't add
	 * any extra statistics here, but some might want to. */
	getClassStats() {
		var res = super.getClassStats();

		// ---- optional code start --------------------------------------------------------------------------------- //
		/* Any extra statistics could be added here as:
		 *
		 * res.push([myStatisticDescription, myStatisticValue]);
		 * */
		// ---- optional code end --------------------------------------------------------------------------------- //

		return res;
	}
}

/* This is a self-executing function that registers our scheduling class in the simulator when this file gets parsed,
 * either when it's added to the simulator via the gui, or included as a file in the HTML code. */
(function() {
	// ---- custom code start --------------------------------------------------------------------------------------- //
	var name = "SchedClassTemplate";				// change the name to the name of your class
	var myClass = new SchedClassTemplate(name);		// create a new instance of your class
	Simulator.registerSchedClass(name, myClass);	// register it in the simulator
	// ---- custom code end --------------------------------------------------------------------------------------- //
}) ();
