"use strict";

import { mapManager, scene } from './World.js';
import { targetMob, resetTargetMob, paused, setPaused, resetPlayerPosition } from './movement.js';
import {showMessage, isNoDamageEnabled, i18n} from './game.js';
import {notify} from "./helper.js";

export function startCombat() {
    let m=mapManager.getMob(targetMob);
    console.log("startCombat, combat started with ", m);
    console.log("startCombat, targetMob is ", targetMob);
    notify(i18n("combat_begins"));
    if (m.current_life==undefined) m.current_life=m.life;

    $(".mob_life").attr("max", m.life);
    $(".mob_life").attr("value", m.current_life);
    $(".mob_life").fadeIn();
    $("#mob_life")[0].updateContent();

    $("#movement_ui").hide();

    $("body").on("mistake", mistake);
    $("body").on("correct", correct);
    $("body").on("forceEndCombat", forceEndCombat);

    setTimeout(() => {
        trigger_stageLoaded();
    }, 1000);
}

function trigger_stageLoaded() {
    $("body").trigger({ type:"stageLoaded", var: { type:"math_add", stage:[{ "type":"math_add", "limit": window.gamedata.difficulty }] }});
}

function mistake() {
    console.log("mistake, suffer");
    suffer();    
}

function correct() {
    console.log("correct, do damage");
    damage(1);
}

function forceEndCombat() {
    if (targetMob<0) return;
    let m=mapManager.getMob(targetMob);
    damage(m.current_life);
}

export function playerDeath() {
    console.log("playerDeath, resetting player");
    $("body").trigger({ type:"playerDeath"});
    window.gamedata.direction=3;
    window.gamedata.lastMobId=0;
    window.gamedata.player.current_life=window.gamedata.player.life;
    resetPlayerPosition();
    $("#main").html("");
    $("body").off("mistake");
    $("body").off("correct");
    resetTargetMob(); 
    $(".player_life").attr("value", window.gamedata.player.current_life);

    setPaused(true);
    showMessage("death_message");
    $(".mob_life").fadeOut();
    $("#movement_ui").show();
}

export function endCombat(m) {
    document.getElementById("mob_life").value=0;
    console.log("damage, mob dies ", m); 
    m.current_life=0;
    console.log("endCombat, combat ended with ", window.gamedata.objectIndex[m.id].name);
    $("body").trigger({ type:"winCombat"});
    $("body").trigger({ type:"kill", filter:m.id, var: { mob: window.gamedata.objectIndex[m.id].name }});
    $(".mob_life").fadeOut();
    $("#movement_ui").show();
    $("#main").html("");
    $("#main").hide();
    notify(i18n("combat_ends"));
    prepareFadeOut(m.object.skin);
    setTimeout(() => {
        $("#main").html("");
        console.log("damage, mob dies and is removed", m);
        scene.remove(m.object);
        mapManager.removeMob(targetMob);
        resetTargetMob();
        $("body").off("mistake", mistake);
        $("body").off("correct", correct);
        $("#main").show();
    }, 1200);
}

function prepareFadeOut(skin) {
    skin.transparent = true;
    skin.opacity = 1;
}

export function damage(dmg) {
    let m=mapManager.getMob(targetMob);
    if (m==undefined) {
        console.log("damage, cant find mob ", targetMob);
        return;
    }
    console.log("damage for, ", m, dmg);   
    m.current_life=parseInt(m.current_life)-parseInt(dmg);
    $("body").trigger({ type:"damage" });
    $("body").trigger({ type:"spell" });
    if (m.current_life<1 || m.current_life==undefined) {
        endCombat(m);
        return;   
    }

    $(".mob_life").attr("value", m.current_life);    
}

export function suffer(dmg) {
    if (isNoDamageEnabled) return;
    if (targetMob<0) return;
	if (dmg==undefined) dmg=1;
    // if ($("#main").html().trim()=="") {
    //     console.warn("suffer, combat caught in error state. trying to recover.");
    //     trigger_stageLoaded();
    //     return;
    // }

    console.log("suffer for, ", dmg);  	
    $("body").trigger({ type:"suffer" });
    console.log("suffer, ", mapManager.getMob(targetMob), targetMob);
    let m=mapManager.getMob(targetMob)?.attack?.reset().play();

    window.gamedata.player.current_life=parseInt(window.gamedata.player.current_life)-parseInt(dmg);
    if (window.gamedata.player.current_life<1) window.gamedata.player.current_life=0;
	console.log("suffer, player current life is ", window.gamedata.player.current_life); 
    $(".player_life").attr("value", window.gamedata.player.current_life);
    if (window.gamedata.player.current_life<1) {
        playerDeath();
    }
}

export function select(val) {
    if (paused) return;
	console.log("select, ", val);
    $(".choice").eq(val-1).click();
}
