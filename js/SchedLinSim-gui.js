$(document).ready(function() {

	// init variables
	SimGUI.changed = false;			// changes to settings made after simulation was loaded (state 1)
	SimGUI.execTimes = [1];
	SimGUI.procNames = ["idle"];
	SimGUI.tlClear = true;			// simulation running on a cleared (empty) timeline

	SimGUI.textIndent = "    ";
	SimGUI.settingsExpanded = false;
	SimGUI.settingsEnabled = true;
	SimGUI.singleResExpanded = false;
	SimGUI.multiResExpanded = false;
	SimGUI.mode = 0;					// single run	// TODO: reconsider the usefulness of this, it's currently not in use
	SimGUI.state = -1;					// before init

	SimGUI.animationStarted = false;	// animated simulation was not started
	SimGUI.animationRunning = false;	// animated simulation not currently running
	SimGUI.frameDelay = 500;			// delay between animated simulation steps

	/* ========================= input handling */
	$(document).keydown(function(e) {
		if ($("#errorModal").hasClass('show') && (e.keycode === 13 || e.which === 13)) {
			// js error modal
			$("#errorModal").modal("hide");
		} else if ($("#loadModal").hasClass('show') && (e.keycode === 13 || e.which === 13)) {
			// load modal
			SimGUI.contLoad();
		} else if ($("#graphLoadModal").hasClass('show') && (e.keycode === 13 || e.which === 13)) {
			// draw multirun graphs modal
			$("#graphLoadModal").modal("hide");
			SimGUI.drawGraphs();
		} else if ($("#presetSelectionModal").hasClass('show')) {
			let presetKeys = Object.keys(SimulationPresets);

			if (e.keycode === 35 || e.which === 35) {			// end
				SimGUI.selectPreset(presetKeys[presetKeys.length - 1]);
			} else if (e.keycode === 36 || e.which === 36) {	// home
				SimGUI.selectPreset(presetKeys[0]);
			} else if (e.keycode === 38 || e.which === 38) {	// up
				if (SimGUI.presetSelected === undefined || SimGUI.presetSelected === null) {
					SimGUI.selectPreset(presetKeys[0]);
				} else {
					let index = presetKeys.findIndex((id) => id === SimGUI.presetSelected);
					if (index - 1 >= 0) {
						SimGUI.selectPreset(presetKeys[index - 1]);
					}
				}
			} else if (e.keycode === 40 || e.which === 40) {	// down
				if (SimGUI.presetSelected === undefined || SimGUI.presetSelected === null) {
					SimGUI.selectPreset(presetKeys[0]);
				} else {
					let index = presetKeys.findIndex((id) => id === SimGUI.presetSelected);
					if (index + 1 < presetKeys.length) {
						SimGUI.selectPreset(presetKeys[index + 1]);
					}
				}
			} else if ((e.keycode === 13 || e.which === 13) &&
				SimGUI.presetSelected !== undefined && SimGUI.presetSelected !== null) {	// enter

				SimGUI.loadPresetSelection();
				$("#presetSelectionModal").modal("hide");
			}
		}
	});

	/* GUI settings */
	$("#inputSimStepTime").keydown(function(e) {
		if (e.keycode === 13 || e.which === 13) {
			SimGUI.guiSettingsCallback();
		}
	});

	// simulation name
	$("#inputSimName").keydown(function(e) {
		if (e.keycode === 13 || e.which === 13) {
			SimGUI.applySettings();
		}
	});
	$("#inputSimName").change(function() {
		SimGUI.changed = true;
		SimGUI.activeConfig.name = $("#inputSimName").val();
		SimGUI.saveLocal();
	});
	// simulation length
	$("#inputSimLen").keydown(function(e) {
		if (e.keycode === 13 || e.which === 13) {
			SimGUI.applySettings();
		}
	});
	$("#inputSimLen").change(function() {
		SimGUI.changed = true;
		SimGUI.activeConfig.simLen = $("#inputSimLen").val();
		SimGUI.saveLocal();
	});
	// timer tick length
	$("#inputTimerTickLen").keydown(function(e) {
		if (e.keycode === 13 || e.which === 13) {
			SimGUI.applySettings();
		}
	});
	$("#inputTimerTickLen").change(function() {
		SimGUI.changed = true;
		SimGUI.activeConfig.timerTickLen = $("#inputTimerTickLen").val();
		SimGUI.saveLocal();
	});
	// process definitions
	$("#processDefArea").change(function() {
		SimGUI.changed = true;
		SimGUI.activeProcesses = $("#processDefArea").val();
		SimGUI.saveLocal();
	});
	// scheduling class parameters
	$("#classParamArea").change(function() {
		SimGUI.changed = true;
	});

	// run simulation in steps
	$("#inputStep").keydown(function(e) {
		if (e.keycode === 13 || e.which === 13) {
			SimGUI.simStep($(e.target).val());
		}
	});
	$("#btnInputStep").click(function() {
		$(this).tooltip('hide');
		SimGUI.simStep($("#inputStep").val());
	});

	// run simulation until given time
	$("#inputRunTo").keydown(function(e) {
		if (e.keycode === 13 || e.which === 13) {
			SimGUI.simRunTo($(e.target).val());
		}
	});
	$("#btnInputRunTo").click(function() {
		$(this).tooltip('hide');
		SimGUI.simRunTo($("#inputRunTo").val());
	});

	// move view
	$("#inputView").keydown(function(e) {
		if (e.keycode === 13 || e.which === 13) {
			SimGUI.moveView($(e.target).val());
		}
	});
	$("#btnInputView").click(function() {
		$(this).tooltip('hide');
		SimGUI.moveView($("#inputView").val());
	});

	// multi run
	$("#inputMultiRun").keydown(function(e) {
		if (e.keycode === 13 || e.which === 13) {
			SimGUI.multiRun($("#inputMultiRun").val());
		}
	});
	$("#btnMultiRun").click(function() {
		$(this).tooltip('hide');
		SimGUI.multiRun($("#inputMultiRun").val());
	});

	/* ========================= click handling */
	$("#btnSelectSimulationPreset").click(function() {
		$(this).tooltip("hide");
		SimGUI.showPresetSelection();
	});

	$("#btnNewConfig").click(function() {
		$(this).tooltip("hide");
		SimGUI.makeNewSim();
	});

	$("#btnImportJSON").click(function() {
		$(this).tooltip("hide");
		SimGUI.importSettings();
	});

	$("#btnExportJSON").click(function() {
		$(this).tooltip("hide");
		SimGUI.exportSettings();
	});

	$("#btnResetSettings").click(function() {
		$(this).tooltip("hide");
		SimGUI.resetSettings();
	});

	// settings header button - prevent click propagation & applay settings
	$("#btnApplySettings").click(function(e){
		e.stopPropagation();
		$(this).tooltip("hide");
		SimGUI.applySettings();
	});

	// animate simulation & make sure the button uses correct icon
	$("#btnAnimateRun").click(function() {
		$(this).tooltip("hide");
		if (SimGUI.animationRunning) {
			$(this).removeClass("icon-pause");
			$(this).addClass("icon-play");
			SimGUI.animationRunning = false;
		} else {
			$(this).removeClass("icon-play");
			$(this).addClass("icon-pause");
			SimGUI.animationRunning = true;
			SimGUI.animateRun();
		}

	});

	$("#btnSimBreak").click(function() {
		$(this).tooltip("hide");
		SimGUI.simBreak();
	});

	/* ========================= dropdowns */
	// init presets dropdown
	for (let i in SimulationPresets) {
		let ident = i;
		let name = SimulationPresets[i].name;
		if (typeof(name) === "string") {
			$("#selectSimulationPreset").append("<option value="+ident+">"+name+"</option>");
		}
	}
	// init default sched class dropdown
	let schedClassList = sr("getSchedClassPrioRegistered");
	for (let i in schedClassList) {
		$("#selectDefaultClass").append("<option value="+schedClassList[i]+">"+schedClassList[i]+"</option>");
	}

	// dropdown change listeners
	$("#selectSimulationPreset").change(function() {
		if ($(this).val() !== "0") {
			SimGUI.simLoad(SimulationPresets[$(this).val()], true);
		}
	});
	$("#selectDefaultClass").change(function() {
		SimGUI.changed = true;
		if ($(this).val() !== "0") {
			SimGUI.activeConfig.policy = $(this).val();
		} else {
			delete(SimGUI.activeConfig.policy);
		}
		SimGUI.saveLocal();
	});
	$("#procIndentType").change(function(e) {
		indentAreaHandler(e, $("#processDefArea"));
		$("#classIndentType").val($(this).val());	// indent dropdowns should be set to same value
	});
	$("#classIndentType").change(function(e) {
		indentAreaHandler(e, $("#classParamArea"));
		$("#procIndentType").val($(this).val());	// indent dropdowns should be set to same value
	});
	function indentAreaHandler(e, area) {
		var dropdown = $(e.target);
		if (dropdown.val() < 0) {
			SimGUI.textIndent = "\t";
		} else {
			SimGUI.textIndent = "";
			for (let i = 0; i < dropdown.val(); i++) {
				SimGUI.textIndent += " ";
			}
		}
		SimGUI.indentTextArea(area);
		if (area !== $("#processDefArea")) {
			SimGUI.indentTextArea($("#processDefArea"));	// always indent the always-visible text area
		}
		localStorage.setItem("textIndent", SimGUI.textIndent);
		localStorage.setItem("textIndentDropdownVal", dropdown.val());
	}

	/* ========================= inits */

	// init simulation control tooltips
	$("#simulationControls").find('[data-toggle="tooltip"]').tooltip();

	// init settings header button tooltip
	$("#btnApplySettings").tooltip();

	// init disabled controls info tooltip
	$("#classesDisabledInfo").tooltip();

	// init import scheduling class popover (instead of tooltip since we have extra text here)
	$("#importSchedClass").popover();

	// init reset scheduling class parameters tooltip
	$("#btnResetClassParams").tooltip();

	// init reset process definitions tooltip
	$("#btnResetProcDef").tooltip();

	// init single run simulation tooltips
	$("#singleRunCard").find('[data-toggle="tooltip"]').tooltip();

	// multirun tooltip
	$("#btnMultiRun").tooltip();

	// text area cursor position updater
	$("#processDefArea").bind("focus keyup click", function(e) {SimGUI.cursorPosHandler(e, SimGUI.processContext)});
	$("#classParamArea").bind("focus keyup click", function(e) {SimGUI.cursorPosHandler(e, SimGUI.classContext)});

	// text area keypress handling
	$("#processDefArea").keydown(function(e) {SimGUI.textAreaKeyHandler(e, SimGUI.processContext)});
	$("#classParamArea").keydown(function(e) {SimGUI.textAreaKeyHandler(e, SimGUI.classContext)});

	// init scheduling class list
	SimGUI.classControl.reload(false);

	// check if a previously autosaved simulation configuration is available
	if (SimGUI.loadLocal()) {
		SimGUI.toggleSettings();	// expand settings
		SimGUI.enableControls();	// enable simulation controls
	} else {
		// disable settings until a simulation definition is loaded
		SimGUI.enableSettings(false);
	}

	drawTimeline();
	drawPieChart();
});


/* SimGUI: the simulator GUI namespace, holds the GUI variables so we don't litter up global namespace with them */
var SimGUI = {};
(function(sg) {
	sg.timeline;

	sg.loadedConfig;		// The configuration that has been loaded into the simulator and displayed. Used for reset.
	sg.activeConfig;		// The configuration that is currently being edited.
	sg.activeProcesses;		// A temporary place to store active process configuration before applying it.
	sg.simRes;				// simulation result object
	sg.simMultiRes;			// simulation multirun result object
	sg.execTimeChart;
	sg.execTimes;
	sg.procNames;
	sg.procColors;

	sg.state;				// simulation state, 0: before init; 1: init done; 2: running;
	sg.changed;				// simulator settings changed, warn about overwriting on new simulation load
	sg.tlClear;				// notes if the simulation is running off an empty timeline - used for timeline cleanup
	sg.animationStarted;	// notes if an animated simulation was started (basically a lock so we don't start 2)
	sg.animationRunning;	// notes if we're currently running an animated simulation (not paused) or not
	sg.frameDelay;			// delay between animated simulation steps in milliseconds

	sg.tmpLoadData;			// Temporary data storage for simLoad.
	sg.tmpLoadDoInit;		// Temporary parameter storage for simLoad.

	/* components */
	sg.textIndent;			// character to use for indenting text
	sg.settingsExpanded;	// settings card body expanded
	sg.settingsEnabled;		// settings components enabled
	sg.singleResExpanded;	// single run results card body expanded
	sg.multiResExpanded;	// multi run results card body expanded
	sg.mode;				// 0 = single, 1 = multi

	/* set simulation state and perform related GUI actions */
	sg.setState = function(state) {
		switch (state) {
		case (0):
			sg.enableSettings(true);
			if (sg.state < 0) {
				sg.enableControls();
				sg.toggleSettings(true);
			}
			sg.state = 0;
			break;
		case (1):
			sg.enableSettings(true);
			sg.toggleSettings(true);
			if (sg.state < 0) {
				sg.enableControls();
			}
			sg.state = 1;
			sg.activeProcesses = null;
			break;
		case (2):
			sg.enableSettings(false);
			sg.state = 2;
			break;
		default:
			throw new Error("invalid state: " + state);
		}
	}

	/* GUI about dialog */
	sg.aboutModal = function() {
		$('#sim-version').text(sr("getVersion"));
		$('#aboutModal').modal('show');
	}

	/* GUI settings dialog */
	sg.guiSettings = function() {
		$("#inputSimStepTime").val(sg.shorten(sg.frameDelay * 1000000, true));
		$("#guiSettingsModal").modal("show");
	}
	sg.guiSettingsCallback = function() {
		var simTime = sg.parseSuffix($("#inputSimStepTime").val(), true);
		if (typeof(simTime) === "number") {
			sg.frameDelay = simTime < 1000000 ? 1 : simTime / 1000000;
		}

		localStorage.setItem("frameDelay", sg.frameDelay);

		$("#guiSettingsModal").modal("hide");
	}

	/* component hiding */
	sg.toggleSettings = function(state) {
		if (typeof(state) !== "boolean" && !sg.settingsExpanded || state === true) {
			if (!sg.settingsExpanded) {
				$("#settingsToggle").removeClass("rot180-end");
				$("#settingsBody").slideDown("0.4s");
				sg.settingsExpanded = true;
			}
		} else if (sg.settingsExpanded) {
			$("#settingsToggle").addClass("rot180-end");
			$("#settingsBody").slideUp("0.4s");
			sg.settingsExpanded = false;
		}
	}
	sg.toggleResultsSingle = function(state) {
		if (typeof(state) !== "boolean" && !sg.singleResExpanded || state === true) {
			$("#singleResToggle").removeClass("rot180-end");
			$("#singleResBody").slideDown("0.4s");
			sg.singleResExpanded = true;
		} else  {
			$("#singleResToggle").addClass("rot180-end");
			$("#singleResBody").slideUp("0.4s");
			sg.singleResExpanded = false;
		}
	}
	sg.toggleResultsMulti = function(state) {
		if (typeof(state) !== "boolean" && !sg.multiResExpanded || state === true) {
			$("#multiResToggle").removeClass("rot180-end");
			$("#multiResBody").slideDown("0.4s");
			sg.multiResExpanded = true;
		} else  {
			$("#multiResToggle").addClass("rot180-end");
			$("#multiResBody").slideUp("0.4s");
			sg.multiResExpanded = false;
		}
	}

	/* enable or disable settings */
	sg.enableSettings = function(enable) {
		if (enable) {
			$("#settingsBody").find(".set").prop("disabled", false);
			$("#btnApplySettings").prop("disabled", false);
			sg.settingsEnabled = true;
		} else {
			$("#settingsBody").find(".set").prop("disabled", true);
			$("#btnApplySettings").prop("disabled", true);
			sg.settingsEnabled = false;
		}
	}

	/* apply settings (init simulation with them) */
	sg.applySettings = function() {
		/* Reading settings again should be unnecessary since activeConfig is kept up to date via onchange functions,
		 * but let's do it anyway, just in case. */
		sg.readSettings();

		let configString = sg.tryRun("simulation configuration contains an error", JSON.stringify, sg.activeConfig);
		let configCopy = JSON.parse(configString);

		sr("init", configCopy);
		sg.setState(1);

		sg.classControl.reload();	// update scheduling class list
	}

	/* Read settings from the GUI. Fairly unnecessasry, since settings get updated on change, but still done just to
	 * make sure nothing gets left out. */
	sg.readSettings = function() {
		if ($("#selectDefaultClass").prop('selectedIndex') !== 0) {
			sg.activeConfig.policy = $("#selectDefaultClass").val();
		} else {
			delete(sg.activeConfig.policy);
		}
		sg.activeConfig.name = $("#inputSimName").val();
		sg.activeConfig.simLen = $("#inputSimLen").val();
		sg.activeConfig.timerTickLen = $("#inputTimerTickLen").val();

		sg.activeConfig.processes = $("#processDefArea").val();

		sg.activeConfig.processes = sg.tryRun("process definitions contain a syntax error", JSON.parse,
			$("#processDefArea").val());

		sg.classPrio = sr("getSchedClassPrio");

		SimGUI.saveLocal();
	}

	/* simLoad functions as a safeguard to prevent overwriting edits. It displays a modal with a warning.
	 * contLoad continues the load action if the user agrees.
	 * endLoad actually loads the simulation. */
	sg.simLoad = function(simConfig, doInit) {
		$("#selectSimulationPreset").val(0);	// reset preset selection dropdown
		sg.tmpLoadData = simConfig;
		sg.tmpLoadDoInit = doInit;
		if (sg.changed) {
			$("#loadModal").modal('show');
		} else {
			sg.endLoad();
		}
	}
	sg.contLoad = function() {
		$("#loadModal").modal('hide');
		sg.endLoad();
	}
	sg.endLoad = function() {
		if (sg.state === 2) {
			sg.simBreak();
		}

		sg.changed = false;

		/* do init if requested */
		if (sg.tmpLoadDoInit) {
			// init with deep copy to avoid overwriting potential prefixes in SimulationPresets entry
			sr("init", JSON.parse(JSON.stringify(sg.tmpLoadData)));
			sg.setState(1);
		} else {
			sg.setState(0);
		}

		/* write settings into the GUI */
		sg.writeSettings(sg.tmpLoadData);

		/* store the new config */
		sg.loadedConfig = sg.tmpLoadData;
		var loadedConfigString = JSON.stringify(sg.tmpLoadData);
		sg.activeConfig = JSON.parse(loadedConfigString);	// deep copy for the editable version
		localStorage.setItem("loadedConfig", JSON.stringify(loadedConfigString));
		localStorage.setItem("activeConfig", JSON.stringify(sg.activeConfig));
		sg.activeProcesses = null;
	}

	sg.saveLocal = function() {
		localStorage.setItem("activeConfig", JSON.stringify(sg.activeConfig));
		if (sg.activeProcesses !== undefined && sg.activeProcesses !== null) {
			localStorage.setItem("activeProcesses", sg.activeProcesses);
		} else {
			localStorage.removeItem("activeProcesses");
		}
		localStorage.setItem("changed", sg.changed);
	}

	sg.loadLocal = function() {
		var frameDelay = localStorage.getItem("frameDelay");
		if (frameDelay !== null && frameDelay !== undefined) {
			sg.frameDelay = parseInt(frameDelay);
		}

		var indent = localStorage.getItem("textIndent");
		if (indent !== null && indent !== undefined) {
			let indentVal = localStorage.getItem("textIndentDropdownVal");
			$("#procIndentType").val(indentVal)
			$("#classIndentType").val(indentVal)
			SimGUI.textIndent = indent;
		}

		var ac = localStorage.getItem("activeConfig");
		if (ac !== null && ac !== undefined) {
			sg.activeConfig = JSON.parse(ac);
			var lc = localStorage.getItem("loadedConfig");
			sg.loadedConfig = JSON.parse(lc);

			sg.writeSettings(sg.activeConfig);

			let ap = localStorage.getItem("activeProcesses");
			if (ap !== null && ap !== undefined) {
				$("#processDefArea").val(ap);
			}

			if (localStorage.getItem("changed") === "true") {
				sg.changed = true;
			} else {
				sg.changed = false;
			}

			return true;
		}
		return false;
	}

	/* write settings to the GUI, simLoad should be called instead of this to make sure nothing gets overwritten */
	sg.writeSettings = function(simConfig) {
		// default sched class
		let schedClassName = simConfig.policy;
		if (schedClassName !== undefined && schedClassName !== null) {
			$("#selectDefaultClass").val(schedClassName);
		} else {
			$("#selectDefaultClass").prop('selectedIndex', 0);
		}
		// simulation name
		$("#inputSimName").val(simConfig.name);
		// simulation length
		$("#inputSimLen").val(simConfig.simLen);
		// timer tick length
		$("#inputTimerTickLen").val(simConfig.timerTickLen === undefined ?
			sg.shorten(sr("getDefaultTimerTickLen"), false) : simConfig.timerTickLen);
		// scheduling class list
		if (sg.state > 0) {		// update classes if we initialised simulation
			sg.classControl.reload();
		} else {				// remove activity indicators and lock them if we haven't
			$("#classTable").find(".classSet").prop("disabled", true);
			$("#classTable").find(".classAct").remove();
			$("#classesDisabledInfo").removeClass("d-none");
		}
		// process definitions
		$("#processDefArea").val(JSON.stringify(simConfig.processes, null, 2));
		// indent with chosen style
		sg.indentTextArea($("#processDefArea"), false);
	}

	/* open a modal to allow a nicer selection of a preset */
	sg.showPresetSelection = function() {
		let modal = $("#presetSelectionModal");

		modal.modal("show");
		let table = modal.find("#presetTableBody");
		table.empty();
		modal.find("#presetDescription").text("Select a preset to view its description.");

		for (let i in SimulationPresets) {
			table.append("<tr id='preset_" + i + "' onclick=SimGUI.selectPreset(\"" + i + "\")><td class='pl-2'>" +
							SimulationPresets[i].name + "</td></tr>");
		}

		sg.presetSelected = null;
	}
	sg.presetSelected;
	sg.selectPreset = function(presetID) {
		let presetDescription = $("#presetDescription");
		if (SimulationPresets[presetID].description !== undefined) {
			let descr = SimulationPresets[presetID].description;
			presetDescription.html(descr.replace(/\n/g, "<br>"));
		} else {
			presetDescription.text("No description available.");
		}

		let selected;
		if (sg.presetSelected !== undefined && sg.presetSelected !== null) {
			selected = $("#preset_" + sg.presetSelected);
			selected.removeClass("bg-secondary");
			selected.removeClass("text-light");
		}
		sg.presetSelected = presetID;
		selected = $("#preset_" + presetID);
		selected.addClass("bg-secondary");
		selected.addClass("text-light");

		/* make sure that selection is visible, matters when selecting with up/down buttons */
		var visibleRect = $("#presetTableCol")[0].getBoundingClientRect();
		var selectedRect = selected[0].getBoundingClientRect();
		if (selectedRect.top < visibleRect.top) {
			selected[0].scrollIntoView(true);
		} else if (selectedRect.bottom > visibleRect.bottom) {
			selected[0].scrollIntoView(false);
		}
	}
	sg.loadPresetSelection = function() {
		sg.simLoad(SimulationPresets[sg.presetSelected], true);
	}

	/* create a new simulation */
	sg.makeNewSim = function() {
		let newSim = {
			name: "newSimulation",
			simLen: "0.2us",
			timerTickLen: "10ns",
			policy: "FCFSClass",

			processes: [
				{
					pname: "Process",
					spawn: [0, 10],
					behavior: [
						{
							priority: 0,
							run: 10,
							block: 10
						},
						{
							simExec: "0.18us",
							final: true,
							endNicely: false
						}
					]
				},
			]
		};

		sg.simLoad(JSON.parse(JSON.stringify(newSim)), false);
		sg.classControl.reload(false);	// remove activity indicators since they're wrong before init
	}

	/* import simulation settings from JSON that the user uploads */
	sg.importSettings = function() {
		$("#inputUploadSettings").click();
	}
	sg.importSettingsCallback = function(fileList) {
		let fileReader = new FileReader();
		fileReader.onload = function() {
			$("#inputUploadSettings").val("");	// reset input so it can trigger change event on same file
			let parsedConfig = sg.tryRun("cannot parse uploaded file", JSON.parse, fileReader.result);

			sg.simLoad(parsedConfig, false);
		}
		try {
			fileReader.readAsText(fileList[0]);
		} catch(e) {
			$("#inputUploadSettings").val("");	// reset input so it can trigger change event on same file

			let finalText = "An error occured: cannot read input file</br>" + e.toString();
			$("#errorTextContainer").html(finalText);
			$("#errorModal").modal('show');
			throw(e);
		}
	}

	/* import a scheduling class from JSON that the user uploads */
	sg.importClass = function() {
		$("#inputUploadClass").click();
	}
	sg.importClassCallback = function(fileList) {
		let fileReader = new FileReader();
		fileReader.onload = function() {
			$("#inputUploadClass").val("");	// reset input so it can trigger change event on same file
			/* WARNING: we use eval() here, THAT'S NOT SAFE. It's all client side so it should be fine, but maybe warn
			 * the user. (warning done on mouseover) */
			sg.tryRun("cannot evaluate uploaded file", eval, fileReader.result);

			// reload class settings list
			sg.classControl.reload();

			// reload default sched class dropdown
			let schedClassList = sr("getSchedClassPrioRegistered");
			let defClassDropdown = $("#selectDefaultClass");
			defClassDropdown.empty();
			defClassDropdown.append("<option value=\"0\" selected>none</option>");
			for (let i in schedClassList) {
				defClassDropdown.append("<option value="+schedClassList[i]+">"+schedClassList[i]+"</option>");
			}
			if (sg.activeConfig.policy !== undefined && sg.activeConfig.policy !== null) {
				defClassDropdown.val(sg.activeConfig.policy);
			}

		}
		try {
			fileReader.readAsText(fileList[0]);
		} catch(e) {
			$("#inputUploadClass").val("");	// reset input so it can trigger change event on same file

			let finalText = "An error occured: cannot read input file</br>" + e.toString();
			$("#errorTextContainer").html(finalText);
			$("#errorModal").modal('show');
			throw(e);
		}
	}

	/* export simulation settings to JSON and download them */
	sg.exportSettings = function() {
		sg.readSettings();

		let configString = sg.tryRun("simulation configuration contains an error",
			JSON.stringify, sg.activeConfig, null, 2);

		configString = sg.jsonReshape(configString);

		downloadData($("#inputSimName").val() + ".json", configString);

		sg.changed = false;
		sg.activeProcesses = null;
	}

	/* reset simulation settings */
	sg.resetSettings = function() {
		if (sg.loadedConfig !== undefined) {
			sg.simLoad(sg.loadedConfig, false);
		}
	}

	/* reset process definitions */
	sg.resetProcDef = function() {
		if (sg.loadedConfig !== undefined) {
			$("#btnResetProcDef").tooltip("hide");
			$("#processDefArea").val(JSON.stringify((JSON.parse(sg.loadedConfig)).processes, null, 2));
			sg.indentTextArea($("#processDefArea"), false);
			sg.activeProcesses = null;
			sg.saveLocal();
		}
	}

	/* enable simulation controls */
	sg.enableControls = function() {
		$("#singleRunCard").find(".runCtrl").prop("disabled", false);
		$("#multiControls").find(".runCtrl").prop("disabled", false);
	}

	/* timeline window movement */
	sg.moveView = function(pos) {
		pos = sg.parseSuffix(pos);
		pos = pos < 0 ? 0 : pos;
		let tlWindow = sg.timeline.getWindow();
		let width = tlWindow.end.getTime() - tlWindow.start.getTime();
		let maxLen = sg.timelineOpts.max;
		let end = pos + width;
		if (end > maxLen) {
			pos = maxLen - width;
			end = maxLen;
		}
		pos = pos < 0 ? 0 : pos;

		sg.timeline.setWindow(pos, end);
	}

	/* timeline window movement */
	sg.centerView = function(pos) {
		pos = sg.parseSuffix(pos);
		pos = pos < 0 ? 0 : pos;
		let tlWindow = sg.timeline.getWindow();
		let width = tlWindow.end.getTime() - tlWindow.start.getTime();

		let maxLen = sg.timelineOpts.max;
		let start = pos - width / 2;
		let end = pos + width / 2;
		if (start < 0) {
			start = 0;
			end = width > maxLen ? maxLen : width;
		} else if (end > maxLen) {
			end = maxLen;
			start = end - width < 0 ? 0 : end - width;
		}

		sg.timeline.setWindow(start, end);
	}

	/* genTimelineDataset, generate data for the timeline from sg.simRes simulation result */
	sg.genTimelineDataset = function() {
		/* Timeline component info. Position of items in arrays MATTERS and should be logically equivalent to the
		 * LogEvent enum found in RazSim.js. */
		var states = [
			null,
			"enqueued",
			"blocked",
			"running",
			"blocked",
			"preempted",
		];

		var colors = [
			null,
			"#f8ffbf",
			"#c8c8c8",
			"#a6f6b3",
			"#c8c8c8",
			"#ffcbb7",
		];

		var colors2 = [
			null,
			"#b3bc69",
			"#a3a3a3",
			"#6fc87e",
			"#a3a3a3",
			"#ce876c",
		];

		/* gather timeline data */
		var execArray = [];
		for (let i = 0; i < sg.simRes.processList.length; i++) {
			execArray.push(sg.simRes.processList[i].execLog)
		}

		var runTime = sg.simRes.runTime;
		var tID = 0;
		var tItems = [];
		for (let i = 0; i < execArray.length; i++) {
			let tmpBlockEvt = null;
			for (let j = 0; j < execArray[i].length-1 && execArray[i][j].timestamp < runTime; j++) {
				/* Save preempt event, use it if an enqueue event happens afterwards before a pick event. Enqueue events
				 * can happen in putPrev after a preempt, but the process was still preempted, not just randomly
				 * enqueued. Clear the block event on pick. */
				if (execArray[i][j].event === LogEvent.preempt) {
					tmpBlockEvt = execArray[i][j];
				} else if (execArray[i][j].event === LogEvent.pick) {
					tmpBlockEvt = null;
				}

				if (execArray[i][j].timestamp !== execArray[i][j+1].timestamp &&
					execArray[i][j].event !== LogEvent.exit) {

					let currEvt = execArray[i][j];
					let endVal = execArray[i][j+1].timestamp > runTime ? runTime : execArray[i][j+1].timestamp;

					/* Replace enqueue event with a preempt event if the process was preempted before being enqueued. */
					if (currEvt.event === LogEvent.enqueue && tmpBlockEvt !== null) {
						currEvt = tmpBlockEvt;
						tmpBlockEvt = null;
					}

					tItems.push({
						id: tID,
						content: states[currEvt.event],
						start: currEvt.timestamp,
						end: endVal,
						group: i,
						style: "color: " + colors2[currEvt.event] +
							"; border-color: " + colors2[currEvt.event] +
							"; background-color: "+colors[currEvt.event]
					});
					tID++;
				}
			}

			/* Replace enqueue event with a preempt event if the process was preempted before being enqueued. */
			let last = execArray[i][execArray[i].length-1];
			if (last !== undefined) {
				if (last.event === LogEvent.enqueue && tmpBlockEvt !== null) {
					last = tmpBlockEvt;
					tmpBlockEvt = null;
				}

				if (last.event !== LogEvent.exit && last.timestamp < runTime) {
					tItems.push({
						id: tID,
						content: states[last.event],
						start: last.timestamp,
						end: sg.simRes.runTime,
						group: i,
						style: "color: " + colors2[last.event] +
							"; border-color: " + colors2[last.event] +
							"; background-color: "+colors[last.event]
					});
					tID++;
				}
			}
		}

		return new vis.DataSet(tItems);
	}

	/* simFirstRun, initialize the simulator GUI for running full or step-by-step single simulations */
	sg.initRun = function() {
		/* get process colors */
		sg.procColors = getRandomColors(sg.simRes.processList.length, 70, 85);
		sg.procColors.push("hsla(0,0%,85%,1)");

		var tGroups = [];
		for (let i = 0; i < sg.simRes.processList.length; i++) {
			tGroups.push({id: i, content: i + ": " + sg.simRes.processList[i].pname +
				"<br>("+ sg.simRes.processList[i].schedClass.name +")"});
		}


		/* calculate initial width for the timeline */
		var tickLen = sr("getTimerTickLen");
		var tlWidth = $(".vis-content")[0].offsetWidth;
		var initialWidth = tickLen * 2 + tickLen * Math.floor(tlWidth / 100);
		if (tickLen > sg.simRes.length) {
			initialWidth = sg.simRes.length > 2000 ? 2000 : sg.simRes.length;
		}

		/* set timeline config */
		sg.timelineOpts.max = sg.simRes.length + Math.floor(initialWidth / 10);
		sg.timeline.setOptions(sg.timelineOpts);
		if (!sg.tlClear) {
			sg.timeline.removeCustomTime("Simulation end");
		} else {
			sg.tlClear = false;
		}
		sg.timeline.addCustomTime(sg.simRes.length, "Simulation end");

		/* set initial view for the timeline */
		var setupTimelineData = function() {
			/* set timeline data */
			sg.timeline.setData({
				groups: tGroups,
				items: sg.genTimelineDataset()
			});

			/* set timeline colors */
			let backgrounds = $(".vis-background > .vis-group");
			let labels = $(".vis-label");
			for (let i = 0; i < sg.simRes.processList.length; i++) {
				$(backgrounds[i+1]).css({
					"background-color": sg.procColors[i].substr(0, sg.procColors[i].length - 2) + "20%)"
				});
				$(labels[i]).css({
					"background-color": sg.procColors[i].substr(0, sg.procColors[i].length - 2) + "60%)"
				});
			}
		}

		sg.timeline.setData({
			groups: [],
			items: []
		});

		let tlWindow = sg.timeline.getWindow();
		let endTime = tlWindow.end.getTime();
		if (tlWindow.start.getTime() === 0 && initialWidth * 0.5 < endTime && endTime < initialWidth * 1.5) {
			/* Catch the case where window doesn't change and we get no callback call. The problem is that randomly,
			 * with small differences, on every 3rd run in a row, the callback won't happen anyway and we end up with
			 * an empty timeline. To catch those cases as well, we include a threshold of half the size of
			 * initialWidth. */
			setupTimelineData();
		} else {
			sg.timeline.setWindow(0, initialWidth, {animation: false}, function() {
				/* Setup in callback to make sure the window is positioned correctly and we don't freeze on trying
				 * to display way too much data. */
				setupTimelineData();
				sg.prevInitialWidth = initialWidth;
			});
		}

		sg.setState(2);
	}

	/* simRun, run simulation and store its result */
	sg.simRun = function() {
		$("#btnSingleRun").tooltip('hide');

		if (sg.state < 1 || sg.state === 1 && sg.changed) {
			sg.applySettings();
		}

		// stop animation
		sg.animationRunning = false;
		sg.animationStarted = false;

		sg.simRes = null;
		sg.simRes = sr('run');
		if (sg.simRes !== null) {
			console.log(sg.simRes);

			if (sg.state < 2) {
				sg.initRun();
			} else {
				sg.timeline.setItems(sg.genTimelineDataset());
			}

			sg.endRun();
		}
	}

	/* simStep, run simulation for a specified number of time steps */
	sg.simStep = function(steps) {
		if (typeof(steps) === "string") {
			steps = parseInt(steps);
		}

		if (sg.state < 1 || sg.state === 1 && sg.changed) {
			sg.applySettings();
		}

		sg.simRes = null;
		sg.simRes = sr('step', steps);
		if (sg.simRes !== null) {
			console.log(sg.simRes);

			if (sg.state < 2) {
				sg.initRun();
			} else {
				sg.timeline.setItems(sg.genTimelineDataset());
			}

			if (sg.simRes.finished) {
				sg.endRun();

				sg.animationRunning = false;
				$("#btnAnimateRun").removeClass("icon-pause");
				$("#btnAnimateRun").addClass("icon-play");
			}

			sg.centerView(sg.simRes.runTime);
		}
	}

	/* simStep, run simulation for a specified number of time steps */
	sg.simRunTo = function(time) {
		time = sg.parseSuffix(time);

		if (sg.state < 1 || sg.state === 1 && sg.changed) {
			sg.applySettings();
		}

		// stop animation
		sg.animationRunning = false;
		sg.animationStarted = false;

		sg.simRes = null;
		sg.simRes = sr('runTo', time);
		if (sg.simRes !== null) {
			console.log(sg.simRes);

			if (sg.state < 2) {
				sg.initRun();
			} else {
				sg.timeline.setItems(sg.genTimelineDataset());
			}

			if (sg.simRes.finished) {
				sg.endRun();
			}

			sg.centerView(sg.simRes.runTime);
		}
	}

	/* animateRun, run a simulation step by step with a set time delay */
	sg.animateRun = async function() {
		$("#btnInputStep").tooltip('hide');

		if (sg.animationStarted) return;

		sg.animationStarted = true;
		while (sg.animationRunning) {
			try {
				sg.simStep(1);
			} catch(e) {
				sg.animationStarted = false;
				sg.animationRunning = false;
				$("#btnAnimateRun").removeClass("icon-pause");
				$("#btnAnimateRun").addClass("icon-play");
				throw e;
			}

			await sg.sleep(sg.frameDelay);
		}
		sg.animationStarted = false;
	}

	sg.endRun = function() {
		var singleResTable = $("#singleResTable");

		// fill in the general results array
		singleResTable.find("#cpuAvg").text(sg.round(sg.simRes.averageLoad * 100) + "%");
		singleResTable.find("#latencyAvg").text(sg.round(sg.simRes.averageLatency.general.avg));
		singleResTable.find("#latencyDev").text(sg.round(sg.simRes.averageLatency.general.dev));
		if (sg.simRes.averageTurnaround.exited > 0) {
			singleResTable.find("#turnaroundCompleted").text(sg.round(sg.simRes.averageTurnaround.exited));
			singleResTable.find("#turnaroundAvg").text(sg.round(sg.simRes.averageTurnaround.avg));
			singleResTable.find("#turnaroundDev").text(sg.round(sg.simRes.averageTurnaround.dev));
		} else {
			singleResTable.find("#turnaroundCompleted").text(0);
			singleResTable.find("#turnaroundAvg").text("-");
			singleResTable.find("#turnaroundDev").text("-");
		}

		// add class specific results
		singleResTable.find(".classRes").remove();
		for (let i in sg.simRes.activeClasses) {
			singleResTable.append('<tr class="classRes"><th scope="row" colspan="2">' + sg.simRes.activeClasses[i] + ' results </th></tr>');
			let classRes = sg.simRes.classStats[sg.simRes.activeClasses[i]];
			for (let j in classRes) {
				singleResTable.append('<tr class="classRes"><td>' + classRes[j][0] + '</td><td class="tab-res">' + sg.round(classRes[j][1]) + '</td></tr>');
			}

		}

		// add per process results
		var singleProcTable = $("#singleProcTable");
		singleProcTable.empty();

		var execAvg = [], execDev = [], latAvg = [], latDev = [];

		for (let i in sg.simRes.processList) {
			let procStats = sg.simRes.processStats;
			singleProcTable.append('<tr><th scope="row">' +
				sg.simRes.processList[i].pid + ": " + sg.simRes.processList[i].pname +
				'</th><th scope="row" colspan=2>execution</th></tr>' +
				'<tr><td></td><td>sum</td><td class="tab-res">' + sg.round(procStats[i].execution.sum) + '</td></tr>' +
				'<tr><td></td><td>average</td><td class="tab-res">' + sg.round(procStats[i].execution.avg) + '</td></tr>' +
				'<tr><td></td><td>standard deviation</td><td class="tab-res">' + sg.round(procStats[i].execution.dev) + '</td></tr>' +
				'<tr><td></td><td>times ran</td><td class="tab-res">' + procStats[i].execution.cnt + '</td></tr>' +
				'<tr><td></td><th scope="row" colspan=2>latency</th></tr>' +
				'<tr><td></td><td>sum</td><td class="tab-res">' + sg.round(procStats[i].latency.sum) + '</td></tr>' +
				'<tr><td></td><td>average</td><td class="tab-res">' + sg.round(procStats[i].latency.avg) + '</td></tr>' +
				'<tr><td></td><td>standard deviation</td><td class="tab-res">' + sg.round(procStats[i].latency.dev) + '</td></tr>');
			if (procStats[i].turnaround.valid) {
				singleProcTable.append(
					'<tr><td></td><th scope=row>turnaround time</th><td class="tab-res">' + sg.round(procStats[i].turnaround.value) + '</td></tr>'
				)
			}

			execAvg.push(sg.round(procStats[i].execution.avg));
			execDev.push(sg.round(procStats[i].execution.dev));
			latAvg.push(sg.round(procStats[i].latency.avg));
			latDev.push(sg.round(procStats[i].latency.dev));
		}

		$("#execBarChart").removeClass('d-none');
		drawMixedProcGraph("execBarChart", "Average process execution time", execAvg,
			"Process execution time standard deviation", execDev);

		$("#procLatStatsTitle").removeClass('d-none');
		$("#latBarChart").removeClass('d-none');
		drawMixedProcGraph("latBarChart", "Average process wait time", latAvg,
			"Process wait time standard deviation", latDev);

		/* gather and set process execution chart data */
		var simLen = sg.simRes.length;
		sg.execTimes = [];
		sg.procNames = [];
		for (let i = 0; i < sg.simRes.processList.length; i++) {
			sg.execTimes.push(sg.simRes.processList[i].execTime);
			sg.procNames.push(sg.simRes.processList[i].pid + ": " + sg.simRes.processList[i].pname);
		}

		var procNamesFinal = [];
		var percentages = [];
		var idleTime = simLen;
		for (let i = 0; i < sg.execTimes.length; i++) {
			idleTime -= sg.execTimes[i];
			percentages.push(Math.round(sg.execTimes[i] / simLen * 10000) / 100);
			sg.procNames[i] = sg.procNames[i];
			procNamesFinal.push(sg.procNames[i] +" (" + percentages[i] + "%)");
		}
		sg.execTimes.push(idleTime);
		percentages.push(Math.round(idleTime / simLen * 10000) / 100);
		sg.procNames.push("Idle process");
		procNamesFinal.push("Idle process (" + percentages[percentages.length-1] + "%)");

		var pieData = {
			datasets: [{
				backgroundColor: sg.procColors,
				data: sg.execTimes
			}],
			labels: procNamesFinal,
		};

		sg.execTimeChart.data = pieData;
		sg.execTimeChart.update();

		sg.setState(0);

		sg.toggleResultsSingle(true);
	}

	/* break the current simulation execution and clear the timeline */
	sg.simBreak = function() {
		if (sg.state === 2) {	// break a currently running simulation
			sr('break');
			sg.setState(0);

			// make sure it doesn't get restarted if animation was running
			sg.animationRunning = false;
			sg.animationStarted = false;
		}

		if (!sg.tlClear) {		// clear the timeline
			sg.timeline.setData({
				groups: [],
				items: [],
			});

			sg.timelineOpts.max = 100;
			sg.timeline.setOptions(sg.timelineOpts);
			sg.timeline.removeCustomTime("Simulation end");
			sg.timeline.setWindow(0, 100);

			sg.tlClear = true;
		}
	}

	/* multiRun, do multiple simulation runs in quick succession and gather results */
	sg.multiRun = function(count) {
		count = parseInt(count);
		if (Number.isNaN(count) || count <= 0) {
			$("#errorTextContainer").text("Error: please enter a positive integer for the number of times to run.");
			$("#errorModal").modal('show');
			return;
		}

		if (sg.state < 1 || sg.state === 1 && sg.changed) {
			sg.applySettings();
		}

		let configString = sg.tryRun("simulation configuration contains an error", JSON.stringify, sg.activeConfig);
		let configCopy = JSON.parse(configString);
		sr(Simulator.multiRun.init, configCopy);
		sg.simMultiRes = sr(Simulator.multiRun.run, count);

		// load results into the table
		var multiResTable = $("#multiResTable");
		multiResTable.empty();
		multiResTable.append('\
			<tr><td>Simulation name</td><td class="tab-right">' + Simulator.multiRun.simConf.name + '</td></tr>\
			<tr><td>Simulations ran</td><td class="tab-right">' + sg.simMultiRes.simulationsRan + '</td></tr>\
			<tr><td>Real time taken</td><td class="tab-right">' + sg.simMultiRes.realTimeTaken + 'ms</td></tr>\
			<tr><th scope="row" colspan="2">CPU load</th></tr>\
			<tr><td>Average</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageLoad.avg * 100) + '%</td></tr>\
			<tr><td>Standard deviation</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageLoad.dev * 100) + '%</td></tr>\
			<tr><th scope="row" colspan="2">Process latency</th></tr>\
			<tr><td>Average</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageLatency.avgAvg) + '</td></tr>\
			<tr><td>Standard deviation of averages</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageLatency.devAvg) + '</td></tr>\
			<tr><td>Average of individual standard deviations</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageLatency.avgDev) + '</td></tr>\
			<tr><th scope="row" colspan="2">Process turnaround time</th></tr>\
			<tr><td>Average</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageTurnaround.avgAvg) + '</td></tr>\
			<tr><td>Standard deviation of averages</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageTurnaround.devAvg) + '</td></tr>\
			<tr><td>Average of individual standard deviations</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageTurnaround.avgDev) + '</td></tr>\
			<tr><td>Average exited processes</td><td class="tab-res">' + sg.round(sg.simMultiRes.averageTurnaround.avgExited) + '</td></tr>\
		');

		// load per process results into table
		var procs = sg.simMultiRes.processStats;
		var multiProcTable = $("#multiProcTable");
		multiProcTable.empty();
		for (let i in procs) {
			multiProcTable.append('<tr><th scope="row">' +
				procs[i].pid + ": " + procs[i].pname +
				'</th><th scope="row" colspan=2>execution</th></tr>\
				<tr><td></td><td>Average sum</td><td class="tab-res">' + sg.round(procs[i].execution.sum) + '</td></tr>\
				<tr><td></td><td>Average run</td><td class="tab-res">' + sg.round(procs[i].execution.avg) + '</td></tr>\
				<tr><td></td><td>Standard deviation of average runs</td><td class="tab-res">' + sg.round(procs[i].execution.dev) + '</td></tr>\
				<tr><td></td><td>Average times ran</td><td class="tab-res">' + procs[i].execution.cnt + '</td></tr>\
				<tr><td></td><th scope="row" colspan=2>latency</th></tr>\
				<tr><td></td><td>Average sum</td><td class="tab-res">' + sg.round(procs[i].latency.sum) + '</td></tr>\
				<tr><td></td><td>Average wait time</td><td class="tab-res">' + sg.round(procs[i].latency.avg) + '</td></tr>\
				<tr><td></td><td>Standard deviation of average wait times</td><td class="tab-res">' + sg.round(procs[i].latency.dev) + '</td></tr>\
				<tr><td></td><th scope="row" colspan=2>turnaround time</th></tr>\
				<tr><td></td><td>Valid simulation count</td><td class="tab-res">' + procs[i].turnaround.valid + '</td></tr>\
			');
			if (procs[i].turnaround.valid > 0) {
				multiProcTable.append('\
					<tr><td></td><td>Average</td><td class="tab-res">' + sg.round(procs[i].turnaround.avg) + '</td></tr>\
					<tr><td></td><td>Standard deviation</td><td class="tab-res">' + sg.round(procs[i].turnaround.dev) + '</td></tr>\
				');
			}
		}

		if (count <= 300) {
			sg.drawGraphs();
			$("#btnDrawGraphsHolder").empty();
		} else {
			$("#graphArea").empty();
			if ($("#btnDrawGraphsHolder").is(":empty")) {
				$("#btnDrawGraphsHolder").append('<button id="btnDrawGraphs" type="button" class="btn\
					btn-outline-primary icon-bar-chart-2 ml-2" data-toggle="tooltip" data-placement="top"\
					title="Draw graphs" onclick="SimGUI.checkDrawGraphs()"></button>');
				$("#btnDrawGraphs").tooltip();
			}
		}

		sg.toggleResultsMulti(true);
		sg.setState(0);
	}

	/* draw multirun graphs */
	sg.checkDrawGraphs = function() {
		$("#btnDrawGraphs").tooltip("hide");
		$("#graphLoadModal").modal("show");
	}
	sg.drawGraphs = function() {
		if (Simulator.multiRun.results === undefined || Simulator.multiRun.results === null) {
			throw new Error("Simulator.multiRun.results empty, did a multirun simulation even run?");
		}

		let graphArea = $("#graphArea");
		graphArea.empty();
		var loadList = [], latList = [], latDevList = [], turnaroundList = [], turnaroundDevList = [];
		for (let i in Simulator.multiRun.results) {
			loadList.push(Simulator.multiRun.results[i].averageLoad);
			latList.push(Simulator.multiRun.results[i].averageLatency.general.avg);
			latDevList.push(Simulator.multiRun.results[i].averageLatency.general.dev);
			turnaroundList.push(Simulator.multiRun.results[i].averageTurnaround.avg);
			turnaroundDevList.push(Simulator.multiRun.results[i].averageTurnaround.dev);
		}
		graphArea.append('\
			<div class="col-12"><div class="sg-section-title mt-4">' + "CPU Load" + '</div></div>\
			<div class="col-12 chart-container p-0"><canvas id="' + "graphLoad" + '" class="mt-2"></canvas></div>');
		drawGraph("graphLoad", "CPU load", true, loadList, sg.simMultiRes.averageLoad.dev);
		graphArea.append('\
			<div class="col-12"><div class="sg-section-title mt-4">' + "Process Latency" + '</div></div>\
			<div class="col-12 chart-container p-0"><canvas id="' + "graphLatency" + '" class="mt-2"></canvas></div>');
		drawGraph("graphLatency", "process latency", false, latList, latDevList);
		graphArea.append('\
			<div class="col-12"><div class="sg-section-title mt-4">' + "Process Turnaround Time" + '</div></div>\
			<div class="col-12 chart-container p-0"><canvas id="' + "graphTurnaround" + '" class="mt-2"></canvas></div>');
		drawGraph("graphTurnaround", "process turnaround time", false, turnaroundList, turnaroundDevList);
	}

	/* scheduling class list controls */
	sg.classControl = {
		classes: [],

		reload: function(showActive) {
			this.classes = Simulator.getSchedClassPrioRegistered();
			var active = Simulator.getSchedClassPrio();

			/* copy class priority into active config */
			if (sg.activeConfig !== undefined) {
				sg.activeConfig.classPrio = [...active];
				sg.saveLocal();
			}

			var container = $("#classTable");
			$('.tooltip').tooltip('hide');
			container.empty();

			for (let i in this.classes) {

				let activity = "";

				if (showActive !== false) {
					activity = active.includes(this.classes[i]) ?
						'<div class="classAct btn-group mr-2" role="group"><button type="button" data-toggle="tooltip"\
							data-placement="top" title="Active" class="btn btn-sm btn-outline-success icon-check">\
							</button></div>' :
						'<div class="classAct btn-group mr-2" role="group"><button type="button" data-toggle="tooltip"\
							data-placement="top" title="Inactive" class="btn btn-sm btn-outline-secondary icon-x">\
							</button></div>';
					$("#classesDisabledInfo").addClass('d-none');
				} else {
					$("#classesDisabledInfo").removeClass('d-none');
				}

				let disabled = sg.settingsEnabled ? "" : " disabled";

				let entry =
					'<tr>\
						<th scope="row">' + i + '</th>\
						<td>' + this.classes[i] + '</td>\
						<td class="p-2 d-flex justify-content-end">\
							<div class="btn-toolbar" role="toolbar">'
								+ activity +
								'<div class="btn-group mr-2" role="group">\
									<button onclick="SimGUI.classControl.modal(' + i + ')" type="button"\
										data-toggle="tooltip" data-placement="top" title="Info & Settings"\
										class="classSet set btn btn-sm btn-outline-primary icon-settings"' + disabled + '></button>\
								</div>\
								<div class="btn-group" role="group">\
									<button onclick="SimGUI.classControl.prioUp(' + i + ')" type="button"\
										data-toggle="tooltip" data-placement="top" title="Increase priority"\
										class="classSet set btn btn-sm btn-outline-primary icon-arrow-up"' + disabled + '></button>\
									<button onclick="SimGUI.classControl.prioDown(' + i + ')" type="button"\
									data-toggle="tooltip" data-placement="top" title="Decrease priority"\
										class="classSet set btn btn-sm btn-outline-primary icon-arrow-down"' + disabled + '></button>\
								</div>\
							</div>\
						</td>\
					</tr>';

				container.append(entry);
			}

			// init tooltips
			container.find('[data-toggle="tooltip"]').tooltip()
		},

		activeClass: undefined,

		modal: function(index) {
			var schedClassName = sr("getSchedClassPrioRegistered")[index];
			var schedClass = sr("getSchedClassRegistered")[schedClassName];
			sg.classControl.activeClass = schedClass;
			$("#schedClassModalTitle").text(schedClassName);
			var description = schedClass.getDescription();
			$("#schedClassDescription").html(description.replace(/\n/g, "<br>"));

			if (sg.activeConfig.classParams === undefined) {
				sg.activeConfig.classParams = {};
			}

			if (sg.activeConfig.classParams[schedClassName] === undefined) {
				$("#classParamArea").val(sg.jsonReshape(JSON.stringify(schedClass.classParamsTemplate(), null, 2)));
			} else {
				$("#classParamArea").val(
					sg.jsonReshape(JSON.stringify(sg.activeConfig.classParams[schedClassName], null, 2))
				);
			}

			$("#schedClassModal").modal("show");
		},

		modalReset: function() {
			$("#classParamArea").val(
				sg.jsonReshape(JSON.stringify(sg.classControl.activeClass.classParamsTemplate(), null, 2))
			);
			$("#btnResetClassParams").tooltip("hide");
		},

		modalApply: function() {
			var text = $("#classParamArea").val();
			var paramConfig = sg.tryRun("scheduling class parameters contain a syntax error", JSON.parse, text);
			sg.activeConfig.classParams[sg.classControl.activeClass.name] = paramConfig;
			SimGUI.saveLocal();
			$("#schedClassModal").modal("hide");
		},

		prioUp: function(index) {
			if (index > 0) {
				let prioArray = [];
				for (let i = 0; i < this.classes.length; i++) {
					prioArray.push(i);
				}
				prioArray[index]--;
				prioArray[index-1]++;

				sr("reorderRegisteredClasses", prioArray);
				sg.changed = true;
				this.reload();
			}
		},

		prioDown: function(index) {
			if (index < this.classes.length - 1) {
				let prioArray = [];
				for (let i = 0; i < this.classes.length; i++) {
					prioArray.push(i);
				}
				prioArray[index]++;
				prioArray[index+1]--;

				sr("reorderRegisteredClasses", prioArray);
				sg.changed = true;
				this.reload();
			}
		}
	}

	/* object and functions related to text area handling */
	sg.processContext = {	// process definition text area; processDefArea
		lastKey: 0,
		lastPos: undefined,
		deletedStr: undefined,
		prevSelStart: 0,
		prevSelEnd: 0,
		textAreaRow: "#procTextAreaRow",
		textAreaCol: "#procTextAreaCol",
		textAreaPos: "#procTextAreaPos",
	};

	sg.classContext = {		// scheduling class configuration text area; classParamArea
		lastKey: 0,
		lastPos: undefined,
		deletedStr: undefined,
		prevSelStart: 0,
		prevSelEnd: 0,
		textAreaRow: "#classTextAreaRow",
		textAreaCol: "#classTextAreaCol",
		textAreaPos: "#classTextAreaPos",
	};

	/* update the GUI display of position of the cursor inside textarea */
	sg.cursorPosHandler = function(event, context) {
		let position = false;
		if (event.target.selectionStart !== context.prevSelStart) {
			position = event.target.selectionStart;
		} else if (event.target.selectionEnd !== context.prevSelEnd) {
			position = event.target.selectionEnd;
		}

		if (position !== false) {
			context.prevSelStart = event.target.selectionStart;
			context.prevSelEnd = event.target.selectionEnd;

			let lines = $(event.target).val().substring(0, position).split("\n");
			$(context.textAreaRow).text(lines.length - 1);
			$(context.textAreaCol).text(lines[lines.length - 1].length);
			$(context.textAreaPos).text(position);
		}

    }

	/* text area editor-like behavior
	 *	tab indents
	 *	tab with selection indents line(s)
	 *	tab + shift unindents line(s)
	 *	enter auto-indents to same level
	 *	home key (without selection / shift) jumps between start of line and start of content
	 *	ctrl+z undoes 1 custom action
	 */
	sg.textAreaKeyHandler = function(e, c) {	// e = event, c = variable context
		if(e.keyCode === 9) {	// tab
			e.preventDefault();
			$(e.target).change();

			let indent = sg.textIndent;
			let val = e.target.value;
			let start = e.target.selectionStart;
			let end = e.target.selectionEnd;

			let oneLine = true;
			if (start !== end) {
				for (let i = start; i < end; i++) {
					if (val[i] === "\n") {
						oneLine = false;
						break;
					}
				}
			}

			if (!e.shiftKey) {
				if (oneLine) {
					if (start === end) {
						e.target.value = val.substring(0, start) + indent + val.substring(end);
						e.target.selectionStart = e.target.selectionEnd = start + indent.length;
						c.lastPos = e.target.selectionStart;
					} else {
						let lineStart = start;
						while (lineStart > 0 && val[lineStart - 1] !== "\n") lineStart--;
						e.target.value = val.substring(0, lineStart) + indent + val.substring(lineStart);
						e.target.selectionStart = start + indent.length;
						e.target.selectionEnd = end + indent.length;
						c.lastPos = lineStart + indent.length;
					}
					c.lastKey = "in";
				} else {
					sg.indentLine(e.target, start, end, indent);
					c.lastKey = "m-in";
					c.lastPos = [e.target.selectionStart, e.target.selectionEnd];
				}
			} else {
				let lineStart = start;
				while (lineStart > 0 && val[lineStart - 1] !== "\n") lineStart--;
				if (oneLine) {
					let moveLen = 0;
					if (val.substr(lineStart, indent.length) === indent) {
						e.target.value = val.substring(0, lineStart) + val.substring(lineStart + indent.length);
						moveLen = indent.length;
						c.lastKey = "un";
						c.lastPos = lineStart;
					} else if (val[lineStart] === " ") {
						e.target.value = val.substring(0, lineStart) + val.substring(lineStart + 1);
						moveLen = 1;
						c.lastKey = "uns";
						c.lastPos = lineStart;
					} else if (val[lineStart] === "\t") {
						e.target.value = val.substring(0, lineStart) + val.substring(lineStart + 1);
						moveLen = 1;
						c.lastKey = "unt";
						c.lastPos = lineStart;
					}

					if (moveLen > 0) {
						if (start - moveLen < lineStart) {
							e.target.selectionStart = e.target.selectionEnd = lineStart;
						} else {
							e.target.selectionStart = start - moveLen;
							e.target.selectionEnd = end - moveLen;
						}
					}
				} else {
					sg.unindentLine(e.target, start, end, indent);
					c.lastKey = "m-un";
					c.lastPos = [e.target.selectionStart, e.target.selectionEnd];
				}
			}

		} else if(e.keyCode === 13) {	// enter
			e.preventDefault();
			$(e.target).change();

			let indent = sg.textIndent;
			let start = e.target.selectionStart;
			let end = e.target.selectionEnd;
			c.deletedStr = e.target.value.substring(start, end);

			let lineStart = start;
			while (lineStart > 0 && e.target.value[lineStart - 1] !== "\n") lineStart--;

			let lineIn = "";
			let i = lineStart;
			for (; e.target.value.substr(i, indent.length) === indent; i += indent.length) {
				lineIn += indent;
			}
			for (; e.target.value[i] === " "; i++) {
				lineIn += " ";
			}

			e.target.value = e.target.value.substring(0, start) + "\n" + lineIn + e.target.value.substring(end);

			e.target.selectionStart = e.target.selectionEnd = start + lineIn.length + 1;

			c.lastPos = [start, e.target.selectionEnd];
			c.lastKey = "autoin";

		} else if(e.keyCode === 36 && !e.shiftKey) {	// home key
			e.preventDefault();

			let lineStart = e.target.selectionStart;
			while (lineStart > 0 && e.target.value[lineStart - 1] !== "\n") lineStart--;
			let contentStart = lineStart;
			for (; e.target.value[contentStart] === " " || e.target.value[contentStart] === "\t"; contentStart++);

			if (e.target.selectionStart === lineStart) {
				e.target.selectionEnd = contentStart;
				e.target.selectionStart = e.target.selectionEnd;
			} else {
				if (e.target.selectionStart <= contentStart) {
					e.target.selectionStart = lineStart;
				} else {
					e.target.selectionStart = contentStart;
				}
				e.target.selectionEnd = e.target.selectionStart;
			}

		} else if(e.keyCode === 90 && e.ctrlKey && typeof(c.lastKey) === "string") {	// ctrl + z
			/* tab undo */
			let pos = e.target.selectionStart;
			e.preventDefault();
			$(e.target).change();
			switch(c.lastKey) {
				case "in":
					e.target.value = e.target.value.substring(0, c.lastPos - sg.textIndent.length) + e.target.value.substring(c.lastPos);
					break;
				case "un":
					e.target.value = e.target.value.substring(0, c.lastPos) + sg.textIndent + e.target.value.substring(c.lastPos);
					e.target.selectionStart = e.target.selectionEnd = pos <= c.lastPos ? pos : pos + sg.textIndent;
					break;
				case "uns":
					e.target.value = e.target.value.substring(0, c.lastPos) + " " + e.target.value.substring(c.lastPos);
					e.target.selectionStart = e.target.selectionEnd = pos <= c.lastPos ? pos : pos + 1;
					break;
				case "unt":
					e.target.value = e.target.value.substring(0, c.lastPos) + "\t" + e.target.value.substring(c.lastPos);
					e.target.selectionStart = e.target.selectionEnd = pos <= c.lastPos ? pos : pos + 1;
					break;
				case "m-in":
					sg.unindentLine(e.target, c.lastPos[0], c.lastPos[1], sg.textIndent);
					break;
				case "m-un":
					sg.indentLine(e.target, c.lastPos[0], c.lastPos[1], sg.textIndent);
					break;
				case "autoin":
					e.target.value = e.target.value.substring(0, c.lastPos[0]) + c.deletedStr + e.target.value.substring(c.lastPos[1]);
					e.target.selectionStart = e.target.selectionEnd = c.lastPos[0];
					break;
			}
			c.lastKey = e.keyCode;

		} else if (!([16, 17, 18, 27, 35, 36, 37, 38, 39, 40, 45].includes(e.keyCode))) {
			c.lastKey = e.keyCode;
		}
	};

	sg.indentLine = function(area, start, end, indent) {
		let lineStart = start;
		while (lineStart > 0 && area.value[lineStart - 1] !== "\n") lineStart--;
		area.value = area.value.substring(0, lineStart) + indent + area.value.substring(lineStart);

		for (let i = start + indent.length; i < end + indent.length; i++) {
			if (area.value[i] === "\n") {
				area.value = area.value.substring(0, i + 1) + indent + area.value.substring(i + 1);
				end += indent.length;
			}
		}
		area.selectionStart = start + indent.length;
		area.selectionEnd = end + indent.length;
	}

	sg.unindentLine = function(area, start, end, indent) {
		let lineStart = start;
		while (lineStart > 0 && area.value[lineStart - 1] !== "\n") lineStart--;

		if (area.value.substr(lineStart, indent.length) === indent) {
			area.value = area.value.substring(0, lineStart) + area.value.substring(lineStart + indent.length);
			start -= indent.length;
			end -= indent.length;
		} else if (area.value[lineStart] === " " || area.value[lineStart] === "\t") {
			area.value = area.value.substring(0, lineStart) + area.value.substring(lineStart + 1);
			start--;
			end--;
		}

		for (let i = start; i < end; i++) {
			if (area.value[i] === "\n") {
				if (area.value.substr(i + 1, indent.length) === indent) {
					area.value = area.value.substring(0, i + 1) + area.value.substring(i + 1 + indent.length);
					end -= indent.length;
				} else if (area.value[i + 1] === " " || area.value[i + 1] === "\t") {
					area.value = area.value.substring(0, i + 1) + area.value.substring(i + 2);
					end--;
				}
			}
		}
		area.selectionStart = start;
		area.selectionEnd = end;
	}


	/* ----------------------------------- utilities */
	/* round a value to two decimal places */
	sg.round = function(val) {
		if (typeof(val) !== "number") {
			return val;
		}

		var retVal = Math.round(val * 100) / 100;
		return retVal.toFixed(2);
	}

	/* parse a time suffix and return number */
	sg.parseSuffix = function(input, default2ms) {
		var scale = default2ms ? 1000000 : 1;

		return sr("handleSuffix", input, "simulator GUI", scale);
	};

	/* shorten numbers & append suffixes where it makes sense */
	sg.shorten = function(num, allowDecimal) {
		if (typeof(num) === "string") {
			num = parseInt(num);
		} else if (typeof(num) !== "number") {
			return num;
		}

		if (allowDecimal === false) {
			if (num % 3600000000000 === 0) {
				return (num / 3600000000000) + "h";
			} else if (num % 60000000000 === 0) {
				return (num / 60000000000) + "min";
			} else if (num % 1000000000 === 0) {
				return (num / 1000000000) + "s";
			} else if (num % 1000000 === 0) {
				return (num / 1000000) + "ms";
			} else if (num % 1000 === 0) {
				return (num / 1000) + "us";
			} else {
				return num;
			}
		} else {	// 3 decimals tops, stay precise > no rounding or approximating (and no decimals on hours/minutes)
			if (num % 3600000000000 === 0) {
				return (num / 3600000000000) + "h";
			} else if (num % 60000000000 === 0) {
				return (num / 60000000000) + "min";
			} else if (num % 1000000 === 0 && num >= 1000000000) {
				return (num / 1000000000) + "s";
			} else if (num % 1000 === 0 && num >= 1000000) {
				return (num / 1000000) + "ms";
			} else if (num < 1000000) {
				return (num / 1000) + "us";
			} else {
				return num;
			}
		}
	}

	sg.indentTextArea = function(area, reload) {
		if (typeof(area) === "string") {
			area = $("#" + area);
		}
		area.css("min-height", "200px");
		var processDefs = area.val();
		if (reload !== false) {
			let procConfParsed = sg.tryRun("process definitions contain an error", JSON.parse, processDefs);
			processDefs = JSON.stringify(procConfParsed, null, 2);
		}

		processDefs = sg.jsonReshape(processDefs);

		sg.processContext.lastKey = 0;
		sg.classContext.lastKey = 0;

		area.val(processDefs);
	}

	/* indent json strings to selected width and apply some stylistic changes. Note that the input should come from
	 * JSON.stringify(text, null, 2); and should hence already be nicely indented */
	sg.jsonReshape = function(jsonText) {
		// indent
		for (let i = 0; i < jsonText.length; i++) {
			if (jsonText[i] === "\n") {
				while (jsonText.substr(i + 1, 2) === "  ") {
					jsonText = jsonText.substring(0, i + 1) + sg.textIndent + jsonText.substring(i + 3);
					i += sg.textIndent.length;
				}
			}
		}

		// one line time ranges
		jsonText = jsonText.replace(/: \[\n[ \t]+(-*\d+\.?\d*|".*"),\n[ \t]+(-*\d+\.?\d*|".*")\n[ \t]+\]/gm, ": [$1,$2]");

		return jsonText;
	}

	// sleep for time milliseconds
	sg.sleep = function(time) {
		return new Promise(resolve => setTimeout(resolve, time));
	}

	// try to run a function and display an error if it fails
	sg.tryRun = function(errorText, fun) {
		var args = [];
		for (let i = 2; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		try {
			return fun.apply(null, args);
		} catch(e) {
			let finalText = "An error occured: " + errorText + "</br>" + e.toString();
			$("#errorTextContainer").html(finalText);
			$("#errorModal").modal('show');
			throw(e);
		}
	}

}) (SimGUI);


/* sr stands for "simulator run", it runs a given simulator function and catches any errors. The function can be passed
 * either as a string, or as the actual function within Simulator namespace. */
function sr(fun) {
	var args = [];
	for (let i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	}
	try {
		if (typeof(fun) === "string") {
			return Simulator[fun].apply(null, args);
		} else {
			return fun.apply(null, args);
		}
	} catch(e) {
		$("#errorTextContainer").text(e.toString());
		$("#errorModal").modal('show');
		throw(e);
	}
}


/* random color generator */
function getRandomColors(count, saturation, light) {
	saturation = (saturation === undefined || saturation === null) ? 60 : saturation;
	light = (light === undefined || light === null) ? 70 : light;

	var interval = Math.floor(360 / count);
	if (interval < 1) {
		interval = 1;
	}
	// fill array
	var retArr = [];
	for (let i = 0; i < count; i++) {
		retArr.push("hsla(" + (i * interval) % 360 + "," + saturation + "%," + light + "%,1)");
	}
	// shuffle array
	for (let i = 0; i < count; i++) {
		let rand = Math.floor(Math.random() * (i + 1));
		let temp = retArr[rand];
		retArr[rand] = retArr[i];
		retArr[i] = temp;
	}
	return retArr;
}

/* offer javascript data as file download. credit:
 * https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server#answer-33542499 */
function downloadData(filename, data) {
    var blob = new Blob([data], {type: 'text/csv'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}


function drawTimeline() {
	// Functions used for X axis unit scaling (faking nanosecond precision)
	var nsFun = function(date) { //function(date, scale, step)
		return new Date(date).getTime() + "ns"
	};
	var usFun = function(date) {
		return Math.round(new Date(date).getTime() / 1000) + "&#181s"
	};
	var msFun = function(date) {
		return Math.round(new Date(date).getTime() / 1000000) + "ms"
	};
	var sFun = function(date) {
		return Math.round(new Date(date).getTime() / 1000000000) + "s"
	};
	var minFun = function(date) {
		return Math.round(new Date(date).getTime() / 60000000000) + "min"
	};

	var optNano = {
		margin: {
			item : {
				horizontal : -Infinity
			}
		},
		min: 0,
		start: 0,	// need this to init empty timeline
		max: 1000 * 1000 * 1000 * 60 * 60,	// 1 hour

		format: {
			minorLabels: nsFun,
			majorLabels: {
				millisecond:'',
				second:     '',
				minute:     '',
				hour:       '',
				weekday:    '',
				day:        '',
				week:       '',
				month:      '',
				year:       '',
			},
		},

		showMajorLabels: false,
		showCurrentTime: false,

		timeAxis: {
			scale: 'millisecond',
			step: 10
		},

		onInitialDrawComplete: function() {
			$("#loading-container").removeClass('d-flex');
			$("#loading-container").addClass('d-none');
		},
	};
	SimGUI.timelineOpts = optNano;

	var container = document.getElementById('timeline-container');
	var timeline = new vis.Timeline(container, new vis.DataSet([]), optNano);
	SimGUI.timeline = timeline;
	SimGUI.timeline.setWindow(0, 100);

	timeline.on('rangechange', function (props) {
		var viewWidth = document.getElementsByClassName("vis-content")[0].offsetWidth;
		var timespan = props.end.getTime() - props.start.getTime();
		var normTime = timespan / (viewWidth / 100);	// time per 100 pixels
		var linesPerNorm = 1;	// how many lines we're trying to get into 100 pixels of width
		var optimalStep = normTime / linesPerNorm;

		// array of available step sizes
		var stepArray = [
			[1, nsFun],
			[2, nsFun],
			[5, nsFun],
			[10, nsFun],
			[20, nsFun],
			[50, nsFun],
			[100, nsFun],
			[200, nsFun],
			[500, nsFun],
			[1000, usFun],
			[2000, usFun],
			[5000, usFun],
			[10000, usFun],
			[20000, usFun],
			[50000, usFun],
			[100000, usFun],
			[200000, usFun],
			[500000, usFun],
			[1000000, msFun],
			[2000000, msFun],
			[5000000, msFun],
			[10000000, msFun],
			[20000000, msFun],
			[50000000, msFun],
			[100000000, msFun],
			[200000000, msFun],
			[500000000, msFun],
			[1000000000, sFun],
			[2000000000, sFun],
			[5000000000, sFun],
			[10000000000, sFun],
			[20000000000, sFun],
			[60000000000, minFun],
			[120000000000, minFun],
			[300000000000, minFun],
			[600000000000, minFun],
			[1200000000000, minFun],
			[1800000000000, minFun],
			[3600000000000, minFun],
		];

		// search for closest value with bisection
		var index;
		var left = 0;
		var right = stepArray.length - 1;
		var mid = Math.floor(right / 2);
		while (left + 1 !== right) {
			if (optimalStep > stepArray[mid][0]) {
				left = mid;
			} else {
				right = mid;
			}
			mid = Math.floor((left + right) / 2);
		}
		// scaling isn't linear, account for that somewhat
		if (stepArray[right][0] >= 2 * stepArray[left][0]) {
			if (2 * stepArray[left][0] >= optimalStep) {
				index = left;
			} else {
				index = right;
			}
		} else {
			if (stepArray[right][0] - optimalStep > optimalStep - stepArray[left][0]) {
				index = left;
			} else {
				index = right;
			}
		}

		delete SimGUI.timelineOpts.start;	// delete start or it's stuck on its value
		SimGUI.timelineOpts.timeAxis.step = stepArray[index][0];
		SimGUI.timelineOpts.format.minorLabels = stepArray[index][1];
		timeline.setOptions(SimGUI.timelineOpts);
	});
}

function drawPieChart() {
	var pieData = {
		datasets: [{
			backgroundColor: ["hsla(0,0%,85%,1)"],
			data: [1],
		}],
		labels: ["idle"],
	};

	var pieOptions = {
		responsive: true,
		maintainAspectRatio: true,
		aspectRatio: 1.5,
		legend: {
			position: 'left',
            onClick: function(e, legendItem) {
				/* update label percentages when hiding or showing an entry */
				// default click behavior start
				var i, n, a;
				var index = legendItem.index;
				var ci = this.chart;
                for (i = 0, n = (ci.data.datasets || []).length; i < n; ++i) {
                    (a = ci.getDatasetMeta(i)).data[index] && (a.data[index].hidden = !a.data[index].hidden);
				}
				// default click behavior end
				var procNamesFinal = [];
				var sum = 0;
				for (i = 0; i < SimGUI.execTimes.length; i++) {
					if (!ci.getDatasetMeta(0).data[i].hidden) {
						sum += SimGUI.execTimes[i];
					}
				}
				for (i = 0; i < SimGUI.execTimes.length; i++) {
					if (!ci.getDatasetMeta(0).data[i].hidden) {
						let part = Math.round(SimGUI.execTimes[i] / sum * 10000) / 100;
						procNamesFinal[i] = SimGUI.procNames[i] + " (" + part + "%)";
					} else {
						procNamesFinal[i] = SimGUI.procNames[i] + " (0%)";
					}
				}
				SimGUI.execTimeChart.data.labels = procNamesFinal;
				ci.update();
			}
        }
	}

	SimGUI.execTimeChart = new Chart('execTimeChart', {
		type: 'pie',
		data: pieData,
		options: pieOptions
	});
}

function drawGraph(divID, dataName, isPercentage, avgData, devData) {
	var data, options;
	var xLabels = [];

	var allZero = false;
	if (devData instanceof Array && devData[0] === 0) {
		allZero = true;
		for (let i = 1; i < devData.length; i++) {
			if (devData[i] !== 0) {
				allZero = false;
				break;
			}
		}
	}

	if (devData === undefined || devData === null || devData === 0 || allZero) {
		// chart with a single dataset
		for (let i in avgData) {
			xLabels.push(i);
		}

		data = {
			labels: xLabels,
			datasets: [{
				backgroundColor: "orange",
				borderColor: "orange",
				data: avgData,
				label: 'Average ' + dataName,
				fill: "none"
			}]
		};
		options = {
			maintainAspectRatio: false,
			spanGaps: false,
			elements: {
				line: {
					tension: 0
				}
			},
			legend: {
				onClick: undefined, // disable hiding of datasets, makes no sense here
			},
			tooltips: {
				callbacks: {
					// eslint-disable-next-line no-unused-vars
					title: function(tooltipItem, data) {
						return "Run: " + tooltipItem[0].index;
					},
					// eslint-disable-next-line no-unused-vars
					label: function(tooltipItem, data) {
						return Math.round(avgData[tooltipItem.index] * 100) / 100;
					},
				}
			},
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero: false
					}
				}]
			}
		};

	} else {
		// chart with deviation
		if (!(devData instanceof Array)) {
			let tmp = [];
			// eslint-disable-next-line no-unused-vars
			for (let i in avgData) {
				tmp.push(devData);
			}
			devData = tmp;
		}

		var lowArr = [];
		var midArr = [];
		var highArr = [];

		// lowest & highest value is needed for setting lower bound of y axis scale (upper bound is set automatically)
		var lowest = devData[0] < avgData[0] ? avgData[0] - devData[0] : 0;
		var hitZero = lowest === 0 ? true : false;
		var highest = (isPercentage && lowArr[0] + midArr[0] + devData[0] > 1) ? 1 : lowArr[0] + midArr[0] + devData[0];

		for (let i in avgData) {
			xLabels.push(i);
			let diff = devData[i];
			if (diff < avgData[i]) {
				lowArr.push(avgData[i] - diff);
				midArr.push(diff);
				if (!hitZero && lowArr[i] < lowest) {
					lowest = lowArr[i];
				}
			} else {
				lowArr.push(0);
				midArr.push(avgData[i]);
				hitZero = true;
			}
			if (isPercentage && lowArr[i] + midArr[i] + diff > 1) {
				highArr.push(1 - midArr[i] - lowArr[i]);
				highest = 1;
			} else {
				highArr.push(diff);
				let hVal = lowArr[i] + midArr[i] + diff;
				if (hVal > highest) {
					highest = hVal;
				}
			}
		}

		// set lower bound
		var lowBound = 0;
		if (!hitZero) {
			if (isPercentage || lowest < 1) {
				lowBound = (Math.floor(lowest * 10) / 10);
			} else {
				let lowLog = Math.log(lowest) / Math.log(10);
				let scale = Math.pow(10, Math.floor(lowLog));
				lowBound = Math.floor(lowest / scale) * scale;

				let diff = highest - lowest;
				if (diff < lowest - lowBound) {
					let diffLog = Math.log(diff) / Math.log(10);
					scale = Math.pow(10, Math.floor(diffLog));
					lowBound = Math.floor(lowest / scale) * scale;
				}
			}
		}

		data = {
			labels: xLabels,
			datasets: [{
				backgroundColor: "#aaa4",
				borderColor: "#edb",
				data: lowArr,
				label: 'Lower ' + dataName + ' boundry with standard deviation',
				fill: '+1'
			}, {
				backgroundColor: "orange",
				borderColor: "orange",
				data: midArr,
				label: 'Average ' + dataName,
				fill: "none"
			}, {
				backgroundColor: "#aaa4",
				borderColor: "#ced",
				data: highArr,
				label: 'Upper ' + dataName + ' boundry with standard deviation',
				fill: '-1'
			}]
		};
		options = {
			maintainAspectRatio: false,
			spanGaps: false,
			elements: {
				line: {
					tension: 0
				}
			},
			legend: {
				onClick: undefined, // disable hiding of datasets, makes no sense here
			},
			scales: {
				yAxes: [{
					stacked: true,
					ticks: {
						beginAtZero: false,
						min: lowBound
					}
				}],
			},
			plugins: {
				filler: {
					propagate: false
				},
				'samples-filler-analyser': {
					target: 'chart-analyser'
				}
			},
			tooltips: {
				callbacks: {
					// eslint-disable-next-line no-unused-vars
					title: function(tooltipItem, data) {
						return "Run: " + tooltipItem[0].index;
					},
					// eslint-disable-next-line no-unused-vars
					label: function(tooltipItem, data) {
						var retVal;
						if (tooltipItem.datasetIndex === 0) {
							retVal = lowArr[tooltipItem.index];
						} else if (tooltipItem.datasetIndex === 1) {
							retVal = lowArr[tooltipItem.index] + midArr[tooltipItem.index];
						} else {
							retVal = lowArr[tooltipItem.index] + midArr[tooltipItem.index] + highArr[tooltipItem.index];
						}
						return Math.round(retVal * 100) / 100;
					},
					// eslint-disable-next-line no-unused-vars
					afterLabel: function(tooltipItem, data) {
						if (tooltipItem.datasetIndex === 0) {
							return (Math.round(devData[tooltipItem.index] * 100) / 100) + " std. dev.";
						} else if (tooltipItem.datasetIndex === 1) {
							return "";
						} else {
							return (Math.round(devData[tooltipItem.index] * 100) / 100) + " std. dev.";
						}
					},
				}
			}
		};
	}

	new Chart(divID, {
		type: 'line',
		data: data,
		options: options
	});
}

/* draw a graph with data about processes */
function drawMixedProcGraph(divID, dataName1, data1, dataName2, data2) {
	$("#" + divID).empty();
	$("#" + divID).append('<canvas id=' + divID + 'Canvas></canvas>');

	let colors = SimGUI.procColors.slice(0, SimGUI.procColors.length - 1);
	let procNames = [];
	for (let i in SimGUI.simRes.processList) {
		procNames.push(SimGUI.simRes.processList[i].pid + ": " + SimGUI.simRes.processList[i].pname);
	}

	var data = {
		datasets: [{
			label: dataName2,
			data: data2,
			type: 'line'
		}, {
			backgroundColor: colors,
			label: dataName1,
			data: data1
		}],
		labels: procNames
	};

	var options = {
		responsive: true,
		maintainAspectRatio: true,
		aspectRatio: 1.5,
		legend: {
			reverse: true
		}
	}

	new Chart(divID + 'Canvas', {
		backgroundColor: colors,
		type: 'bar',
		data: data,
		options: options
	});
}
