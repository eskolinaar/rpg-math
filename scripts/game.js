"use strict";
import {render, initWorld, registerWindowResizeHandler, mapManager, delta} from './World.js';
import {
    registerKeyStrokes,
    activateRegenerationLoop,
    mobWalk,
    targetMob,
    paused,
    setPaused,
    spectatorMode
} from './movement.js';
import { RandomMath } from './Math.js';
import { suffer } from './combat.js';
import { Statistic } from './statistics.js';
import { initAnimations } from './combatAnimations.js';
import {notify, parseJSON, shuffle} from './helper.js';
import { SaveGame } from "./savegame.js";

var mathLoader;
var sufferTime;
var walkerTime;
var statistics;
var maptransfer;
export var savegame;
export var isCheatingEnabled;
export var isNoDamageEnabled;
export var game_mode;
export var mouseTiltX;

export function getLanguage() {
    let lang=navigator.language.substring(0, 2);
    console.log("using language ", lang);
    return lang;
}

export function showMessage(did) {
    console.log("showMessage, "+did);
    $(".message").fadeOut();
    $("#combat_ui").fadeOut();
    $("#movement_ui").fadeOut();
    $("#quest_ui").fadeOut();
    $("#difficulty_ui").fadeOut();    
    $(".language_ui").fadeIn();    

    let msg=$("."+did+"_"+window.gamedata.language);
    if (msg.length>0) {
        msg.fadeIn();
        return;
    }
    msg=$("."+did+"_en");
    if (msg.length>0) {
        msg.fadeIn();
        return;
    }
    $("."+did+"_de").fadeIn();
}

export function i18n(key) {
    if (window.gamedata.language=="de") {
        switch (key) {
            case 'difficulty':
                return "Schwierigkeit: ";
            case 'quest_complete':
                return "Quest abgeschlossen";
            case 'loading':
                return "Lade Inhalte ... noch ";
            case 'files':
                return "Dateien";
            case 'level_build':
                return "Baue das Level auf ...";
            case 'mob_instance':
                return "Erwecke Monster zum Leben ...";
            case 'token_instance':
                return "Erstelle Token ...";
            case 'north':
                return "Norden";
            case 'east':
                return "Osten";
            case 'south':
                return "S&uuml;den";
            case 'west':
                return "Westen";
            case 'found':
                return "gefunden";
            case 'combat_begins':
                return "Kampf beginnt";
            case 'combat_ends':
                return "Kampf beendet";
            case 'quest_accept':
                return "Neue Quest gestartet";
            case 'no_damage':
                return "Schadensimmunität aktiv";
            case 'enable_cheats':
                return "Cheats aktiviert";
        }
    }
    switch (key) {
        case 'difficulty':
            return "difficulty: ";
        case 'quest_complete':
            return "quest complete";
        case 'loading':
            return "loading assets ... ";
        case 'files':
            return " files";  
        case 'level_build':
            return "building level ...";
        case 'mob_instance':
            return "waking up monsters ...";
        case 'token_instance':
            return "distributing objects ...";
        case 'north':
            return "north";
        case 'east':
            return "east";
        case 'south':
            return "south";
        case 'west':
            return "west";
        case 'found':
            return "found";
        case 'combat_begins':
            return "combat begins"
        case 'combat_ends':
            return "combat complete";
        case 'quest_accept':
            return "new quest accepted";
        case 'no_damage':
            return "damage immunity active";
        case 'enable_cheats':
            return "cheats activated";
    }
}

function initGame() {
    if (typeof BroadcastChannel === 'function') {
        maptransfer = new BroadcastChannel('maptransfer');
    } else { 
        maptransfer = { onMessage:nyi, postMessage:nyi }; 
    }
    mathLoader = new RandomMath();
    statistics = new Statistic();
    savegame = new SaveGame();
    $("button.needs_map").hide();
    initAnimations();
    registerKeyStrokes();
    initModelAndScene();     
    render(); // start render loop
}

function nyi() {
    console.log("Function not supported by browser!");
}

function fps(frames) {
    console.log("fps, ", frames);
}

function initDifficulty(initType) {
    $("#difficulty_ui").html(i18n("difficulty")+initType);
    switch (initType) {
        case "1":
            window.gamedata.difficulty={
                "add":20
            }
            break; 
        case "2":
            window.gamedata.difficulty={
                "add":60,
                "sub":60
            }
            break; 
        case "3":
            window.gamedata.difficulty={
                "add":100,
                "sub":100,
                "mul":100
            }
            break; 
        case "*":
            // ToDo: 
            // create custom difficulty form 
            // and read from it
            // support new modes div & mod
            window.gamedata.difficulty={}
            checkAndSetDifficultyValue("add");
            checkAndSetDifficultyValue("sub");
            checkAndSetDifficultyValue("mul");
            checkAndSetDifficultyValue("div");
            checkAndSetDifficultyValue("mod");
            checkFallbackDifficultyValue();
    }
    savegame.saveGameValue("difficulty", window.gamedata.difficulty);
}

function checkAndSetDifficultyValue(typekey) {
    let dval=parseInt($(".custom_difficulty_"+typekey).eq(0).val());
    if (dval==undefined || !Number.isInteger(dval) || dval==0) {
        console.log("skipping custom difficulty '"+dval+"' for typekey='"+typekey+"'");
        return;
    }
    console.log("setting custom difficulty for typekey='"+typekey+"' to '"+dval+"'");
    window.gamedata.difficulty[typekey]=dval;
}

function checkFallbackDifficultyValue() {
    if (window.gamedata.difficulty==undefined) {
        window.gamedata.difficulty={};
    }
    let modes=Object.getOwnPropertyNames(window.gamedata.difficulty);
    if (modes.length<1) {
        console.log("checkFallbackDifficultyValue, setting fallback { add=10 }");
        window.gamedata.difficulty.add=10;
    }
}

function resumeGame() {
    $(".message").hide();
    $(".language_ui").hide();
    $("#combat_ui").show();
    if (targetMob>-1) {
    } else {
        $("#movement_ui").show();
    }
    $("#quest_ui").show();
    $("#difficulty_ui").show();
    setPaused(false);
}

/**
 * 1.) Check if a quest progress has to be notified
 * 2.) Check if a custom event has to be fired.
 *
 * @param message_button
 */
function checkMessageTriggers(message_button) {
    console.log("checkQuestProgress", message_button);
    if (message_button.attr("data-event-qualifier")!==undefined) {
        $("body").trigger({ type:"message", filter:message_button.attr("data-event-qualifier") });
    }
    if (message_button.attr("data-custom-event")!==undefined) {
        $("body").trigger({ type: message_button.attr("data-custom-event") });
    }
}

function initModelAndScene() {
    setPaused(true);
    window.gamedata={};
    window.gamedata.statistics=statistics;

    window.gamedata.language=getLanguage();
    $(".language_ui button.language_"+window.gamedata.language).addClass("active");
    
    isCheatingEnabled=false;

    window.gamedata.direction=3;
    window.gamedata.lastMobId=0;
    window.gamedata.difficulty=initDifficulty("1");

    window.gamedata.canvas={};
    window.gamedata.camera={};
    window.gamedata.camera.deltaX=0;
    window.gamedata.camera.deltaY=0;
    window.gamedata.camera.deltaZ=1.58;      

    window.gamedata.player={};
    window.gamedata.player.life=10;
    window.gamedata.player.current_life=10;

    window.gamedata.currentmap=0;
    window.gamedata.fpsEnabled=false;
    window.gamedata.animationsEnabled=true;

    mouseTiltX=0;

    $("body").mousemove(function (ev) {
        let xdiff = (window.innerWidth-ev.pageX)/window.innerWidth-0.5;
        if (xdiff>0.48) {
            mouseTiltX=0.25;
        } else if (xdiff<-0.48) {
            mouseTiltX=-0.25;
        } else {
            mouseTiltX=0;
        }
    });

    activateRegenerationLoop(1000);  
    clearInterval(sufferTime);
    clearInterval(walkerTime);
    sufferTime=setInterval(() => {
        if (!paused) suffer();
    }, 5000); 
    walkerTime=setInterval(() => {
        if (targetMob<0 && paused==false && spectatorMode==false) {
            mobWalk();
        }
        if (window.gamedata.fpsEnabled) fps(Math.floor(1/delta));
    }, 1500); 

    showMessage("game_mode");
    $(".startup_navigation").hide();
    $("#notification_de").hide();
    $("#notification_en").hide();
    $(".message button").off("click");
    $(".language_ui button").on("click", function () {
        window.gamedata.language=$(this).attr("data-lang");
        $(".language_ui button").removeClass("active");
        $(this).addClass("active");
        mapManager.changeLanguage(window.gamedata.language);
        

        if (mapManager.quest!=undefined && mapManager.getQuest().isComplete()) {
            $(".statistic_summary").html(window.gamedata.statistics.getSummaryHtml());
            showMessage("success_message");
        } else {
            showMessage("game_mode");
        }
    });
    $(".message button").on("click", function () {
        let did=$(this).attr("data-id");

        if ($(this).attr("data-load")!=undefined) return;

        if (did==undefined || did=="") {
            console.log("messages closed. starting/resuming game.");
            if ($(this).attr("data-difficulty")!=undefined) {
                if (["1", "2", "3", "*"].includes($(this).attr("data-difficulty"))) {
                    initDifficulty($(this).attr("data-difficulty"));
                }
            } 
            checkFallbackDifficultyValue();
            resumeGame();
        } else if (did=="nextMap") {
            $("body").trigger({ type:"nextMap" });
        } else if (did=="fullscreen") {
            console.log("fullscreen clicked");
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        } else if (did=="quest_accept") {
            mapManager.acceptQuest();
            notify(i18n("quest_accept"));
            resumeGame();
        } else if (did=="quest_dismiss") {
            resumeGame();
        } else if (did=="message_dismiss") {
            resumeGame();
            checkMessageTriggers($(this));
        } else if (did=="switch_off") {
            mapManager.saveSwitchState(0);
            if (mapManager.openSwitchToken!==undefined && mapManager.openSwitchToken!=null) {
                let token=mapManager.openSwitchToken;
                console.log("switch_off, playing off animation for %o", token);
                if (token?.off!==undefined) token.off.play();
                if (token?.on!==undefined) token.on.stop();
            }
            resumeGame();
        } else if (did=="switch_on") {
            mapManager.saveSwitchState(1);
            if (mapManager.openSwitchToken!==undefined && mapManager.openSwitchToken!=null) {
                let token=mapManager.openSwitchToken;
                console.log("switch_on, playing on animation for %o", token);
                if (token?.on!==undefined) token.on.play();
                if (token?.off!==undefined) token.off.stop();
                if (token?.action?.event!==undefined) {
                    if (!(token.action?.triggered===true)) {
                        $("body").trigger({ type: token.action.event });
                    }
                    token.action.triggered=true;
                }
            }
            resumeGame();
        } else {
            console.log("showing, .%s", did);

            if (mapManager.getQuest()!=undefined && mapManager.getQuest().isComplete()) {
                showMessage("success_message");
            } else {
                showMessage(did);
            }
        }
    });

    $("#difficulty_ui").on("click", () => {
        setPaused(true);
        showMessage("startup_message");
    });
    $("#quest_ui").on("click", () => {
        setPaused(true);
        showMessage("startup_message");
    });
    $(".brightness_multiplicator").on("change", (el) => {
        $("#"+$(el.target).attr("data-sync")).val(el.target.value);
        $(el.target).next().text($(el.target).val());
        $("body").trigger({ type:"updateSettings" });
    });
    $(".fog_multiplicator").on("change", (el) => {
        $("#"+$(el.target).attr("data-sync")).val(el.target.value);
        $(el.target).next().text($(el.target).val());
        $("body").trigger({ type:"updateSettings" });
    });
    $(".animations_enabled").on("change", (el) => {
        console.log("animations enabled", $(el.target)[0].checked);
        // TODO: Add en version and sync
        window.gamedata.animationsEnabled=$(el.target)[0].checked;
    });
    $("input.custom_difficulty").on("change", (changed) => {
        $("#"+$(changed.target).attr("data-sync")).val(changed.target.value);
        $("input.custom_difficulty").each((idx, el)=> {
            $(el).next().text($(el).val());
        });
    });
    $("body").on("enableCheats", function () {
        notify(i18n("enable_cheats"));
        isCheatingEnabled=true;
    });
    $("body").on("noDamage", function () {
        notify(i18n("no_damage"));
        isNoDamageEnabled=true;
    });
    $("body").on("click", ".clearLocalStorage", function () {
        localStorage.clear();
        console.log("localStorage has been cleared.");
    });
    $("body").on("change", ".map_editor_file_upload", (e) => {        
        console.log("file upload triggered", e);
        console.log("file upload triggered", e.target);
        console.log(e.target.files[0]);
        let file=e.target.files[0];
        if (file.type!="application/json") {
            console.log("wrong file type for upload");
            return;
        }
        if (file.size>20000) {
            console.log("untypical file size");
            return;
        }
        let reader = new FileReader();
        reader.onload=(evt) => {
            console.log("read file ended ...");
            console.log(evt.target.result);

            $("body").trigger("forceEndCombat");     
            mapManager.disposeMobs();
            if (mapManager.quest!=undefined) mapManager.quest.dispose();
            mapManager.loadMapFromData(evt.target.result);
        }
        reader.readAsText(file);
		showMessage("startup_message");
    });
    maptransfer.onmessage=function (ev) { 
        console.log("receiving map from editor ...", ev.data.type);
        console.log(ev.data);
        console.log("receiving map, check mathLoader ", mathLoader);
        mathLoader.registerRandomMath();

        if (ev.data.type=="transfer_map") {
            $("body").trigger("forceEndCombat");     
            mapManager.disposeMobs();
            if (mapManager.quest!=null) mapManager.quest.dispose();
            mapManager.loadMapFromData(ev.data.map);
            setPaused(true);
            showMessage("startup_message");    

            maptransfer.postMessage({
                type: "transfer_map_ack"
            });
        }    
    }
    $("body").on("checkMapEditor", function () {
        maptransfer.postMessage({
            type: "transfer_map_check"
        });        
    });
    $("body").on("click", "button.load", function (ev) {
        $("body").trigger("forceEndCombat");
        let maplist=$(ev.currentTarget).attr("data-load");
        if (maplist.indexOf(".list.json")!==undefined && maplist.indexOf(".list.json")>-1
                || maplist.indexOf(".menu.json")!==undefined && maplist.indexOf(".menu.json")>-1) {

            console.log("load maplist", maplist);

            $.get("maps/" + maplist, function (data) {
                console.log("got maplist");
                let maplist_obj = parseJSON(data);
                game_mode = maplist_obj.mode;
                if (maplist.indexOf(".menu.json")>-1) {
                    window.gamedata.maps = extractMapFileNames(maplist_obj.maps);
                } else {
                    window.gamedata.maps = maplist_obj.maps;
                }
                savegame.setSaveMode(maplist_obj.savemode == undefined ? "none" : maplist_obj.savemode);
                savegame.saveGameValue("maplist", maplist);
                if (maplist_obj.order != undefined && maplist_obj.order == "random") {
                    shuffle(window.gamedata.maps);
                }
                mapManager.loadMap(window.gamedata.maps[0]);
                showMessage("startup_message");
            });
        } else {
            console.log("loading single map");
            window.gamedata.maps=[ maplist ];
            savegame.setSaveMode("none");
            savegame.saveGameValue("maplist", maplist);
            game_mode="mapChangeOnQuestComplete";
            mapManager.loadMap(window.gamedata.maps[0]);
            showMessage("startup_message");
        }
    });
    $("body").on("click", "button.submenu", function (ev) {
        $("body").trigger("forceEndCombat");
        let maplist=$(ev.currentTarget).attr("data-load");
        console.log("load maplist", maplist);
        $.get("maps/" + maplist, function (data) {
            let maplist_obj = parseJSON(data);
            game_mode = maplist_obj.mode;
            savegame.setSaveMode(maplist_obj.savemode == undefined ? "none" : maplist_obj.savemode);
            savegame.saveGameValue("maplist", maplist);

            let menu = `<button data-load="${maplist}" class="mode load"><h2>Alle</h2></button>`;
            for (const singlemap of maplist_obj.maps) {
                menu += `<button data-load="${singlemap.file}" class="mode load"><h4>${singlemap.de}</h4></button>`;
            }
            $(".submenu_de .dynamic").html(menu);

            menu = `<button data-load="${maplist}" class="mode load"><h2>All</h2></button>`;
            for (const singlemap of maplist_obj.maps) {
                menu += `<button data-load="${singlemap.file}" class="mode load"><h3>${singlemap.en}</h3></button>`;
            }
            $(".submenu_en .dynamic").html(menu);
            showMessage("submenu");
        });
    });

    initWorld();
    registerWindowResizeHandler();
}

function extractMapFileNames(obj) {
    let fnames=[];
    for (const singlemap of obj) {
        fnames.push(singlemap.file);
    }
    return fnames;
}

$(document).ready(initGame);
