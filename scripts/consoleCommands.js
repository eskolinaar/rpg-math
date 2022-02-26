
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
	$("body").trigger("teleport");
}

function getPosition() {
	$("body").trigger("position");
}

function noDamage() {
	$("body").trigger("noDamage");	
}

function spawnMob(mob) {
	$("body").trigger("spawnMob", mob);
}

function removeFog() {
	$("body").trigger("removeFog");	
}

function showCheats() {
	console.log("CHEATS:\n"+
	"---------------------\n"+
	"* enableCheats()\n"+
	"* loadMap(mapname)\n"+
	"* teleport(x, y)\n"+
	"* getPosition()\n"+
	"* noDamage()\n"+
	"* spawnMob(mob)\n"+
	"* removeFog()\n"+
	"---------------------");
}