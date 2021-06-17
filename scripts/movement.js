"use strict";

import { Vector, Position } from './helper.js';
import { mapManager, partyPos, scene, setPartyPosition, getCameraDiff } from './World.js';
import { startCombat, damage, select, playerDeath } from './combat.js';
import { showMessage } from './game.js';

var directions = {
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

export var mm=new Vector(-1, -1);
export var targetMob=-1;
export var onTop=0;
export var paused=true;
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
    163: "showMap",
    49: "one",
    50: "two",
    51: "three",
    77: "math",
    27: "pause",
    85: "levelchange"
}
//     32: "resetPlayer"

export function registerKeyStrokes() {
    onTop=0;

    $(window).keydown(function(event) { 

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

        // go to player perspective
        if (event.keyCode==171) { 
            Actions.showEgoPerspective();
        }
    });

    // movement Arrows
    $("#movement_ui .plate.action").on("click", function () {
        let action=$(this).attr("data-id");
        console.log("action triggered, ", action);
        Actions[action]();
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

            //console.log("regenerate");   
            if (parseInt(window.gamedata.player.current_life)<parseInt(window.gamedata.player.life)) {
                window.gamedata.player.current_life=parseInt(window.gamedata.player.current_life)+1;
                //console.log("regenerate, "+window.gamedata.player.current_life);
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
    console.log("cameraDiff, ", cameraDiff);
    if (cameraDiff>1) return;
    if (mapManager.isFloor(partyPos.apply(mm).apply(vector)) && checkMobPositionByPosition(-1, partyPos.apply(mm).apply(vector))) {
        partyPos.add(vector);
        checkTokenPosition(partyPos.apply(mm), true);
    }
}

// mob movement

export function mobWalk() {
    //console.log("mobWald inactive. remove return statement.");
    //return;
    var free_will=0;

    for (var i=0;i<mapManager.getMobDataLength();i++) {
        free_will=Math.floor(Math.random()*6);
        var mob=mapManager.getMob(i);

        if (mob.movement != undefined && mob.movement=="none") continue;
        
        if (mob.rotation>3) mob.rotation=0;
        if (mob.rotation<0) mob.rotation=3;        
        
        if (free_will<4) {
            // move forward
            var mobPos=new Position(mob.x, mob.y);

            // todo: verify that token position check works
            if (mapManager.isFloor(mobPos.apply(directions[mob.rotation+2])) 
                && checkMobPositionByPosition(i, mobPos.apply(directions[mob.rotation+2]))
                && checkTokenPosition(mobPos.apply(directions[mob.rotation+2]), false)==false
                ) {
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
        if (partyPos.apply(mm).apply(directions[0]).equals(mapManager.getMob(i))) {
            targetMob=i;
            console.log("mob "+i+" on 0", window.gamedata.direction+2);
            console.log(mapManager.getMob(i));
            window.gamedata.direction=2;
            mapManager.getMob(i).rotation=0;
            startCombat();
            return;
        }
        if (partyPos.apply(mm).apply(directions[1]).equals(mapManager.getMob(i))) {
            targetMob=i;
            console.log("mob "+i+" on 1", window.gamedata.direction+2);
            console.log(mapManager.getMob(i));
            window.gamedata.direction=3;
            mapManager.getMob(i).rotation=1;
            startCombat();
            return;
        }
        if (partyPos.apply(mm).apply(directions[2]).equals(mapManager.getMob(i))) {
            targetMob=i;
            console.log("mob "+i+" on 2", window.gamedata.direction+2);
            console.log(mapManager.getMob(i));
            window.gamedata.direction=4;
            mapManager.getMob(i).rotation=2;
            startCombat();
            return;
        }
        if (partyPos.apply(mm).apply(directions[3]).equals(mapManager.getMob(i))) {
            targetMob=i;
            console.log("mob "+i+" on 3", window.gamedata.direction+2);
            console.log(mapManager.getMob(i));
            window.gamedata.direction=5;
            mapManager.getMob(i).rotation=3;
            startCombat();
            return;
        }        
    }
    // die
    // scene.remove(mapManager.getMob(i).object);
}

function rotateLeftOrRight(mob) {
    if (Math.floor(Math.random()*2)>1) mob.rotation--; else mob.rotation++;
    if (mob.rotation>3) mob.rotation=0;
    if (mob.rotation<0) mob.rotation=3;
}

function checkMobPosition(idx, x, y) {
    return checkMobPositionByPosition(idx, new Position(x, y));
}

function checkMobPositionByPosition(idx, position) {
    for (var i=0;i<mapManager.getMobDataLength();i++) {
        if (i!=idx && mapManager.getMob(i).x==position.x && mapManager.getMob(i).y==position.y) return false;
    }
    if (idx!=-1 && partyPos.x-1==position.x && partyPos.y-1==position.y) return false;
    return true;
}

function checkTokenPosition(position, trigger) {
    for (var i=0;i<mapManager.getTokenDataLength();i++) {
        let token=mapManager.getTokenData()[i];
        if (token.x==position.x && token.y==position.y) {
            if (trigger==true) {
                pickToken(token.object, i);
            }
            return true;
        }
    }
    return false;
}

function pickToken(obj, i) {
    console.log("pickToken");
    $("body").trigger({ type:"token" });
    scene.remove(obj);
    mapManager.removeToken(i);   
}

export function resetTargetMob() {
    targetMob=-1;
}

export function setPaused(val) {
    paused=val;
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
        //mobWalk();
        checkCombat();
    }

    static turnRight() {
        if (paused) return;
        if (targetMob>-1) return;
        window.gamedata.direction+=3;        
        window.gamedata.direction=window.gamedata.direction%4;
        //mobWalk();
        checkCombat();
    }

    static hit() {
        if (targetMob>-1) {
            damage(1);
        }        
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
            if (mapManager.getQuest().isComplete()) {
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

    static idle() {
        if (paused) return;
        mobWalk();        
        checkCombat();
    }

    static showMap() {
        camera.rotation.x=-1.5;
        camera.rotation.y=0;
        camera.position.y=29;
        camera.position.z=17;
        camera.position.x=15;

        if (onTop==0) {
            light_all = new THREE.AmbientLight( 0x888888 ); // soft white light
            light_all.intensity=3;
            scene.add( light_all );
            onTop=1;
        }                
    }

    static showEgoPerspective() {
        rad=90 * Math.PI / 180; 
        camera.rotation.y=window.gamedata.direction*rad+rotationoffset;
        camera.rotation.x=0;
        scene.remove(light_all);

        camera.position.x=partyPos.x-1;
        camera.position.z=partyPos.y-1;
        camera.position.y=1.58; 

        if (onTop==1) {
            scene.remove( light_all );
            onTop=0;
        }
    }

}