"use strict";
import { render, initWorld, registerWindowResizeHandler, mapManager } from './World.js';
import { registerKeyStrokes, activateRegenerationLoop, mobWalk, targetMob, paused, setPaused } from './movement.js';
import { RandomMath } from './Math.js';
import { suffer } from './combat.js';
import { Statistic } from './statistics.js';
import { initAnimations } from './combatAnimations.js';

var geometry;
var light_all;
var sphere;
var delta;
var rotationdirection;
var cubemesh;
var loader;
var mathLoader;
var sufferTime;
var walkerTime;
var world;
var statistics;
var maptransfer;
export var isCheatingEnabled;
export var isNoDamageEnabled;

export function getLanguage() {
    let lang=navigator.language.substring(0, 2);;
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
    }
}

function initGame() {
    maptransfer = new BroadcastChannel('maptransfer');
    mathLoader = new RandomMath();
    statistics = new Statistic();
    initModelAndScene();     
    registerKeyStrokes();
    initAnimations();
    render(); // start render loop
}

function initModelAndScene() {
    window.gamedata={};
    window.gamedata.statistics=statistics;

    window.gamedata.language=getLanguage();
    $(".language_ui button.language_"+window.gamedata.language).addClass("active");
    
    isCheatingEnabled=false;

    window.gamedata.direction=3;
    window.gamedata.lastMobId=0;
    window.gamedata.difficulty="1";

    window.gamedata.canvas={};
    window.gamedata.camera={};
    window.gamedata.camera.deltaX=0;
    window.gamedata.camera.deltaY=0;
    window.gamedata.camera.deltaZ=1.58;      

    window.gamedata.player={};
    window.gamedata.player.life=10;
    window.gamedata.player.current_life=10;

    window.gamedata.currentmap=0;
    window.gamedata.maps=[
        //"m2021-04-17.map.json",  
        //"test-short.map.json",
        "m2021-06-26.map.json",
        "m2021-05-22.map.json",
        "m2021-06-03.map.json",
        "m2021-01-30.map.json",
        "m2021-03-08.map.json",
        "m2021-03-09.map.json",
        "m2021-02-19.map.json"
    ];

    activateRegenerationLoop(1000);  
    clearInterval(sufferTime);
    clearInterval(walkerTime);
    sufferTime=setInterval(() => {
        if (!paused) suffer();
    }, 5000); 
    walkerTime=setInterval(() => {
        if (targetMob<0 && paused==false) {
            mobWalk();
        }
    }, 1500); 

    showMessage("startup_message");
    $(".startup_navigation").hide();
    $("#quest_complete_de").hide();
    $("#quest_complete_en").hide();
    $(".message button").off("click");
    $(".language_ui button").on("click", function () {
        window.gamedata.language=$(this).attr("data-lang");
        $(".language_ui button").removeClass("active");
        $(this).addClass("active");
        mapManager.changeLanguage(window.gamedata.language);
        
        if (mapManager.getQuest().isComplete()) {
            $(".statistic_summary").html(window.gamedata.statistics.getSummaryHtml());
            showMessage("success_message");
        } else {
            showMessage("startup_message");
        }
    });
    $(".message button").on("click", function () {
        let did=$(this).attr("data-id");

        if (did==undefined || did=="") {
            console.log("messages closed. starting/resuming game.");
            if ($(this).attr("data-difficulty")!=undefined && !isNaN($(this).attr("data-difficulty"))) {
                window.gamedata.difficulty=$(this).attr("data-difficulty");//parseInt($(".startup_message_"+window.gamedata.language+" .startup_difficulty").val());
            }
            if (isNaN(window.gamedata.difficulty)) {
                console.log("no valid difficulty value. setting override value=1");
                window.gamedata.difficulty="1";
            }
            console.log("setting difficulty to "+window.gamedata.difficulty);
            $("#difficulty_ui").html(i18n("difficulty")+window.gamedata.difficulty);
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
        } else {
            console.log("showing, ."+did);

            if (mapManager.getQuest().isComplete()) {
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
    $("body").on("enableCheats", function () {
        isCheatingEnabled=true;
    });
    $("body").on("noDamage", function () {
        isNoDamageEnabled=true;
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
            mapManager.quest.dispose();
            mapManager.loadMapFromData(evt.target.result);
        }
        reader.readAsText(file);
    });
    maptransfer.onmessage=function (ev) { 
        console.log("receiving map from editor ...", ev.data.type);
        console.log(ev.data);

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

    initWorld();
    registerWindowResizeHandler();
}

$(document).ready(initGame);
