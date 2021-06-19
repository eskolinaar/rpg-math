
function loadMap(mapname) {
	$("body").trigger("forceEndCombat");     

	window.gamedata.mapManager.disposeMobs();
	window.gamedata.mapManager.quest.dispose();
	window.gamedata.mapManager.loadMap(mapname);
}

function enableCheats() {
	$("body").trigger("enableCheats");

	// enables kill command on key "k"
}

function teleport(x, y) {
	$("body").trigger("forceEndCombat");     
	$("body").trigger("move", { x:x, y:y });
}

function getPosition() {
	$("body").trigger("position");
}

function noDamage() {
	$("body").trigger("noDamage");	
}