"use strict";

import {Vector, Position, notify} from './helper.js';
import {mapManager, partyPos, scene, setPartyPosition, getCameraDiff, modifyCamera} from './World.js';
import { startCombat, damage, select, playerDeath } from './combat.js';
import {showMessage, isCheatingEnabled, savegame, i18n, mouseTiltX} from './game.js';
import { Expression } from  './expression.js';
import { Quest } from "./quests.js";

export var directions = {
    0: new Vector(0, -1),
    1: new Vector(-1, 0),
    2: new Vector(0, 1),
    3: new Vector(1, 0),
    4: new Vector(0, -1),
    5: new Vector(-1, 0),
    6: new Vector(0, 1),
    7: new Vector(1, 0),
    8: new Vector(0, -1)
};

export var movement_blocking_token_types = ["obstacle", "switch", "quest", "message", "travel"];

export var mm=new Vector(-1, -1);
export var targetMob=-1;
export var onTop=0;
export var paused=true;
export var spectatorMode=false;
var regenerationLoop=null;

var keyBindings = {
    37: "turnLeft",
    81: "turnLeft",
    38: "stepForward",
    87: "stepForward",
    39: "turnRight",
    69: "turnRight",
    40: "stepBack",
    83: "stepBack",
    65: "stepLeft",
    68: "stepRight",
    32: "idle",
    49: "one",
    50: "two",
    51: "three",
    75: "kill",
    77: "math",
    27: "pause",
    85: "levelchange",
    13: "spectator",
    33: "camAsc",
    34: "camDesc",
    35: "removeFog",
    100: "camLeft",
    102: "camRight",
    104: "camUp",
    98: "camDown",
    111: "camForward",
    110: "camBackward"
}


export function registerKeyStrokes() {
    onTop=0;

    $(window).keydown(function(event) { 

        if (paused==true) {
            return;
        }

        // F5 = refresh. should not be blocked
        if (event.keyCode!=116) event.preventDefault(); 

        // actions in player perspective
        if (onTop==0) {
            if (keyBindings[event.keyCode]!=undefined) {
                if (Actions.hasOwnProperty(keyBindings[event.keyCode])) {
                    Actions[keyBindings[event.keyCode]]();
                } else {
                    console.error("cant call action '"+keyBindings[event.keyCode]+"' for keyCode #"+event.keyCode);
                }
            } else {
                console.log("no action configured for keyCode #"+event.keyCode);
            }
        }

    });

    // movement Arrows
    $("#movement_ui .plate.action").on("click", function () {
        let action=$(this).attr("data-id");
        console.log("action triggered, ", action);
        Actions[action]();
    });

    // catch event for teleport cheat
    $("body").on("move", (e, data) => {
        if (!isCheatingEnabled) {
            console.log("cheats not enabled");
            return;
        }    
        console.log("teleport", data);
        let newPos=new Position(data.x, data.y);

        if (mapManager.isFloor(newPos.apply(mm)) && checkMobPositionByPosition(-1, newPos.apply(mm))) {
            setPartyPosition(newPos);            
            checkTokenPosition(partyPos.apply(mm), true);
        } else {
            console.log("teleport failed", data);
        }

    });

    $("body").on("position", () => {
        console.log(partyPos, {direction:window.gamedata.direction});
    });

}

export function resetPlayerPosition() {
    console.log("world, resetPlayerPosition before", partyPos);
    setPartyPosition(mapManager.getCharPosition());
    for (var i=0;i<mapManager.getMobDataLength();i++) {
        if (mapManager.getMob(i).x==partyPos.x && mapManager.getMob(i).y==partyPos.y) {
            console.log("mob collision while resetting");
            mapManager.getMob(i).x=mapManager.getMob(i).x-1;
        }
    }    
    console.log("world, resetPlayerPosition after", partyPos);
}

export function activateRegenerationLoop(delay) {
    clearInterval(regenerationLoop);
    regenerationLoop=setInterval(() => { 
        if (targetMob<0 && window.gamedata.player.current_life>0 && paused==false) { // no combat & player alive
            if (parseInt(window.gamedata.player.current_life)<parseInt(window.gamedata.player.life)) {
                window.gamedata.player.current_life=parseInt(window.gamedata.player.current_life)+1;
            } else {
                //console.log("regenerate, player is at full health ", window.gamedata.player.current_life, window.gamedata.player.life);   
            }
            $(".player_life").attr("value", window.gamedata.player.current_life);            
        }
    }, delay);
}

function step(vector) { 
    if (paused) return;
    let cameraDiff = getCameraDiff();
    if (cameraDiff>1) return;
    let mobidx=getMobByPosition(partyPos.apply(mm).apply(vector));
    if (mobidx!=null) {
        let mob=mapManager.getMob(mobidx);
        if (mob.mode=="peaceful") {
            if (mob.quest != undefined && mapManager.quest == undefined) {
                rotateMobToPlayer(mobidx);
                mapManager.announceQuest(mob.quest, mobidx, null);
            } else if (mob.message!=undefined) {
                rotateMobToPlayer(mobidx);
                mapManager.showMobMessage(mob.message);
            }
        }
    } else
    if (mapManager.isFloor(partyPos.apply(mm).apply(vector))
        && checkMobPositionByPosition(-1, partyPos.apply(mm).apply(vector))
        && checkDoorOpen(partyPos.apply(mm).apply(vector))
    ) {
        let tokentype = checkTokenPosition(partyPos.apply(mm).apply(vector), true);
        if (movement_blocking_token_types.indexOf(tokentype)>=0) {
            console.log("obstacle blocking movement");
            return;
        }
        partyPos.add(vector);
    }
    checkPositionQuest(partyPos.x+"/"+partyPos.y);
    savegame.saveGameValue("position", {
        "x":partyPos.x,
        "y":partyPos.y,
        "dir":window.gamedata.player.direction
    });
}

function checkPositionQuest(coordinates) {
    if (mapManager.getQuest() == null) return;
    if (mapManager.getQuest().eventName != "position") return;
    if (mapManager.getQuest().eventFilter != coordinates) return;
    console.log("checkPositionQuest, position quest resolving.");
    $("body").trigger({ type:"position"});
}

// mob movement

function canMobWalk(mob, mobPos, i) {
    return mapManager.isFloor(mobPos.apply(directions[mob.rotation + 2]))
        && checkMobPositionByPosition(i, mobPos.apply(directions[mob.rotation + 2]))
        && checkTokenPosition(mobPos.apply(directions[mob.rotation + 2]), false) == null;
}

export function mobWalk() {
    //console.log("mobWald inactive. remove return statement.");
    //return;
    let free_will=0;

    for (let i=0;i<mapManager.getMobDataLength();i++) {
        let mob=mapManager.getMob(i);
        let mobPos=new Position(mob.x, mob.y);

        if (mob.movement != undefined && mob.movement=="none") continue;

        if (mob.rotation>3) mob.rotation=0;
        if (mob.rotation<0) mob.rotation=3;

        if (mob.movement != undefined && mob.movement=="aggressive") {
            if (canMobWalk(mob, mobPos, i)) {
                if (getDistance(mobPos)>getDistance(mobPos.apply(directions[mob.rotation+2]))) {
                    [mob.x, mob.y] = mobPos.apply(directions[mob.rotation + 2]).asArray();
                    continue;
                }
            }
            if (getDistance(mobPos)>getDistance(mobPos.apply(directions[mob.rotation+1]))) {
                mob.rotation--;
                if (mob.rotation<0) mob.rotation=3;
            } else if (getDistance(mobPos)>getDistance(mobPos.apply(directions[mob.rotation+3]))) {
                mob.rotation++;
                if (mob.rotation>3) mob.rotation=0;
            }
            checkCombat();
            continue;
        }

        // default movement or undefined
        free_will=Math.floor(Math.random()*6);
        if (free_will<4) {
            // move forward


            // todo: verify that token position check works
            if (canMobWalk(mob, mobPos, i)) {
                [mob.x, mob.y]=mobPos.apply(directions[mob.rotation+2]).asArray();
            } else rotateLeftOrRight(mob); 
        }
        if (free_will==4) {
            // turn right
            mob.rotation--;
            if (mob.rotation<0) mob.rotation=3;
        }        
        if (free_will==5) {
            // turn left
            mob.rotation++;
            if (mob.rotation>3) mob.rotation=0;
        }
    }
    checkCombat();
}

function checkCombat() {
    for (var i=0;i<mapManager.getMobDataLength();i++) {
        if (mapManager.getMob(i).mode!=undefined && mapManager.getMob(i).mode=="peaceful") {
            continue;
        }
        if (partyPos.apply(mm).apply(directions[0]).equals(mapManager.getMob(i))) {
            targetMob=i;
            console.log("mob "+i+" on 0", window.gamedata.direction+2);
            console.log(mapManager.getMob(i));
            window.gamedata.direction=2;
            updateCompass();
            mapManager.getMob(i).rotation=0;
            startCombat();
            return;
        }
        if (partyPos.apply(mm).apply(directions[1]).equals(mapManager.getMob(i))) {
            targetMob=i;
            console.log("mob "+i+" on 1", window.gamedata.direction+2);
            console.log(mapManager.getMob(i));
            window.gamedata.direction=3;
            updateCompass();
            mapManager.getMob(i).rotation=1;
            startCombat();
            return;
        }
        if (partyPos.apply(mm).apply(directions[2]).equals(mapManager.getMob(i))) {
            targetMob=i;
            console.log("mob "+i+" on 2", window.gamedata.direction+2);
            console.log(mapManager.getMob(i));
            window.gamedata.direction=4;
            updateCompass();
            mapManager.getMob(i).rotation=2;
            startCombat();
            return;
        }
        if (partyPos.apply(mm).apply(directions[3]).equals(mapManager.getMob(i))) {
            targetMob=i;
            console.log("mob "+i+" on 3", window.gamedata.direction+2);
            console.log(mapManager.getMob(i));
            window.gamedata.direction=5;
            updateCompass();
            mapManager.getMob(i).rotation=3;
            startCombat();
            return;
        }        
    }
    // die
    // scene.remove(mapManager.getMob(i).object);
}

function rotateMobToPlayer(idx) {
    if (partyPos.apply(mm).apply(directions[0]).equals(mapManager.getMob(idx))) {
        mapManager.getMob(idx).rotation=0;
    }
    if (partyPos.apply(mm).apply(directions[1]).equals(mapManager.getMob(idx))) {
        mapManager.getMob(idx).rotation=1;
    }
    if (partyPos.apply(mm).apply(directions[2]).equals(mapManager.getMob(idx))) {
        mapManager.getMob(idx).rotation=2;
    }
    if (partyPos.apply(mm).apply(directions[3]).equals(mapManager.getMob(idx))) {
        mapManager.getMob(idx).rotation=3;
    }
}

function rotateLeftOrRight(mob) {
    if (Math.floor(Math.random()*2)>1) mob.rotation--; else mob.rotation++;
    if (mob.rotation>3) mob.rotation=0;
    if (mob.rotation<0) mob.rotation=3;
}

function getDistance(mob) {
    let dist=Math.abs(mob.x-partyPos.x+1)+Math.abs(mob.y-partyPos.y+1);
    console.log("getDistance", mob, partyPos, dist);
    return dist;
}

function checkMobPosition(idx, x, y) {
    return checkMobPositionByPosition(idx, new Position(x, y));
}

// check for collision; false = idx cant go there
function checkMobPositionByPosition(idx, position) {
    for (var i=0;i<mapManager.getMobDataLength();i++) {
        if (i!=idx && mapManager.getMob(i).x==position.x && mapManager.getMob(i).y==position.y) return false;
    }
    if (idx!=-1 && partyPos.x-1==position.x && partyPos.y-1==position.y) return false;
    return true;
}

function getMobByPosition(position) {
    for (let i=0;i<mapManager.getMobDataLength();i++) {
        if (mapManager.getMob(i).x==position.x && mapManager.getMob(i).y==position.y) return i;
    }
    return null;
}

function checkTokenPosition(position, trigger) {
    for (let i=0;i<mapManager.getTokenDataLength();i++) {
        let token=mapManager.getTokenData()[i];
        if (token.x==position.x && token.y==position.y) {
            if (trigger==true) {
                if (token.action==undefined || token.action.type==undefined || token.action.type=="pick") {
                    pickToken(token, i);
                } else
                if (token.action.type=="travel") {
                    if (token.action.map==undefined) {
                        console.log("checkTokenPosition, travel to ", parseInt(token.action.x), parseInt(token.action.y));
                        setPartyPosition(new Position(parseInt(token.action.x), parseInt(token.action.y)));
                        // TODO: adjust all maps to be +1/+1 so token.x can equal token.action.x
                        //setPartyPosition(new Position(parseInt(token.action.x)+1, parseInt(token.action.y)+1));
                    } else {
                        // map change
                        mapManager.disposeMobs();
                        mapManager.loadMapWithPosition(token.action.map, { x:token.action.x, y:token.action.y, dir:token.action.direction});
                    }
                } else
                if (token.action.type=="message") {
                    mapManager.showMobMessage(token.action.message);
                } else
                if (token.action.type=="quest") {
                    mapManager.announceQuest(token.action.quest, null, i);
                } else
                if (token.action.type=="switch") {
                    mapManager.showSwitchDialog(token.action);
                }
                // no action for obstacle
            }
            return (token.action==undefined || token.action.type==undefined)?"pick":token.action.type;
        }
    }
    return null;
}

// checks if a closed or open door is at the position
function checkDoorOpen(position) {
    for (let i=0;i<mapManager.getTokenDataLength();i++) {
        let token=mapManager.getTokenData()[i];
        if (token.x==position.x && token.y==position.y) {
            if (token.action==undefined || token.action.type==undefined) return true;
            if (token.action.type=="door") {
                return evaluateDoorState(token.action.keyname, compileSwitchStates());
            }
            return true; // is no door
        }
    }
    return true; // no token at position
}

function compileSwitchStates() {
    let states={};
    console.log("compileSwitchStates, entering");
    for (let i=0;i<mapManager.getTokenDataLength();i++) {
        let token=mapManager.getTokenData()[i];
        if (token.action==undefined || token.action.type==undefined) continue;
        if (token.action.keyname==undefined) continue;
        if (["switch", "pick"].indexOf(token.action.type)>=0) {
            states[token.action.keyname] = mapManager.loadSwitchState(token.action.keyname);
        }
    }
    console.log("compileSwitchStates, returning ", states);
    return states;
}

function evaluateDoorState(keyname, states) {
    let state = (new Expression(keyname).solveAll(states).getValue());
    console.log("evaluateDoorState, solving to ", state);
    return state=="1";
}

export function evaluateInitialDoorStates(token) {
    if (token.action==undefined) return;
    let state=evaluateDoorState(token.action.keyname, compileSwitchStates());
    if (state) {
        console.log("evaluateInitialDoorStates, opening", token);
        token.open.play();
        token.close.stop();
    } else {
        console.log("evaluateInitialDoorStates, closing", token);
        token.close.play();
        token.open.stop();
    }

}

export function evaluateDoorStates(changedVarName) {
    let states=compileSwitchStates();
    for (let i=0;i<mapManager.getTokenDataLength();i++) {
        let token=mapManager.getTokenData()[i];
        if (token.action===undefined) continue;
        if (token.action.type===undefined || token.action.type!="door") continue;
        if (token.action.keyname===undefined) continue;
        if (changedVarName!=undefined && !token.action.keyname.includes(changedVarName)) continue;

        // create expression for token.action.keyname evaluate with switchStates
        let state=evaluateDoorState(token.action.keyname, states);
        if (state) {
            console.log("evaluateDoorStates, opening", i);
            window.gamedata.mapManager.getTokenData()[i].open.play();
            window.gamedata.mapManager.getTokenData()[i].close.stop();
        } else {
            console.log("evaluateDoorStates, closing", i);
            window.gamedata.mapManager.getTokenData()[i].close.play();
            window.gamedata.mapManager.getTokenData()[i].open.stop();
        }
    }
}

function pickToken(tok, i) {
    console.log("pickToken", tok.object, i, window.gamedata.objectIndex[tok.id].name);
    let objectname = window.gamedata.objectIndex[tok.id][window.gamedata.language];
    if (objectname == undefined) {
        console.log("pickToken, notification name undefined", window.gamedata.objectIndex[tok.id], window.gamedata.language);
    } else {
        notify(objectname + " " + i18n("found"));
    }
    $("body").trigger({ type:"token", filter:tok.id });
    if (tok?.action?.keyname!=undefined) {
        mapManager.openSwitchDialog=tok.action.keyname;
        mapManager.saveSwitchState(1);
    }
    scene.remove(tok.object);
    mapManager.removeToken(i);   
}

export function resetTargetMob() {
    targetMob=-1;
}

export function setPaused(val) {
    console.log("setPaused, set to ", val);
    paused=val;
}

export function updateCompass() {
    switch (window.gamedata.direction%4) {
        case 0:
            $("#compass_ui").html(i18n("south"));
            break;
        case 1:
            $("#compass_ui").html(i18n("east"));
            break;
        case 2:
            $("#compass_ui").html(i18n("north"));
            break;
        case 3:
            $("#compass_ui").html(i18n("west"));
            break;
    }
}

//
// static Methods for Party Actions
//

class Actions {
    static stepForward() {
        if (targetMob>-1) return;
        step(directions[window.gamedata.direction+2]);
        //mobWalk();
        checkCombat();      
    }

    static stepLeft() {
        if (targetMob>-1) return;
        step(directions[window.gamedata.direction+3]);
        //mobWalk();
        checkCombat();        
    }    

    static stepRight() {
        if (targetMob>-1) return;
        step(directions[window.gamedata.direction+1]);
        //mobWalk();
        checkCombat();      
    }      

    static stepBack() {
        if (targetMob>-1) return;
        step(directions[window.gamedata.direction]);
        //mobWalk();
        checkCombat();        
    }

    static turnLeft() {
        if (paused) return;
        if (targetMob>-1) return;
        window.gamedata.direction+=1;        
        window.gamedata.direction=window.gamedata.direction%4;
        updateCompass();
        //mobWalk();
        checkCombat();
    }

    static turnRight() {
        if (paused) return;
        if (targetMob>-1) return;
        window.gamedata.direction+=3;        
        window.gamedata.direction=window.gamedata.direction%4;
        updateCompass();
        //mobWalk();
        checkCombat();
    }

    static hit() {
        if (targetMob>-1) {
            damage(1);
        }        
    }

    static kill() {
        if (isCheatingEnabled==false) return;
        $("body").trigger("forceEndCombat");     
    }

    static resetPlayer() {
        playerDeath();
    }

    static pause() {
        if (paused) {
            console.log("game is active");
            $(".message").hide();
            $(".language_ui").hide();
            $("#combat_ui").show();
            if (targetMob>-1) {
                
            } else {
                $("#movement_ui").show();
            }
            $("#quest_ui").show();
            $("#difficulty_ui").show();            
            paused=false;
        } else {
            console.log("game is paused");
            if (mapManager.getQuest()!=undefined && mapManager.getQuest().isComplete()) {
                showMessage("success_message");
            } else {
                showMessage("pause_message");
            }
            paused=true;
        }
    }

    static one() { select(1); }
    static two() { select(2); }
    static three() { select(3); }

    static levelchange() {
        $("body").trigger({ type:"quest_complete" });
    }

    static spell() {
        $("body").trigger({ type:"spell" });
    }

    static idle() {
        if (paused) return;
        mobWalk();        
        checkCombat();
    }

    static removeFog() {
        if (spectatorMode) $("body").trigger("removeFog");
    }

    static spectator() {
        spectatorMode=!spectatorMode;
        if (spectatorMode) {
            $("#difficulty_ui").hide();
            $("#quest_ui").hide();
            $("#combat_ui").hide();
            $("#movement_ui").hide();
        } else {
            $("#difficulty_ui").show();
            $("#quest_ui").show();
            $("#combat_ui").show();
            $("#movement_ui").show();
        }
    }

    static camAsc() {
        modifyCamera("ascend");
    }

    static camDesc() {
        modifyCamera("descend");
    }

    static camLeft() {
        modifyCamera("left");
    }

    static camRight() {
        modifyCamera("right");
    }

    static camUp() {
        modifyCamera("up");
    }

    static camDown() {
        modifyCamera("down");
    }

    static camForward() {
        modifyCamera("forward");
    }

    static camBackward() {
        modifyCamera("backward");
    }
}