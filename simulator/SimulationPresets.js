/**
 * @namespace SimulationPresets
 * @description A collection of preset simulation configurations (simConf) that can be used in the simulator.
 * @type {Object}
 */
var SimulationPresets = {};
(function(sp) {

	sp.behaviorConf = {
		name: "Process behavior change demonstration",
		description: "Demonstrates all the conditions that can be used in process behavior changes.\n\n\
		- Our process starts with a default behavior that tells it to run for 5ns, then block for 2ns.\n\
		- The behavior change condition \"procExec\" : \"8\" is fulfilled after the process runs for 8ns and comes into\
			effect the next time that the process gets picked. It updates the process's run time to 2ns.\n\
		- The behavior change condition \"execCnt\" : \"5\" is fulfilled after the process runs 5 times and comes into\
			effect the next time that the process gets picked. It updates the process's block time to 5ns.\n\
		- The behavior change condition \"simExec\" : \"40\" is fulfilled after the simulation runs for 40ns and comes\
			into effect the next time that the process gets picked. It updates the process's run time to 100ns and its\
			block time to 5ns.",
		simLen: 50,
		timerTickLen: 10,
		policy: "FCFSClass",

		processes: [
			{
				pname: "Process",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 2
					},
					{
						procExec: 8,
						run: 2
					},
					{
						execCnt: 5,
						block: 5,
					},
					{
						simExec: 40,
						run: 100,
						block: 1,
					}
				]
			},
		]
	}

	sp.endingConf = {
		name: "Process ending demonstration",
		description: "Demonstrates all the different process exit behaviors that the simulator supports. Runs\
		processes in a simple first come, first served manner.\n\n\
		- exitSimExec exits on simulation execution time 5\n\
		- exitSimExecNice exits when it would block, after simulation execution time exceeds 5\n\
		- exitProcExec exits after executing for 3 time units\n\
		- exitProcExecNice exits when it would block, after its execution time exceeds 3 time units\n\
		- exitExecCnt exits after it's been selected for execution 2 times (even if it didn't block on its own after\n\
			last run)\n\
		- exitExecCntNice when it would block, after it's been selected for execution 2 times (so it has to block on\
			its own to exit)\n\
		- interruptor only interrupts exitExecCnt and exitExecCntNice, then exits. To that end, it is run by a higher\
			priority class.",
		simLen: 25,
		timerTickLen: 10,
		policy: "FCFSClass",
		classPrio: ["RoundClass", "FCFSClass"],

		processes: [
			{
				pname: "exitSimExec",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 2,
						block: 2
					},
					{
						simExec: 5,
						final: true,
						endNicely: false
					}
				]
			},
			{
				pname: "exitSimExecNice",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 2,
						block: 2
					},
					{
						simExec: 5,
						final: true,
						endNicely: true
					}
				]
			},
			{
				pname: "exitProcExec",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 2,
						block: 2
					},
					{
						procExec: 3,
						final: true,
						endNicely: false
					}
				]
			},
			{
				pname: "exitProcExecNice",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 2,
						block: 2
					},
					{
						procExec: 3,
						final: true,
						endNicely: true
					}
				]
			},
			{
				pname: "exitExecCnt",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 2,
						block: 2
					},
					{
						execCnt: 2,
						final: true,
						endNicely: false
					}
				]
			},
			{
				pname: "exitExecCntNice",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 2,
						block: 2
					},
					{
						execCnt: 2,
						final: true,
						endNicely: true
					}
				]
			},
			{
				pname: "interruptor",
				spawn: 18,
				policy: "RoundClass",
				behavior: [
					{
						priority: 0,
						run: 2,
						block: 1
					},
					{
						execCnt: 2,
						final: true,
						endNicely: true
					}
				]
			}
		]
	}

	sp.classPriorityConf = {
		name: "Scheduling class priority",
		description: "Demonstrates how higher priority classes have absolute priority ower lower ones. Processes of\
			higher priority class can preempt the ones of lower class at any time. Priority of classes in this example\
			is:\n\
			FCFSClass > RoundClass",
		simLen: "200",
		timerTickLen: "10",
		classPrio: ["FCFSClass", "RoundClass"],

		classParams: {
			RoundClass: {
				timeSlice: 10,
			},
		},

		processes: [
			{
				pname: "A",
				spawn: [0, 30],
				policy: "FCFSClass",
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 5
					},
				],
			},
			{
				pname: "B",
				spawn: [0, 30],
				policy: "RoundClass",
				behavior: [
					{
						priority: 0,
						run: 30,
						block: 10
					},
				]
			},
			{
				pname: "C",
				spawn: [30, 40],
				policy: "RoundClass",
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 5
					},
					{
						procExec: 8,
						final: true,
						endNicely: true
					}
				],
			},
		],
	}

	sp.classPriorityCascadeConf = {
		name: "Scheduling class priority cascade",
		description: "Demonstrates how higher priority classes have absolute priority ower lower ones. Processes of\
			higher priority classes can preempt lower ones at any time. Priority of classes in this example is:\n\
			FCFSClass > RoundClass > SJFClass > LinuxOriginalClass",
		simLen: 50,
		timerTickLen: 5,
		classPrio: ["FCFSClass", "RoundClass", "SJFClass", "LinuxOriginalClass"],

		processes: [
			{
				pname: "Process A",
				spawn: 0,
				policy: "LinuxOriginalClass",
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 12
					}
				]
			},
			{
				pname: "Process B",
				spawn: 1,
				policy: "SJFClass",
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 12
					}
				]
			},
			{
				pname: "Process C",
				spawn: 2,
				policy: "RoundClass",
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 12
					}
				]
			},
			{
				pname: "Process D",
				spawn: 3,
				policy: "FCFSClass",
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 12
					}
				]
			}
		]
	}

	sp.randomConf = {
		name: "Random configuration",
		description: "A mostly random configuration. Each run should be different from the last. Uses RoundClass, with\
		a round robin scheduling policy, where the length of a process time slice is set to 5.",
		simLen: 200,
		timerTickLen: 2,
		policy: "RoundClass",

		classParams: {
			"RoundClass": {
				"timeSlice": 5
			}
		},

		processes: [
			{
				pname: "Process A",
				spawn: [0, 100],
				behavior: [
					{
						priority: 0,
						run: [1,100],
						block: [1,100]
					}
				]
			},
			{
				pname: "Process B",
				spawn: [0, 100],
				behavior: [
					{
						priority: 0,
						run: [1,100],
						block: [1,100]
					}
				]
			},
			{
				pname: "Process C",
				spawn: [0, 100],
				behavior: [
					{
						priority: 0,
						run: [1,100],
						block: [1,100]
					}
				]
			},
		]
	}

	sp.randomConf2 = {
		name: "Random configuration, 2 classes",
		description: "A mostly random configuration. Each run should be different from the last. Uses two scheduling\
		classes, in the following order:\n\n\
		- FCFSClass, with a first come, first served scheduling policy,\n\
		- RoundClass, with a round robin scheduling policy, where the length of a process time slice is set to 5.",
		simLen: 400,
		timerTickLen: 2,


		classParams: {
			"RoundClass": {
				"timeSlice": 5
			}
		},

		processes: [
			{
				pname: "Process A",
				spawn: [0, 300],
				policy: "FCFSClass",
				behavior: [
					{
						priority: 0,
						run: [1,100],
						block: [1,100]
					}
				]
			},
			{
				pname: "Process B",
				spawn: [0, 300],
				policy: "FCFSClass",
				behavior: [
					{
						priority: 0,
						run: [1,100],
						block: [1,100]
					}
				]
			},
			{
				pname: "Process C",
				spawn: [0, 300],
				policy: "RoundClass",
				behavior: [
					{
						priority: 0,
						run: [1,100],
						block: [1,100]
					}
				]
			},
			{
				pname: "Process D",
				spawn: [0, 300],
				policy: "RoundClass",
				behavior: [
					{
						priority: 0,
						run: [1,100],
						block: [1,100]
					}
				]
			},
		]
	}

	sp.mixedBehConf = {
		name: "Mixed behavior changes",
		description: "A preset with Round Robin scheduling policy that contains a few behavior changes. It also\
		includes processes that exit, some randomness and definitions that use suffixes and decimal numbers. Note that\
		time values without suffixes are interpreted as nanoseconds.",
		simLen: "0,03ms",
		timerTickLen: "0.100us",
		policy: "RoundClass",

		processes: [
			{
				pname: "Process A",
				spawn: [200, 400],
				behavior: [
					{
						priority: 0,
						run: ["2us", "3us"],
						block: ["50ns", "100ns"]
					},
					{
						procExec: "0,01ms",
						run: [10, 20]
					},
					{
						procExec: "3us",
						final: true,
						endNicely: false
					}
				]

			},
			{
				pname: "Process B",
				spawn: ["0.7us", "0.8us"],
				behavior: [
					{
						priority: 0,
						run: [20, 30],
						block: [50, 100]
					},
					{
						simExec: ["5us", "10us"],
						block: [200, 300]
					},
					{
						simExec: "0,015ms",
						final: true,
						endNicely: true
					}
				]

			},
			{
				pname: "Process C",
				spawn: [700, 800],
				behavior: [
					{
						priority: 0,
						run: [20, 30],
						block: [20, 30]
					},
					{
						execCnt: 5,
						run: ["1us", "2us"],
						block: [10, 20]
					},
					{
						execCnt: [10,50],
						final: true,
						endNicely: true
					}
				]
			}
		],
	}

	sp.suffixConf = {
		name: "Suffixes and custom fields",
		description: "This preset mostly demonstrates different types of time suffixes that can be used in simulation\
		definitions, both for simulation settings and processes. Note also the \"custom\" field on the process. \
		Whatever key:value pair gets added to it will be added to the final process and acessible as \"Process.key\"\
		during the simulation. In our case, for process A, \"A.foo\" equals \"bar\" and \"A.answer\" equals 42, which\
		can be checked in simulation results. The custom fields can be useful when making custom scheduling policies\
		that want to add more info to their process definitions.",
		simLen: "1,2 min",
		timerTickLen: "2ms",
		policy: "RoundClass",

		classParams: {
			RoundClass: {
				timeSlice: 10000000, //10ms
			},
		},

		processes: [
			{
				pname: "A",
				spawn: ["20000 microseconds", "40 milliseconds"],
				behavior: [
					{
						priority: 0,
						run: "1,1s",
						block: "0.200 s"
					},
					{
						simExec: "0.5 minute",
						run: "500000us"
					},
					{
						simExec: "1min",
						final: true,
						endNicely: false
					}
				],
				custom: {
					foo: "bar",
					answer: 42
				}
			},
		],
	}

	sp.simpleSystemConf = {
		name: "Simple system example",
		description: "This preset serves as an example of a simple computing system. You can think of it as a\
		simplified scenario of scheduling in a real Linux system. It contains 2 system processes with higher priority,\
		run by round robin class, 2 user processes that are run by the fair class and a batch process, run by\
		first-come-first-served class that's been given the lowest priority. Note how both system tasks take absolute\
		priority over others and how the very low priority batch job only gets to execute when nothing else is ready to\
		run.",
		simLen: "15ms",
		timerTickLen: "0.5ms",
		policy: "LinuxFairClass",
		classPrio: ["RoundClass", "LinuxFairClass", "FCFSClass"],

		classParams: {
			"RoundClass": {
				"timeSlice": "0.6ms"
			},
			"LinuxFairClass": {
				"timeScale": "1ms"
			}
		},

		processes: [
			{
				pname: "System Task 1",
				spawn: "3ms",
				policy: "RoundClass",
				behavior: [
					{
						priority: 0,
						run: "2ms",
						block: "10ms"
					},
					{
						simExec: "8ms",
						final: true,
						endNicely: false
					}
				]
			},
			{
				pname: "System Task 2",
				spawn: "3,3ms",
				policy: "RoundClass",
				behavior: [
					{
						priority: 0,
						run: "2ms",
						block: "7ms"
					}
				]
			},
			{
				pname: "User Process 1",
				spawn: "0",
				policy: "LinuxFairClass",
				behavior: [
					{
						priority: 0,
						run: "0.5ms",
						block: "1ms"
					},
					{
						simExec: "6ms",
						run: ["2ms","4ms"],
						block: ["2ms","3ms"]
					}
				]
			},
			{
				pname: "User Process 2",
				spawn: "0",
				behavior: [
					{
						priority: 2,
						run: "0.5ms",
						block: "1ms"
					},
					{
						execCnt: 4,
						run: ["4ms","6ms"],
						block: ["5ms","10ms"]
					}
				]
			},
			{
				pname: "Batch Job",
				spawn: "0",
				policy: "FCFSClass",
				behavior: [
					{
						priority: 0,
						run: ["50ms","100ms"],
						block: "5ms"
					}
				]
			}
		]
	}

	sp.fcfsClassPreset0 = {
		name: "First Come First Served: basic",
		description: "Demonstrates how three processes with different runtimes get scheduled under the \"First Come\
		First Served\" scheduling policy. The processes run as long as they wish as nothing ever gets preempted. The\
		process that gets enququed first gets picked first too.",
		simLen: "100",
		timerTickLen: "20",
		policy: "FCFSClass",

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 1
					}
				]
			},
			{
				pname: "B",
				spawn: 2,
				behavior: [
					{
						priority: 0,
						run: 10,
						block: 2
					}
				]
			},
			{
				pname: "C",
				spawn: 4,
				behavior: [
					{
						priority: 0,
						run: 7,
						block: 3
					}
				]
			},
		],
	}

	sp.fcfsClassPreset1 = {
		name: "First Come First Served: interactivity and load",
		description: "Demonstrates how an interactive process gets scheduled among 3 batch processes under the \"First\
		Come First Served\" scheduling policy. Because this policy never preempts anything, the interactive process\
		ends up waiting for the batch processes to finish, giving it long wait times and terrible performance.",
		simLen: "200",
		timerTickLen: "20",
		policy: "FCFSClass",

		processes: [
			{
				pname: "Interactive",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 20
					}
				]
			},
			{
				pname: "Batch 1",
				spawn: 2,
				behavior: [
					{
						priority: 0,
						run: 20,
						block: 3
					}
				]
			},
			{
				pname: "Batch 2",
				spawn: 4,
				behavior: [
					{
						priority: 0,
						run: 20,
						block: 3
					}
				]
			},
			{
				pname: "Batch 3",
				spawn: 6,
				behavior: [
					{
						priority: 0,
						run: 20,
						block: 3
					}
				]
			},
		],
	}

	sp.fcfsClassPreset2 = {
		name: "First Come First Served: processor hog",
		description: "Demonstrates how 3 interactive processes get scheduled alongside one processor-intensive batch\
		processe under the \"First Come First Served\" scheduling policy. Because this policy never preempts anything,\
		the interactive processes end up waiting for the batch process to finish, giving them all long wait times and\
		terrible performance.",
		simLen: "200",
		timerTickLen: "20",
		policy: "FCFSClass",

		processes: [
			{
				pname: "Interactive 1",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 10
					}
				]
			},
			{
				pname: "Interactive 2",
				spawn: 2,
				behavior: [
					{
						priority: 0,
						run: 3,
						block: 15
					}
				]
			},
			{
				pname: "Interactive 3",
				spawn: 4,
				behavior: [
					{
						priority: 0,
						run: 2,
						block: 17
					}
				]
			},
			{
				pname: "Processor Hog",
				spawn: 6,
				behavior: [
					{
						priority: 0,
						run: 60,
						block: 4
					}
				]
			}
		],
	}

	sp.fcfsClassPreset3 = {
		name: "First Come First Served: processor hog random",
		description: "Demonstrates how 3 interactive processes get scheduled alongside one processor-intensive batch\
		processe under the \"First Come First Served\" scheduling policy. Because this policy never preempts anything,\
		the interactive processes end up waiting for the batch process to finish, giving them all long wait times and\
		terrible performance. This preset has process values set with intervals, which makes them behave more erraticly\
		and makes the preset suitable for analysis via multiple runs.",
		simLen: "10us",
		timerTickLen: "20",
		policy: "FCFSClass",

		processes: [
			{
				pname: "Interactive 1",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [1,6],
						block: [10,30]
					}
				]
			},
			{
				pname: "Interactive 2",
				spawn: 2,
				behavior: [
					{
						priority: 0,
						run: [1,6],
						block: [10,30],
					}
				]
			},
			{
				pname: "Interactive 3",
				spawn: 4,
				behavior: [
					{
						priority: 0,
						run: [1,6],
						block: [10,30]
					}
				]
			},
			{
				pname: "Processor Hog",
				spawn: 6,
				behavior: [
					{
						priority: 0,
						run: [30,100],
						block: [4,20]
					}
				]
			}
		],
	}

	sp.roundClassPreset0 = {
		name: "Round Robin: basic",
		description: "Demonstrates how three equal processes get scheduled under the \"Round Robin\" scheduling policy.\
		Note the 5 ns timeslices in RoundClass settings and their effects on processes.",
		simLen: "100",
		timerTickLen: "5",
		policy: "RoundClass",

		classParams: {
			RoundClass: {
				timeSlice: 5
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 20,
						block: 10
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 20,
						block: 10
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 20,
						block: 10
					},
				],
			},
		],
	}

	sp.roundClassPreset1 = {
		name: "Round Robin: burst difference",
		description: "Demonstrates how three processes with different runtimes get scheduled under the \"Round Robin\"\
		scheduling policy. Note the 6 ns timeslices in RoundClass settings and their effects on processes that run\
		shorter or longer than that.",
		simLen: "100",
		timerTickLen: "2",
		policy: "RoundClass",

		classParams: {
			RoundClass: {
				timeSlice: 6
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 4,
						block: 10
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 8,
						block: 10
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 12,
						block: 10
					},
				],
			},
		],
	}

	sp.roundClassPreset2 = {
		name: "Round Robin: interactivity and load",
		description: "Demonstrates how an interactive process gets scheduled among 3 batch processes under the \"Round\
		Robin\" scheduling policy. The preemption does make sure that all processes run often enough, but the algorithm\
		pays no attention to timeslice use or previous running time amassed, making the interactive process wait a\
		relatively long time, despite running rarely and finishing quickly.",
		simLen: "100",
		timerTickLen: "2",
		policy: "RoundClass",

		classParams: {
			RoundClass: {
				timeSlice: 5
			}
		},

		processes: [
			{
				pname: "Interactive",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 3,
						block: 20
					},
				],
			},
			{
				pname: "Batch 1",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 30,
						block: 3
					},
				],
			},
			{
				pname: "Batch 2",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 30,
						block: 3
					},
				],
			},
			{
				pname: "Batch 3",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 30,
						block: 3
					},
				],
			},
		],
	}

	sp.roundClassPreset3 = {
		name: "Round Robin: interactivity and load random",
		description: "Demonstrates how an interactive process gets scheduled among 3 batch processes under the \"Round\
		Robin\" scheduling policy. The preemption does make sure that all processes run often enough, but the algorithm\
		pays no attention to timeslice use or previous running time amassed, making the interactive process wait a\
		relatively long time, despite running rarely and finishing quickly. This preset has process values set with\
		intervals, which makes them behave more erraticly and makes the preset suitable for analysis via multiple\
		runs.",
		simLen: "10us",
		timerTickLen: "2",
		policy: "RoundClass",

		classParams: {
			RoundClass: {
				timeSlice: 5
			}
		},

		processes: [
			{
				pname: "Interactive",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [1, 5],
						block: [20,50]
					},
				],
			},
			{
				pname: "Batch 1",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [30,100],
						block: [5,20]
					},
				],
			},
			{
				pname: "Batch 2",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [30,100],
						block: [5,20]
					},
				],
			},
			{
				pname: "Batch 3",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [30,100],
						block: [5,20]
					},
				],
			},
		],
	}

	sp.sjfClassPreset0 = {
		name: "Shortest Job First: burst difference",
		description: "Demonstrates how three processes with different runtimes get scheduled under the \"Shortest Job\
			First\" policy with full information. Note that the scheduler is \"cheating\" here, as it always knows\
			exactly how long a process still wishes to run for - that is usually not the case in a real system.",
		simLen: "200",
		timerTickLen: "5",
		classPrio: ["SJFClass"],
		policy: "SJFClass",

		classParams: {
			SJFClass: {
				earlyPreemption: false
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 10
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 10,
						block: 10
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 20,
						block: 10
					},
				],
			},
		],
	}

	sp.sjfClassPreset1 = {
		name: "Shortest Job First: burst difference random",
		description: "Demonstrates how three processes with different runtimes get scheduled under the \"Shortest Job\
			First\" policy with full information. Note that the scheduler is \"cheating\" here, as it always knows\
			exactly how long a process still wishes to run for - that is usually not the case in a real system. This\
			preset has process values set with intervals, which makes them behave more erraticly and makes the preset\
			suitable for analysis via multiple runs.",
		simLen: "200",
		timerTickLen: "5",
		classPrio: ["SJFClass"],
		policy: "SJFClass",

		classParams: {
			SJFClass: {
				earlyPreemption: false
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [1,8],
						block: [5,15]
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [7,16],
						block: [5,15]
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [16,24],
						block: [5,15]
					},
				],
			},
		],
	}

	sp.sjfClassPreset2 = {
		name: "Shortest Job First: starvation",
		description: "Demonstrates a danger of \"Shortest Job First\" algorithm - when many short jobs are running on\
		a system it can happen that a longer job will never get selected at all, causing starvation.",
		simLen: "200",
		timerTickLen: "5",
		classPrio: ["SJFClass"],
		policy: "SJFClass",

		classParams: {
			SJFClass: {
				earlyPreemption: false
			}
		},

		processes: [
			{
				pname: "ShortA",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 12
					},
				],
			},
			{
				pname: "ShortB",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 12
					},
				],
			},
			{
				pname: "ShortC",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 12
					},
				],
			},
			{
				pname: "ShortD",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 12
					},
				],
			},
			{
				pname: "Long",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 10,
						block: 5
					},
				],
			},
		],
	}

	sp.sjfClassPreset3 = {
		name: "Shortest Remaining Time First: burst difference",
		description: "Demonstrates how three processes with different runtimes get scheduled under the \"Shortest\
			Remaining Time First\" policy with full information, which is the preemptive version of the \"Shortest Job\
			First\" algorithm. Note that the scheduler is \"cheating\" here, as it always knows exactly how long a\
			process still wishes to run for - that is usually not the case in a real system.",
		simLen: "200",
		timerTickLen: "5",
		classPrio: ["SJFClass"],
		policy: "SJFClass",

		classParams: {
			SJFClass: {
				earlyPreemption: true
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 10
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 10,
						block: 10
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 20,
						block: 10
					},
				],
			},
		],
	}



	sp.sjfClassPreset4 = {
		name: "Shortest Remaining Time First: burst difference random",
		description: "Demonstrates how three processes with different runtimes get scheduled under the \"Shortest\
			Remaining Time First\" policy with full information, which is the preemptive version of the \"Shortest Job\
			First\" algorithm. Note that the scheduler is \"cheating\" here, as it always knows exactly how long a\
			process still wishes to run for - that is usually not the case in a real system. This preset has process\
			values set with intervals, which makes them behave more erraticly and makes the preset suitable for\
			analysis via multiple runs.",
		simLen: "10us",
		timerTickLen: "5",
		classPrio: ["SJFClass"],
		policy: "SJFClass",

		classParams: {
			SJFClass: {
				earlyPreemption: true
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [1,8],
						block: [5,15]
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [7,16],
						block: [5,15]
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [16,24],
						block: [5,15]
					},
				],
			},
		],
	}



	sp.sjfClassPreset5 = {
		name: "Shortest Remaining Time First: interactivity and load",
		description: "Demonstrates a strength of \"Shortest Remaining Time First\" algorithm - short processes will get\
		execution priority among other processes, which ensures low latency for them. Since ineractive processes are\
		usually short, this works out well for them, but the difficulty of predicting remaining execution time in a\
		real system limits the usability of this algorithm. Notice also the starvation of the longest execution time\
		process, \"LongC\".",
		simLen: "200",
		timerTickLen: "5",
		classPrio: ["SJFClass"],
		policy: "SJFClass",

		classParams: {
			SJFClass: {
				earlyPreemption: true
			}
		},

		processes: [
			{
				pname: "Short",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 5,
						block: 10
					},
				],
			},
			{
				pname: "LongA",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 30,
						block: 10
					},
				],
			},
			{
				pname: "LongB",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 35,
						block: 10
					},
				],
			},
			{
				pname: "LongC",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 40,
						block: 10
					},
				],
			},
		],
	}

	sp.linuxOriginalPreset0 = {
		name: "Linux original scheduler: priority difference",
		description: "Demonstrates how three equal processes get scheduled in the original Linux scheduler when given\
			different priority.",
		simLen: "200",
		timerTickLen: "5",
		classPrio: ["LinuxOriginalClass"],
		policy: "LinuxOriginalClass",

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 21,
						run: 30,
						block: 5
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 12,
						run: 30,
						block: 5
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 3,
						run: 30,
						block: 5
					},
				],
			},
		],
	}

	sp.linuxOriginalPreset1 = {
		name: "Linux original scheduler: priority difference random",
		description: "Demonstrates how three equal processes get scheduled in the original Linux scheduler when given\
			different priority. The processes behave more erraticly here, as their run and block values are set with\
			intervals, which makes this preset suitable for analysis via multiple runs.",
		simLen: "200",
		timerTickLen: "5",
		classPrio: ["LinuxOriginalClass"],
		policy: "LinuxOriginalClass",

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 21,
						run: [10, 60],
						block: [1, 15]
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 12,
						run: [10, 60],
						block: [1, 15]
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 3,
						run: [10, 60],
						block: [1, 15]
					},
				],
			},
		],
	}

	sp.linuxOriginalPreset2 = {
		name: "Linux original scheduler: priority change",
		description: "Demonstrates how three equal processes get scheduled in the original Linux scheduler when given\
			different priority. In addition to that, process \"A\" changes its priority midway through the simulation\
			to a higher one.",
		simLen: "200",
		timerTickLen: "3",
		classPrio: ["LinuxOriginalClass"],
		policy: "LinuxOriginalClass",

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 3,
						run: 30,
						block: 5
					},
					{
						simExec: 100,
						priority: 30,
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 30,
						block: 5
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 15,
						run: 30,
						block: 5
					},
				],
			},
		],
	}

	sp.linuxOriginalPreset3 = {
		name: "Linux original scheduler: interactivity and load",
		description: "Demonstrates how an interactive process (with short bursts of activity and long block\
			times), behaves when scheduled alongside 3 batch processes of lower priority in the original Linux\
			scheduler.",
		simLen: "200",
		timerTickLen: "5",
		classPrio: ["LinuxOriginalClass"],
		policy: "LinuxOriginalClass",

		processes: [
			{
				pname: "Interactive",
				spawn: 0,
				behavior: [
					{
						priority: 40,
						run: 3,
						block: 50
					},
				],
			},
			{
				pname: "Load 1",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 100,
						block: 5
					},
				],
			},
			{
				pname: "Load 2",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 100,
						block: 5
					},
				],
			},
			{
				pname: "Load 3",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 100,
						block: 5
					},
				],
			},
		],
	}

	sp.linuxOnPreset0 = {
		name: "Linux O(n) scheduler: priority difference",
		description: "Demonstrates how three equal processes get scheduled in Linux O(n) scheduler when given different\
			priority.",
		simLen: "1000",
		timerTickLen: "5",
		classPrio: ["LinuxOnClass"],
		policy: "LinuxOnClass",

		classParams: {
			LinuxOnClass: {
				timeScale: 1
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: -20,
						run: 100,
						block: 20
					}
				]
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 100,
						block: 20
					}
				]
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 100,
						block: 20
					}
				]
			}
		],
	}

	sp.linuxOnPreset1 = {
		name: "Linux O(n) scheduler: priority difference random",
		description: "Demonstrates how three equal processes get scheduled in Linux O(n) scheduler when given different\
			priority. The processes behave more erraticly here, as their run and block values are set with intervals,\
			which makes this preset suitable for analysis via multiple runs.",
		simLen: "1000",
		timerTickLen: "5",
		classPrio: ["LinuxOnClass"],
		policy: "LinuxOnClass",

		classParams: {
			LinuxOnClass: {
				timeScale: 1
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: -20,
						run: [20, 300],
						block: [10, 100]
					}
				]
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: [20, 300],
						block: [10, 100]
					}
				]
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: [20, 300],
						block: [10, 100]
					}
				]
			}
		],
	}

	sp.linuxOnPreset2 = {
		name: "Linux O(n) scheduler: priority change",
		description: "Demonstrates how three equal processes get scheduled in the Linux O(n) scheduler when given\
			different priority. In addition to that, process \"A\" changes its priority midway through the simulation\
			to a higher one.",
		simLen: "1000",
		timerTickLen: "5",
		classPrio: ["LinuxOnClass"],
		policy: "LinuxOnClass",

		classParams: {
			LinuxOnClass: {
				timeScale: 1
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 100,
						block: 20
					},
					{
						simExec: 500,
						priority: -20,
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: 100,
						block: 20
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: -10,
						run: 100,
						block: 20
					},
				],
			},
		],
	}

	sp.linuxOnPreset3 = {
		name: "Linux O(n) scheduler: interactivity and load",
		description: "Demonstrates how an interactive process (with short bursts of activity and long block\
			times), behaves when scheduled alongside 3 batch processes of lower priority in the Linux O(n)\
			scheduler.",
		simLen: "1000",
		timerTickLen: "7",
		classPrio: ["LinuxOnClass"],
		policy: "LinuxOnClass",

		classParams: {
			LinuxOnClass: {
				timeScale: 1
			}
		},

		processes: [
			{
				pname: "Interactive",
				spawn: 0,
				behavior: [
					{
						priority: -20,
						run: 10,
						block: 100
					},
				],
			},
			{
				pname: "Load 1",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 200,
						block: 5
					},
				],
			},
			{
				pname: "Load 2",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 200,
						block: 5
					},
				],
			},
			{
				pname: "Load 3",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 200,
						block: 5
					},
				],
			},
		],
	}

	sp.linuxO1Preset0 = {
		name: "Linux O(1) scheduler: priority difference",
		description: "Demonstrates how three equal processes get scheduled in Linux O(1) scheduler when given different\
			priority.",
		simLen: "1000",
		timerTickLen: "5",
		classPrio: ["LinuxO1Class"],
		policy: "LinuxO1Class",

		classParams: {
			LinuxO1Class: {
				timeScale: 1
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 14,
						run: 100,
						block: 20
					}
				]
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 17,
						run: 100,
						block: 20
					}
				]
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 19,
						run: 100,
						block: 20
					}
				]
			}
		],
	}

	sp.linuxO1Preset1 = {
		name: "Linux O(1) scheduler: priority difference random",
		description: "Demonstrates how three equal processes get scheduled in Linux O(1) scheduler when given different\
			priority. The processes behave more erraticly here, as their run and block values are set with intervals,\
			which makes this preset suitable for analysis via multiple runs.",
		simLen: "1000",
		timerTickLen: "5",
		classPrio: ["LinuxO1Class"],
		policy: "LinuxO1Class",

		classParams: {
			LinuxOnClass: {
				timeScale: 1
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 14,
						run: [20, 300],
						block: [10, 100]
					}
				]
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 17,
						run: [20, 300],
						block: [10, 100]
					}
				]
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 19,
						run: [20, 300],
						block: [10, 100]
					}
				]
			}
		],
	}

	sp.linuxO1Preset2 = {
		name: "Linux O(1) scheduler: priority change",
		description: "Demonstrates how three equal processes get scheduled in the Linux O(1) scheduler when given\
			different priority. In addition to that, process \"A\" changes its priority midway through the simulation\
			to a higher one.",
		simLen: "1000",
		timerTickLen: "5",
		classPrio: ["LinuxO1Class"],
		policy: "LinuxO1Class",

		classParams: {
			LinuxOnClass: {
				timeScale: 1
			}
		},

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: 19,
						run: 100,
						block: 20
					},
					{
						simExec: 500,
						priority: 10,
					},
				],
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 16,
						run: 100,
						block: 20
					},
				],
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 18,
						run: 100,
						block: 20
					},
				],
			},
		],
	}

	sp.linuxO1Preset3 = {
		name: "Linux O(1) scheduler: interactivity and load",
		description: "Demonstrates how an interactive process (with short bursts of activity and long block\
			times), behaves when scheduled alongside 3 batch processes of lower priority in the Linux O(1)\
			scheduler.",
		simLen: "1000",
		timerTickLen: "7",
		classPrio: ["LinuxO1Class"],
		policy: "LinuxO1Class",

		classParams: {
			LinuxOnClass: {
				timeScale: 1
			}
		},

		processes: [
			{
				pname: "Interactive",
				spawn: 0,
				behavior: [
					{
						priority: 10,
						run: 10,
						block: 100
					},
				],
			},
			{
				pname: "Load 1",
				spawn: 0,
				behavior: [
					{
						priority: 16,
						run: 200,
						block: 5
					},
				],
			},
			{
				pname: "Load 2",
				spawn: 0,
				behavior: [
					{
						priority: 16,
						run: 200,
						block: 5
					},
				],
			},
			{
				pname: "Load 3",
				spawn: 0,
				behavior: [
					{
						priority: 16,
						run: 200,
						block: 5
					},
				],
			},
		],
	}

	sp.linuxFairPreset0 = {
		name: "Linux fair scheduler: priority difference",
		description: "Demonstrates how four equal processes get scheduled in Linux fair scheduler when given different\
			priority. Notice how the difference between the runtimes of A and B is similar to the difference between\
			the runtimes of C and D, even though the latter pair has much lower absolute priority. This demonstrates\
			how the fair scheduling policy handles priorities dynamically and keeps the processes that have the same\
			difference in priority at about the same difference in percent of runtime, regardless of their absolute\
			priority.",
		simLen: "1s",
		timerTickLen: "0.5ms",
		classPrio: ["LinuxFairClass"],
		policy: "LinuxFairClass",

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: -1,
						run: "40ms",
						block: "1ms"
					}
				]
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "40ms",
						block: "1ms"
					}
				]
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 5,
						run: "40ms",
						block: "1ms"
					}
				]
			},
			{
				pname: "D",
				spawn: 0,
				behavior: [
					{
						priority: 6,
						run: "40ms",
						block: "1ms"
					}
				]
			}
		],
	}

	sp.linuxFairPreset1 = {
		name: "Linux fair scheduler: priority difference random",
		description: "Demonstrates how four equal processes get scheduled in Linux fair scheduler when given different\
			priority. Notice how the difference between the runtimes of A and B is similar to the difference between\
			the runtimes of C and D, even though the latter pair has much lower absolute priority. This demonstrates\
			how the fair scheduling policy handles priorities dynamically and keeps the processes that have the same\
			difference in priority at about the same difference in percent of runtime, regardless of their absolute\
			priority. The processes behave more erraticly here, as their run and block values are set with intervals,\
			which makes this preset suitable for analysis via multiple runs.",
		simLen: "1s",
		timerTickLen: "0.5ms",
		classPrio: ["LinuxFairClass"],
		policy: "LinuxFairClass",

		processes: [
			{
				pname: "A",
				spawn: [0, "0.2s"],
				behavior: [
					{
						priority: -1,
						run: ["20ms","50ms"],
						block: ["1ms","10ms"]
					}
				]
			},
			{
				pname: "B",
				spawn: [0, "0.2s"],
				behavior: [
					{
						priority: 0,
						run: ["20ms","50ms"],
						block: ["1ms","10ms"]
					}
				]
			},
			{
				pname: "C",
				spawn: [0, "0.2s"],
				behavior: [
					{
						priority: 5,
						run: ["20ms","50ms"],
						block: ["1ms","10ms"]
					}
				]
			},
			{
				pname: "D",
				spawn: [0, "0.2s"],
				behavior: [
					{
						priority: 6,
						run: ["20ms","50ms"],
						block: ["1ms","10ms"]
					}
				]
			}
		],
	}

	sp.linuxFairPreset2 = {
		name: "Linux fair scheduler: priority change",
		description: "Demonstrates how four equal processes get scheduled in Linux fair scheduler when given different\
			priority. In addition to that, process \"A\" changes its priority midway through the simulation\
			to a higher one.",
		simLen: "1s",
		timerTickLen: "0.5ms",
		classPrio: ["LinuxFairClass"],
		policy: "LinuxFairClass",

		processes: [
			{
				pname: "A",
				spawn: 0,
				behavior: [
					{
						priority: -1,
						run: "40ms",
						block: "1ms"
					}
				]
			},
			{
				pname: "B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "40ms",
						block: "1ms"
					}
				]
			},
			{
				pname: "C",
				spawn: 0,
				behavior: [
					{
						priority: 5,
						run: "40ms",
						block: "1ms"
					}
				]
			},
			{
				pname: "D",
				spawn: 0,
				behavior: [
					{
						priority: 6,
						run: "40ms",
						block: "1ms"
					},
					{
						simExec: "0.5s",
						priority: -4
					}
				]
			}
		],
	}

	sp.linuxFairPreset3 = {
		name: "Linux fair scheduler: interactivity and load",
		description: "Demonstrates how an interactive process (with short bursts of activity and long block times)\
		behaves when scheduled alongside 3 batch processes of same priority in the Linux fair scheduler. This example\
		demonstrates how the fair scheduler can keep the interactive process waiting time low, even when the system\
		is under heavy load. What's more, even if we decrease the priority of the interactive process for a few levels\
		(say to nice 5), because of its short execution times, it will still keep lower latency.",
		simLen: "1s",
		timerTickLen: "0.5ms",
		classPrio: ["LinuxFairClass"],
		policy: "LinuxFairClass",

		processes: [
			{
				pname: "Interactive",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "4ms",
						block: "30ms"
					}
				]
			},
			{
				pname: "Load 1",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "100ms",
						block: "1ms"
					}
				]
			},
			{
				pname: "Load 2",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "100ms",
						block: "1ms"
					}
				]
			},
			{
				pname: "Load 3",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "100ms",
						block: "1ms"
					}
				]
			}
		],
	}

	sp.rlPreset0 = {
		name: "RLClass: basic",
		description: "A basic setup to try with our experimental reinforcement learning scheduling class. Note that\
			this scheduling class is only included as a curiosity - it is not complete, and results show it.",
		simLen: "0,3ms",
		timerTickLen: 100,
		policy: "RLClass",

		classParams: {
			RLClass: {
				alpha: 0.35,
				gamma: 0.85
			}
		},

		processes: [
			{
				pname: "A",
				spawn: [200, 400],
				behavior: [
					{
						priority: 0,
						run: [2000, 3000],
						block: [50, 100]
					},
					{
						procExec: 10000,
						run: [10, 20]
					}
				]

			},
			{
				pname: "B",
				spawn: [700, 800],
				behavior: [
					{
						priority: 0,
						run: [20, 30],
						block: [50, 100]
					},
					{
						simExec: 5000,
						block: [200, 300]
					}
				]

			},
			{
				pname: "C",
				spawn: [700, 800],
				behavior: [
					{
						priority: 0,
						run: [20, 30],
						block: [20, 30]
					},
					{
						execCnt: 500,
						run: [1000, 2000],
						block: [10, 20]
					}
				]
			}
		],
	}

	sp.rlPreset1 = {
		name: "RLClass: interactivity and load",
		description: "Simulates the behavior of an interactive process when scheduled among multiple batch processes\
			under our experimental reinforcement learning scheduling class. Note that this scheduling class is only\
			included as a curiosity - it is not complete, and results show it.",
		simLen: "1min",
		timerTickLen: "3ms",
		policy: "RLClass",

		classParams: {
			RLClass: {
				alpha: 0.3,
				gamma: 0.9,
				timeSlice: 10000000,
				latThresholds: [70000000, 100000000]
			}
		},

		processes: [
			{
				pname: "Load A",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "1s",
						block: "1ms"
					}
				]

			},
			{
				pname: "Load B",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "1s",
						block: "1ms"
					}
				]

			},
			{
				pname: "Load C",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "1s",
						block: "1ms"
					}
				]
			},
			{
				pname: "Load D",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "1s",
						block: "1ms"
					}
				]
			},
			{
				pname: "Load E",
				spawn: 0,
				behavior: [
					{
						priority: 0,
						run: "1s",
						block: "1ms"
					}
				]
			},
			{
				pname: "Interactive",
				spawn: "1ms",
				behavior: [
					{
						priority: 0,
						run: "0.5ms",
						block: ["10ms", "50ms"]
					}
				]
			}
		],
	}

}) (SimulationPresets);
