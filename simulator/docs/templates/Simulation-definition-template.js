/**
 * SimulationDefinitionTemplate is a simulation definition that serves as an example for writing simulation
 * definitions. It contains comments that explain the required simulation settings, process definitions, process
 * behaviors and extra functionality that the definitions offer. The template is implemented in the file
 * {@link templates/Simulation-definition-template.js /docs/templates/Simulation-definition-template.js}.
 *
 * Note that simulation definitions are usually packaged as JSON files, but we used a JavaScript file here since we need
 * to include comments, which are not supported in JSON.
 *
 * @type {Object}
 */

/* A simulation definition is written in the form of a JSON object. It contains:
 * - simulation settings
 * - settings for scheduling classes that implement scheduling policies
 * - definitions of individual processes with process behaviors, that can change during the simulation
 *
 * Time values in simulation definitions are interpreted as nanoseconds by default. A suffix can be added in order to
 * use other units, such as microseconds or minutes.
 *
 * Some time values in the simulation have to be precise, while others can be defined as an interval, from which an
 * exact value of nanoseconds is chosen at random. "1 ms" is always a millisecond, but ["2ms", "42ms"] can be anything
 * from 2 to 42 milliseconds.
 */

var SimulationDefinitionTemplate = {

	/* SIMULATION SETTINGS ========================================================================================== */

	/* The simulation name. Required. */
	"name": "Example",
	/* The simulation length. Required, precise, > 0. */
	"simLen": "30ms",
	/* The frequency of the system timer. Every timerTickLen nanoseconds a timer interrupt will happen and scheduling
	 * class of the active process will get a chance to update and possibly replace the active process.
	 * Required, precise, > 0. */
	"timerTickLen": "0.5ms",
	/* The default policy for scheduling processes in the simulator, valid values are the names of registered scheduling
	 * classes. Every process can define its own scheduling policy, so this field is only required when a process with
	 * no policy definition exists. */
	"policy": "RoundClass",
	/* The simulation description. Optional. */
	"description" : "An example simulation definition.",

	/* Scheduling class priority list. Scheduling classes are ordered by priority and the processes that belong to
	 * classes of higher priority will always run before the processes of classes with lower priority. If processes
	 * of multiple scheduling classes exist in the simulation, then this list can be used to set the priority of the
	 * classes, in descending priority order. If it is not set, the default class order will be used. This list does
	 * not need to contain all the used classes either, but the ones it does will get higher priority. Optional. */
	"classPrio": ["FCFSClass", "RoundClass"],

	/* Scheduling class parameters. These differ from class to class and are ususally explained in scheduling class
	 * descriptions. Default parameters can be obtained from a class by calling its SchedClass.classParamsTemplate()
	 * function. Optional. */
	"classParams": {
		/* Each scheduling class should have its desired parameters listed in an object that matches the class's name.
		 * The object itself will be passed to the class on initialization. Parameters or classes that arent listed here
		 * will use their default settings. */
		"RoundClass": {
			/* Class parameters are usually given in the form of key-value pairs. This is true for all readily available
			 * classes, but can differ for others, as the exact implementation of parameters is left to every scheduling
			 * class itself. */
			"timeSlice": "0.6ms"
		}
	},

	/* PROCESS DEFINITIONS ------------------------------------------------------------------------------------------ */

	/* Process definitions are given in the form of an array of objects, where each object represents a process. Every
	 * simulation needs a process, so at least one is required. */
	"processes": [
		/* First process. Required. */
		{
			/* Process name. An arbitrary string. Required. */
			"pname": "Process A",
			/* Process spawn time, the time at which it appears in the simulation. This process will appear in the
			 * simulation at a random time between 0 and 0,8 ms.
			 * Required, precise or random, >= 0. */
			"spawn": [0, "800us"],
			/* The scheduling policy that the process follows, also known as the name of the scheduling class that the
			 * process belongs to. This is optional if a simulation-wide scheduling policy is defined above, but can
			 * change the scheduling class for this particular process to a different one, as it does here. Valid values
			 * are the names of registered scheduling classes. */
			"policy": "FCFSClass",

			/* The process behavior list. Behaviors define how a process will function during its lifetime via 3
			 * different values:
			 * - run: the time for which a process will run before it blocks
			 * - block: the time that the process will stay blocked until it tries to run again
			 * - priority: process priority, for the classes that support it
			 *
			 * Behaviors can change during the course of the simulation when certain conditions are met and can also
			 * make the process exit. Behavior change can occur when the process is picked to be executed. A process
			 * definition can contain as many behavior entries as we want, but only one behavior change can occur per
			 * process pick and always only to the behavior that follows the current one in the array.
			 * At least one behavior is required per process. */
			"behavior": [
				/* The first behavior entry, it must contain all 3 fields: run, block and priority. */
				{
					/* The time that the process wishes to run before it blocks. Required, precise or random. */
					"run": "1ms",
					/* The time that the process will block for. This process will block for a random time between 2 ms
					 * and 4 ms. Required, precise or random. */
					"block": ["2ms", "4ms"],
					/* Priority, differs from class to class. See scheduling class descriptions for more. FCFSClass
					 * does not use priority, but it still needs to be defined here. Required. */
					"priority": 0
				},
				/* The second behavior entry. It will become active once its conditions are met. The conditions for
				 * switching to a new behavior entry can be defined in one of three ways:
				 * - simExec, simulation execution time. The process will switch to this behavior if the simulation has
				 * 	 run for at least this much time. Precise or random.
				 * - procExec, process execution time. The process will switch to this behavior if it spent at least
				 *   this much time running. Precise or random.
				 * - execCnt, process execution count. The process will switch to this behavior if it was picked to run
				 *   at least this many times. Precise or random.
				 *
				 * Exactly one behavior switch condition must be present on behavior entries beyond the first one.
				 * At least one behavior update field (run, block, priority) must be defined on behavior entries beyond
				 * the first one. */
				{
					/* The process will switch to this behavior when it gets picked to run after the simulation has run
					 * for at least 5ms. */
					"simExec": "5ms",
					/* The process will run for a random time between 2 ms and 3 ms. */
					"run": ["2ms", "3ms"]
				},
				/* The final behavior entry. Its conditions are the same as a regular entry's, but instead of updating
				 * the process's behavior it makes the process exit. A process does not need to contain a final behavior
				 * entry, it can simply run until the end of simulation. */
				{
					/* This behavior entry will become active (and make the process exit) if:
					 * - the previous behavior entry is active and
					 * - the process has spent at least 7ms executing */
					"procExec": "7ms",
					/* The "final" field with a value true tells us that this is a final behavior entry that ends the
					 * process. If this is set to true, the entry doesn't need to include any behavior update fields
					 * (run, block, priority), as the process will end anyway. */
					"final": true,
					/* endNicely is a modifier for the way that processes end. It defaults to true and will also be set
					 * to true if it's left undefined. When set to true, the simulator will wait for the process to
					 * block on its own before ending it. When set to false, the process will end as soon as the behavor
					 * change condition is fulfilled. This process will end as soon as it's gotten 7 ms of run time.
					 * Optional. */
					"endNicely": false
				}
			]
		},

		/* Second process and above. Optional. */
		{
			/* Process name. */
			"pname": "Process B",
			/* This process will spawn at a random time between 0 and 1ms. */
			"spawn": [0, "1ms"],
			/* Note the absence of the "policy" field - this process will belong to the default class set in the
			 * simulation definition settings, policy field: RoundClass */
			"behavior": [
				{
					"run": "1ms",
					"block": "1ms",
					"priority": 0
				},
				{
					/* This process will change its behavior once it's picked to run for the 3rd time. */
					"execCnt": 3,
					/* This behavior entry updates both the process's run time and block time. */
					"run": "10ms",
					"block": "2ms"
				}
			]
		}
	]
}

var SimulationDefinitionTemplateShort =
/* This is a version of the above definition without the comments. If it is copied into its own file and saved as JSON,
 * it can be directly loaded into the simulator and run to see the resulting simulation. */
{
	"name": "Example",
	"simLen": "30ms",
	"timerTickLen": "0.5ms",
	"policy": "RoundClass",
	"description" : "An example simulation definition.",

	"classPrio": ["FCFSClass", "RoundClass"],

	"classParams": {
		"RoundClass": {
			"timeSlice": "0.6ms"
		}
	},

	"processes": [
		{
			"pname": "Process A",
			"spawn": [0, "800us"],
			"policy": "FCFSClass",

			"behavior": [
				{
					"run": "1ms",
					"block": ["2ms", "4ms"],
					"priority": 0
				},
				{
					"simExec": "5ms",
					"run": ["2ms", "3ms"]
				},
				{
					"procExec": "7ms",
					"final": true,
					"endNicely": false
				}
			]
		},
		{
			"pname": "Process B",
			"spawn": [0, "1ms"],
			"behavior": [
				{
					"run": "1ms",
					"block": "1ms",
					"priority": 0
				},
				{
					"execCnt": 3,
					"run": "10ms",
					"block": "2ms"
				}
			]
		}
	]
}


var SimpleSystemExample =
/* If the following object is copied into a new file and saved as JSON, it becomes a valid simulation definition
 * and can be loaded into the simulator. It is the same as "Simple system example" in simulation presets, with the
 * difference being that it's written in proper JSON notation, as opposed to being a regular object in JavaScript code.
 *
 * Many more definitions can be found in SimulationPresets.js, and while they have to be rewritten into proper JSON
 * notation to be saved as such, their contents are valid and helpful as examples. */
{
	"name": "Simple System Example",
	"simLen": "15ms",
	"timerTickLen": "0.5ms",
	"policy": "LinuxFairClass",
	"classPrio": [
		"RoundClass",
		"LinuxFairClass",
		"FCFSClass"
	],
	"classParams": {
		"RoundClass": {
			"timeSlice": "0.6ms"
		},
		"LinuxFairClass": {
			"timeScale": "1ms"
		}
	},
	"processes": [
		{
			"pname": "System Task 1",
			"spawn": "3ms",
			"policy": "RoundClass",
			"behavior": [
				{
					"priority": 0,
					"run": "2ms",
					"block": "10ms"
				},
				{
					"simExec": "8ms",
					"final": true,
					"endNicely": false
				}
			]
		},
		{
			"pname": "System Task 2",
			"spawn": "3,3ms",
			"policy": "RoundClass",
			"behavior": [
				{
					"priority": 0,
					"run": "2ms",
					"block": "7ms"
				}
			]
		},
		{
			"pname": "User Process 1",
			"spawn": "0",
			"policy": "LinuxFairClass",
			"behavior": [
				{
					"priority": 0,
					"run": "0.5ms",
					"block": "1ms"
				},
				{
					"simExec": "6ms",
					"run": ["2ms","4ms"],
					"block": ["2ms","3ms"]
				}
			]
		},
		{
			"pname": "User Process 2",
			"spawn": "0",
			"behavior": [
				{
					"priority": 2,
					"run": "0.5ms",
					"block": "1ms"
				},
				{
					"execCnt": 4,
					"run": ["4ms","6ms"],
					"block": ["5ms","10ms"]
				}
			]
		},
		{
			"pname": "Batch Job",
			"spawn": "0",
			"policy": "FCFSClass",
			"behavior": [
				{
					"priority": 0,
					"run": ["50ms","100ms"],
					"block": "5ms"
				}
			]
		}
	]
}
