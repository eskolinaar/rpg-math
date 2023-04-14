// noinspection EqualityComparisonWithCoercionJS

"use strict";

import {parseJSON, Position } from './helper.js';
import { MapManager } from './MapManager.js';
import {
    onTop,
    setPaused,
    directions,
    reevaluateCurrentDoorState,
    spectatorMode
} from './movement.js';
import { i18n, showMessage, mouseTiltX } from './game.js';
import {heal} from "./combat.js";
import {Resize} from "./resize.js";
// import { Water } from './Water2.js';

export var partyPos;
export var damageLight;
export var mapManager;
export var scene;
export var delta;
var cr;
var wr;
var mob;
var diff;
var loader;
var objidx;
var mesh;
var clock;
var camera;
var rad;
var rad4;
var rotationoffset;
var rotationspeed;
var partylight;
var ambientlight;
var diff_dir;
var renderer;
var meshQueue;
var speed;
var mobspeed;
var plane;
var textureLoader;
var water;
var Water_1_M_Normal;
var Water_2_M_Normal;
let spellEffect=null;
let tokenObj=null;
let dummy;
let mouseTiltFactor;
var canvas_emptyheight;
var resizer;

export function initWorld() {
    partyPos=new Position(17, 13);
    clock = new THREE.Clock();

    rotationspeed=4;
    speed=4;
    mobspeed=1;

    partylight = new THREE.PointLight( 0xaaaaaa, 2.5 * getBrightness(), 7 ); // soft white partylight
    partylight.position.x=partyPos.x-1;
    partylight.position.z=partyPos.y-1;
    partylight.position.y=2.3;

    rad=(90 * Math.PI / 180);
    rad4=2 * Math.PI;
    rotationoffset=Math.PI;

    mouseTiltFactor=(Math.PI);

    ambientlight = new THREE.AmbientLight( 0x444444, 5 * getBrightness() );

    damageLight = new THREE.AmbientLight( 0xaa0000, 0 );

    $("body").off("quest_complete");
    $("body").on("quest_complete", questComplete);

    $("body").off("quest_clear");
    $("body").on("quest_clear", questClear);

    $("body").off("respawn");
    $("body").on("respawn", respawn);

    $("body").off("spell");
    $("body").on("spell", spell);

    $("body").off("spawnMob");
    $("body").on("spawnMob", (ev, mob) => { spawnMob(mob); });   

    $("body").off("removeFog");
    $("body").on("removeFog", () => { scene.fog=undefined;  });

    $("body").off("teleport");
    $("body").on("teleport", () => { resetCameraPosition(); });

    $("body").off("heal");
    $("body").on("heal", () => { heal(); });

    $("body").off("updateSettings");
    $("body").on("updateSettings", () => { updateSettings(); });

    $("body").off("alarm");
    $("body").on("alarm", (ev, filter) => { alarm(filter); });

    $("body").off("movement");
    $("body").on("movement", (ev, filter) => { triggerMovementWaypoint(filter); });


    // scene.remove(m.object);

    if (window.location.hash=="#bc_map") {
        window.location.hash="";
        mapManager=new MapManager();
        console.log("checking for map editor map");
        $("body").trigger({ type:"checkMapEditor" });
    } else if (window.location.hash.startsWith("#map=")) {
        let mapname=window.location.hash.substring(5);
        console.log("loading directly linked map", mapname);
        window.location.hash="";
        mapManager=new MapManager();
        mapManager.loadMap(mapname);
        showMessage("startup_message");
        console.log("debug camera rotation, ", window.gamedata.direction);
    } else if (mapManager==undefined || mapManager==null) {
        mapManager=new MapManager();
        window.gamedata.mapManager=mapManager;
    } else {
        mapManager.loadMap(window.gamedata.maps[window.gamedata.currentmap]);
    }
}

function getBrightness() {
    return parseInt($(".brightness_multiplicator").eq(0).val());
}

function updateSettings() {
    partylight.intensity = 2.5 * getBrightness();
    ambientlight.intensity = 5 * getBrightness();
    mapManager.updateFog();
    scene.fog = mapManager.getMapFog();
}

export function loadTexturesAndMaterials(data) {
    if (data==undefined) {
        console.log("not loading objectIndex as its already loaded");
    } else {
        var data_obj=parseJSON(data);
        window.gamedata.objectIndex=data_obj;
    }

    loader = new THREE.GLTFLoader().setPath( 'objects/models/' );
    meshQueue=[];
    for (let i in window.gamedata.objectIndex) {
        if (!window.gamedata.objectIndex.hasOwnProperty(i)) {
            continue;
        }
        if (!mapManager.needsObject(i)) {
            // skip loading if not needed in current map
            continue;
        }
        if (window.gamedata.objectIndex[i].mesh_!=undefined) {
            // skip if already loaded (maybe on another map)
            continue;   
        }
        meshQueue.push(i);        
    }

    loadSky();
    $(".startup_progress").html("<p>"+i18n("loading")+" "+meshQueue.length+" "+i18n("files")+"</p>");

    console.log(meshQueue);
    if (meshQueue.length>0) loadMeshObject(meshQueue[0]); else createScene();
}

function loadSky() {
    let skyloader = new THREE.TextureLoader();
    skyloader.load(
        "objects/sky.png",
        texture => {
            let objGeometry = new THREE.SphereBufferGeometry(60, 20, 20);
            let objMaterial = new THREE.MeshPhongMaterial({
              map: texture,
              shading: THREE.FlatShading,
              side: THREE.BackSide
            });
            scene.add(new THREE.Mesh(objGeometry, objMaterial));
        },
        undefined,
        error => {
            console.log("Error loading sky " + error);
        }
    );     
}

export function registerWindowResizeHandler() {
    $(window).on("resize", () => {

        let canvas_width=window.innerWidth;
        let canvas_height=window.innerHeight;

        if (window.innerHeight>window.innerWidth*0.8) {
            canvas_height=window.innerWidth*0.8;
            canvas_emptyheight=window.innerHeight-canvas_height;
            if (!$("body").hasClass("mobile")) {
                $("body").addClass("mobile");
            }
        } else {
            canvas_emptyheight=0;
            if ($("body").hasClass("mobile")) {
                $("body").removeClass("mobile");
            }
        }

        camera.aspect = canvas_width / canvas_height;
        camera.updateProjectionMatrix();

        renderer.setSize( canvas_width, canvas_height );
    });
}

export function onMapLoaded() {
    partyPos=mapManager.getCharPosition();

    let canvas_width=window.innerWidth;
    let canvas_height=window.innerHeight;

    if (window.innerHeight>window.innerWidth*0.8) {
        canvas_height=window.innerWidth*0.8;
        canvas_emptyheight=window.innerHeight-canvas_height;
        if (!$("body").hasClass("mobile")) {
            $("body").addClass("mobile");
        }
    } else {
        canvas_emptyheight=0;
        if ($("body").hasClass("mobile")) {
            $("body").removeClass("mobile");
        }
    }

    camera = new THREE.PerspectiveCamera( 60, (canvas_width)/canvas_height, 0.05, 1000 );
    camera.position.x=partyPos.x+window.gamedata.camera.deltaX-1;
    camera.position.z=partyPos.y+window.gamedata.camera.deltaY-1;
    camera.position.y=window.gamedata.camera.deltaZ; 
    camera.rotation.y=(window.gamedata.direction)*rad+rotationoffset;
    window.gamedata.worldcam=camera;

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({
        canvas : (document.getElementById("three_outputcanvas"))
    });
    renderer.setSize(canvas_width, canvas_height);
    document.body.appendChild( renderer.domElement );

    $("#player_life")[0].max=window.gamedata.player.life;
    $("#player_life")[0].value=window.gamedata.player.current_life;
    if (window.gamedata.objectIndex==undefined) {
        $.get("objects/objectIndex.json", loadTexturesAndMaterials);
    } else {
        loadTexturesAndMaterials();
    }
}

function respawn(e) {
    if (scene == undefined) return;
    console.log("respawn", e);
    if (e.subtype == "token") {
        for (var t=0;t<mapManager.getTokenData().length;t++) {
            scene.remove(mapManager.getTokenData()[t].object);
        }
        mapManager.resetTokenData();
        spawnAllMapToken();
    }
    if (e.subtype == "kill") {
        for (var t=0;t<mapManager.getMobData().length;t++) {
            scene.remove(mapManager.getMobData()[t].object);
        }
        mapManager.resetMobData();
        spawnAllMapMobs();
    }
}

function alarm(filter) {
    if (filter==undefined) {
        mapManager.getMobData().forEach((mob, idx) => {
            mob.mode = "";
            mob.movement = "aggressive";
        });
        return;
    }
    let targets=filter.split(",");
    mapManager.getMobData().forEach((mob, idx) => {
        if (mob?.mobId !== undefined) {
            if (targets.indexOf(mob.mobId)>=0) {
                mob.mode = "";
                mob.movement = "aggressive";
            }
        }
    });
}

// when "movement" event is triggered, all mobs are traversed
// to find out which mob should have his waypoint set
function triggerMovementWaypoint(filter) {
    mapManager.getMobData().forEach((mob, idx) => {
        if (mob?.movement !== undefined && mob?.waypoints!==undefined && mob.movement=="scripted") {
            mob.waypoints.forEach((wp) => {
                if (wp.eventfilter==filter) {
                    console.log("triggerMovementWaypoint, found wp", wp);
                    mob.targetPos=new Position(wp.x, wp.y);
                }
            });
        }
    });
}

function spell() {
    if (window.gamedata.animationsEnabled==false) return;

    const spellObjectId = 48; // 48
    loader.load( window.gamedata.objectIndex[spellObjectId].mesh, ( gltf ) => {

        objidx=0;
        for (let i=0;i<gltf.scene.children.length;i++) {
            if (gltf.scene.children[i].type=="Mesh") {
                objidx=i;
            }
        }
        let spell = gltf.scene.children[ objidx ];
        let diff_dir=directions[window.gamedata.direction+2];
        // scale
        spell.scale.x=spell.scale.y=spell.scale.z=0.5;
        // position
        spell.position.y=1.15;
        spell.position.x=camera.position.x+1*diff_dir.x;
        spell.position.z=camera.position.z+1*diff_dir.y;
        // rotation
        spell.rotation.y=camera.rotation.y;

        // opacity
        if (window.gamedata.objectIndex[spellObjectId].opacity!=undefined) {
            let skinnedmesh=getMesh(spell);
            skinnedmesh.frustumCulled=false;
            let skin=skinnedmesh.material;
            if (skin != undefined) {
                skin.opacity = parseFloat(window.gamedata.objectIndex[spellObjectId].opacity);
                skin.transparent = true;
                skin.side=THREE.FrontSide;
                skin.blending=THREE.AdditiveBlending;
            } else {
                console.log("transparency failed for ", mob.id, window.gamedata.objectIndex[spellObjectId].opacity);
            }
        }
        scene.add( spell );
        spellEffect = {};
        spellEffect.object=spell;
        if (gltf.animations!=undefined && gltf.animations.length>0) {
            spellEffect.animations=gltf.animations;
            spellEffect.mixer=new THREE.AnimationMixer(spell);
            spellEffect.go=getActionByName(spellEffect.mixer, spellEffect.animations, "Go");
            spellEffect.go.clampWhenFinished=true;
            spellEffect.go.iterations=1;
            spellEffect.go.loop=THREE.LoopOnce;
            spellEffect.mixer.addEventListener( 'finished', function( e ) {
                scene.remove(spellEffect.object);
                spellEffect=null;
            } );
            if (spellEffect.go!=undefined) spellEffect.go.play();
            console.log("spell execution started", spellEffect);
        }
    }, undefined, ( e ) => {
        console.error( e );
    } );
}

function spawnAllMapToken() {
    for (var t=0;t<mapManager.getTokenData().length;t++) {
        let token=mapManager.getTokenData()[t];
        let rot=0;
        if (token.rotation!=undefined) rot=parseInt(token.rotation);
        addToken(t, token.id, token.x, token.y, rot);
    }
}

function spawnAllMapMobs() {
    for (var m = 0; m < mapManager.getMobData().length; m++) {
        mob = mapManager.getMobData()[m];
        if (mob.rotation == undefined) mob.rotation = Math.floor((Math.random() * 4));
        mob.rotation = parseInt(mob.rotation);
        if (isNaN(mob.rotation)) mob.rotation = Math.floor((Math.random() * 4));
        mob.current_life = mob.life;
        loadMob(mob);
    }
}

function loadMeshObject(idx) {
    console.log("loading "+window.gamedata.objectIndex[idx].mesh);
    
    loader.load( window.gamedata.objectIndex[idx].mesh, ( gltf ) => {
        objidx=0;
        for (let i=0;i<gltf.scene.children.length;i++) {
            if (gltf.scene.children[i].type=="Mesh") {
                objidx=i;
            }
        }

        mesh = gltf.scene.children[ objidx ];
        mesh.scale.x=mesh.scale.y=mesh.scale.z=0.17;
        // console.log("mesh", mesh);

        window.gamedata.objectIndex[idx].mesh_=mesh;

        window.gamedata.objectIndex[idx].animations_=[];
        if (gltf.animations!=undefined && gltf.animations.length>0) {
            window.gamedata.objectIndex[idx].animations_=gltf.animations;        
        }

        meshQueue.shift();
        $(".startup_progress").html("<p>"+i18n("loading")+" "+meshQueue.length+" "+i18n("files")+"</p>");

        if (meshQueue.length>0) loadMeshObject(meshQueue[0]); else createScene();        
    }, undefined, ( e ) => {
        console.error( e );
        $(".error_text_placeholder").text(e);
        showMessage("error_message");
    } );

}

function questClear() {
    mapManager.quest.dispose();
    mapManager.quest=undefined;
}

function questComplete() {
    setPaused(true);

    $(".statistic_summary").html(window.gamedata.statistics.getSummaryHtml());

    if (mapManager.quest!=undefined) {
        mapManager.quest.dispose();
        mapManager.quest = undefined;
    }
    $("#notification_de").text("Quest abgeschlossen!");
    $("#notification_en").text("Quest complete!");
    $("#notification_"+window.gamedata.language).fadeIn(400);
    setTimeout(() => {
        $("#notification_"+window.gamedata.language).fadeOut(400);
        showMessage("success_message");
    }, 1000);
    window.gamedata.lastMobId=0;

    $("body").on("nextMap", () => {
        // end combat if necessary
        $("body").trigger("forceEndCombat");

        $("body").off("nextMap");
        showMessage("startup_message");

        window.gamedata.statistics.resetAll();

        if (window.gamedata.direction==undefined) window.gamedata.direction=3;
        window.gamedata.canvas={};
        window.gamedata.camera={};
        window.gamedata.camera.deltaX=0;
        window.gamedata.camera.deltaY=0;
        window.gamedata.camera.deltaZ=1.58;      

        window.gamedata.player={};
        window.gamedata.player.life=10;
        window.gamedata.player.current_life=10;

        clock = new THREE.Clock();

        rotationspeed=4;
        speed=4;
        mobspeed=1;

        partylight = new THREE.PointLight( 0xaaaaaa, 2.5 * getBrightness(), 7 ); // soft white partylight
        partylight.position.x=partyPos.x-1;
        partylight.position.z=partyPos.y-1;
        partylight.position.y=2.3;

        ambientlight = new THREE.AmbientLight( 0x444444, 5 * getBrightness() );

        damageLight = new THREE.AmbientLight( 0xaa0000, 0 );

        rad=(90 * Math.PI / 180);
        rad4=2 * Math.PI;
        rotationoffset=Math.PI;  

        window.gamedata.currentmap=parseInt(window.gamedata.currentmap)+1;
        if (window.gamedata.currentmap>=window.gamedata.maps.length) {
            window.gamedata.currentmap=0;
        }        
        initWorld();
    });
}

export function render() {
    requestAnimationFrame( render );

    if (window.gamedata.animationsEnabled==true) {
        delta = clock.getDelta();
        //
        // animate player position
        //

        if (onTop == 0 && spectatorMode == false) { // when being in top down view. apply no camera changes   && spectatorMode
            if (camera == undefined) return;

            // X
            if (camera.position.x > (partyPos.x + window.gamedata.camera.deltaX - 1)) {
                if (camera.position.x - (partyPos.x + window.gamedata.camera.deltaX - 1) > delta * speed) {
                    camera.position.x -= delta * speed;
                } else {
                    camera.position.x = (partyPos.x + window.gamedata.camera.deltaX - 1);
                }
            } else if (camera.position.x < (partyPos.x + window.gamedata.camera.deltaX - 1)) {
                if ((partyPos.x + window.gamedata.camera.deltaX - 1) - camera.position.x > delta * speed) {
                    camera.position.x += delta * speed;
                } else {
                    camera.position.x = (partyPos.x + window.gamedata.camera.deltaX - 1);
                }
            }

            // Y
            if (camera.position.z > (partyPos.y + window.gamedata.camera.deltaY - 1)) {
                if (camera.position.z - (partyPos.y + window.gamedata.camera.deltaY - 1) > delta * speed) {
                    camera.position.z -= delta * speed;
                } else {
                    camera.position.z = (partyPos.y + window.gamedata.camera.deltaY - 1);
                }
            } else if (camera.position.z < (partyPos.y + window.gamedata.camera.deltaY - 1)) {
                if ((partyPos.y + window.gamedata.camera.deltaY - 1) - camera.position.z > delta * speed) {
                    camera.position.z += delta * speed;
                } else {
                    camera.position.z = (partyPos.y + window.gamedata.camera.deltaY - 1);
                }
            }

            //
            // animate player rotation
            //

            // add mouseTiltX & mouseTiltFactor to logic
            rotationoffset = Math.PI + mouseTiltX * mouseTiltFactor;
            wr = window.gamedata.direction * rad + rotationoffset;
            if (wr >= rad4) wr -= rad4;
            if (camera.rotation.y != wr) {
                diff = ((wr - camera.rotation.y) / rad);
                if (diff > 0) diff_dir = "L"; else diff_dir = "R";
                if (diff > 2 || diff < -2) {
                    if (diff > 0) diff_dir = "R"; else diff_dir = "L";
                }

                if (Math.abs(wr - camera.rotation.y) < delta * rotationspeed) {
                    camera.rotation.y = wr;
                } else {
                    if (diff_dir == "L") {
                        camera.rotation.y += delta * rotationspeed;
                    } else {
                        if (camera.rotation.y < 0) camera.rotation.y += rad4;
                        camera.rotation.y -= delta * rotationspeed;
                    }
                }

                camera.rotation.y = camera.rotation.y % (rad4);
            }

            partylight.position.x = camera.position.x;
            partylight.position.z = camera.position.z;
        } // onTop end

        // spell Effect
        if (spellEffect != null && spellEffect.mixer != undefined) spellEffect.mixer.update(delta);

        //
        // animate mob position
        //
        for (let i = 0; i < mapManager.getMobDataLength(); i++) {
            mob = mapManager.getMob(i);

            if (mob.current_life == 0) {
                mob.object.skin.opacity -= delta;
            }

            if (mob.mixer != undefined) mob.mixer.update(delta);

            if (mob.object != undefined) {
                // X
                if (mob.object.position.x > (mob.x)) { // -1?
                    if (mob.object.position.x - (mob.x) > delta * mobspeed) {
                        mob.object.position.x -= delta * mobspeed;
                    } else {
                        mob.object.position.x = (mob.x);
                    }
                } else if (mob.object.position.x < (mob.x)) {
                    if ((mob.x) - mob.object.position.x > delta * mobspeed) {
                        mob.object.position.x += delta * mobspeed;
                    } else {
                        mob.object.position.x = (mob.x);
                    }
                }

                // Y
                if (mob.object.position.z > (mob.y)) { // -1?
                    if (mob.object.position.z - (mob.y) > delta * mobspeed) {
                        mob.object.position.z -= delta * mobspeed;
                    } else {
                        mob.object.position.z = (mob.y);
                    }
                } else if (mob.object.position.z < (mob.y)) {
                    if ((mob.y) - mob.object.position.z > delta * mobspeed) {
                        mob.object.position.z += delta * mobspeed;
                    } else {
                        mob.object.position.z = (mob.y);
                    }
                }

                // Rotation

                mob.object.rotation.y = mob.object.rotation.y % (rad4);

                wr = mob.rotation * rad;
                if (wr >= rad4) wr -= rad4;
                if (mob.object.rotation.y != wr) {
                    diff = ((wr - mob.object.rotation.y) / rad);
                    if (diff > 0) diff_dir = "L"; else diff_dir = "R";
                    if (diff > 2 || diff < -2) {
                        if (diff > 0) diff_dir = "R"; else diff_dir = "L";
                    }

                    if (Math.abs(wr - mob.object.rotation.y) < delta * rotationspeed) {
                        mob.object.rotation.y = wr;
                    } else {
                        if (diff_dir == "L") {
                            mob.object.rotation.y += delta * rotationspeed;
                        } else {
                            if (mob.object.rotation.y < 0) mob.object.rotation.y += rad4;
                            mob.object.rotation.y -= delta * rotationspeed;
                        }
                    }

                    mob.object.rotation.y = mob.object.rotation.y % (rad4);
                }

                if (mob.walk != undefined) {
                    if (mob.object.position.x != mob.x || mob.object.position.z != mob.y || mob.object.rotation.y != wr) {
                        if (!mob.walking) {
                            mob.walk.play();
                            mob.walking = true;
                        }
                    } else {
                        if (mob.walking) {
                            mob.walk.stop();
                            mob.walking = false;
                        }
                    }
                }
                if (mob.die != undefined) {
                    if (mob.current_life < 1 && mob.dieing == false) {
                        mob.dieing = true;
                        mob.die.start();
                    }
                }
            }
        }

        for (let i = 0; i < mapManager.getTokenDataLength(); i++) {
            tokenObj = mapManager.getToken(i);
            if (tokenObj.mixer != undefined) tokenObj.mixer.update(delta);
        }

        if (resizer!=undefined) {
            if (!resizer.tick(clock.getElapsedTime())) {
                resizer=undefined;
            }
        }
    } else { // begin no animation
        if (onTop == 0 && spectatorMode == false) { // when being in top down view. apply no camera changes   && spectatorMode
            if (camera == undefined) return;

            camera.position.x = (partyPos.x + window.gamedata.camera.deltaX - 1);
            camera.position.z = (partyPos.y + window.gamedata.camera.deltaY - 1);
            camera.rotation.y = window.gamedata.direction * rad + rotationoffset;

            partylight.position.x = camera.position.x;
            partylight.position.z = camera.position.z;
        } // onTop end

        for (let i = 0; i < mapManager.getMobDataLength(); i++) {
            mob = mapManager.getMob(i);
            if (mob.current_life == 0) mob.object.skin.opacity = 0;

            if (mob.object != undefined) {
                mob.object.position.x = (mob.x);
                mob.object.position.z = (mob.y);

                mob.object.rotation.y = mob.rotation * rad;
            }
        }
    }
     
    renderer.render(scene, camera);
}

function addToken(idx, wall, x, y, rot) {
    let tokenObject=mapManager.getTokenData()[idx];

    if (window.gamedata.objectIndex[tokenObject.id]==undefined) {
        console.log("Unknown Index "+tokenObject.id+". Omitting Object.");
        return;
    }

    loader.load( window.gamedata.objectIndex[tokenObject.id].mesh, ( gltf ) => {

        objidx=0;
        for (let i=0;i<gltf.scene.children.length;i++) {
            if (gltf.scene.children[i].type=="Mesh") {
                objidx=i;
            }
        }

        let meshObject = gltf.scene.children[ objidx ];
        meshObject.scale.x=meshObject.scale.y=meshObject.scale.z=0.5;
        meshObject.position.y=1.05;
        meshObject.position.x=x;
        meshObject.position.z=y;
        meshObject.rotation.y=rot*rad;


        // opacity
        let skin=getSkin(meshObject);
        meshObject.skin=skin;
        if (skin !== undefined) {
            //skin.transparent = true;
            //skin.depthWrite = false;
            //skin.side=THREE.DoubleSide;
            if (window.gamedata.objectIndex[tokenObject.id].opacity !== undefined) {
                skin.opacity = parseFloat(window.gamedata.objectIndex[tokenObject.id].opacity);
                skin.blending=THREE.AdditiveBlending;
            }
        } else {
            console.log("transparency failed for ", tokenObject.id, window.gamedata.objectIndex[tokenObject.id].opacity);
        }

        scene.add( meshObject );
        tokenObject.object=meshObject;
        if (gltf.animations!=undefined && gltf.animations.length>0) {
            tokenObject.animations=gltf.animations;
            tokenObject.mixer=new THREE.AnimationMixer(meshObject);
            tokenObject.open=getActionByName(tokenObject.mixer, tokenObject.animations, "Open");
            if (tokenObject.open!=undefined) {
                tokenObject.open.clampWhenFinished=true;
                tokenObject.open.iterations=1;
                tokenObject.open.loop=THREE.LoopOnce;
            }
            tokenObject.close=getActionByName(tokenObject.mixer, tokenObject.animations, "Close");
            if (tokenObject.close!=undefined) {
                tokenObject.close.clampWhenFinished=true;
                tokenObject.close.iterations=1;
                tokenObject.close.loop=THREE.LoopOnce;
            }

            tokenObject.on=getActionByName(tokenObject.mixer, tokenObject.animations, "On");
            if (tokenObject.on!=undefined) {
                tokenObject.on.clampWhenFinished=true;
                tokenObject.on.iterations=1;
                tokenObject.on.loop=THREE.LoopOnce;
            }
            tokenObject.off=getActionByName(tokenObject.mixer, tokenObject.animations, "Off");
            if (tokenObject.off!=undefined) {
                tokenObject.off.clampWhenFinished=true;
                tokenObject.off.iterations=1;
                tokenObject.off.loop=THREE.LoopOnce;
            }
            reevaluateCurrentDoorState(tokenObject);
            console.log("addToken, added", tokenObject);
        }
    }, undefined, ( e ) => {
        console.error( e );
    } );

}

export function scaleOut(obj) {
    let t=clock.getElapsedTime();
    console.log("scaleOut, starting at ", t, obj.scale.x);
    resizer=new Resize(t, 0.3, obj.scale.x, obj);
}

function createScene() {
    scene.add( partylight );
    scene.add( ambientlight );
    scene.add( damageLight );
    window.gamedata.scene=scene;

    textureLoader = new THREE.TextureLoader();

    createWater();

    scene.fog=mapManager.getMapFog();
    ambientlight.intensity=mapManager.getMapLight()*getBrightness();
    if (mapManager.getMapLightColor()!=undefined) {
        ambientlight.color = new THREE.Color(mapManager.getMapLightColor());
    }

    $(".startup_progress").html("<p>"+i18n("level_build")+"</p>");

    // spawn field objects -- old version
    createFieldObjects();

    $(".startup_progress").html("<p>"+i18n("mob_instance")+"</p>");
    spawnAllMapMobs();

    $(".startup_progress").html("<p>"+i18n("token_instance")+"</p>");
    spawnAllMapToken();

    $(".startup_progress").html("");
    $(".startup_navigation").show();
}

function createFieldObjects() {
    let idx = createInstancedUsageMap();
    for (const key in idx) {
        console.log("key="+key+" count="+idx[key]);
        createInstances(key, idx[key]);
    }
}

function createInstancedUsageMap() {
    let mapData = mapManager.getMapDataArray();
    let usageMap = [];
    for (let i=0;i<mapData.length;i++) {
        if (usageMap[mapData[i]] == undefined) {
            usageMap[mapData[i]]=1;
        } else {
            usageMap[mapData[i]]++;
        }
    }
    console.log("createInstancedUsageMap", usageMap, mapData);
    return usageMap;
}

function createInstances(objId, objCount) {
    if (window.gamedata.objectIndex[objId] == undefined) {
        if (objId != 0) {
            console.log("Unknown Index " + objId + ". Omitting Object.");
        }
        return;
    }

    dummy = new THREE.Object3D();

    let instancedMesh;
    if (window.gamedata.objectIndex[objId].mesh_.geometry == undefined) {
        console.error("could not clone geometry for " + objId, window.gamedata.objectIndex[objId].mesh_);

        // mesh consists of multiple subobjects
        if (window.gamedata.objectIndex[objId].mesh_.children.length>0) {
            for (let i=0;i<window.gamedata.objectIndex[objId].mesh_.children.length;i++) {
                let geo = window.gamedata.objectIndex[objId].mesh_.children[i].geometry.clone();
                let mats = window.gamedata.objectIndex[objId].mesh_.children[i].material.clone()
                geo.scale(0.5, 0.5, 0.5);
                instancedMesh = new THREE.InstancedMesh(
                    geo,
                    mats,
                    objCount
                );
                instancedMesh.depthWrite=false;
                instancedMesh.needsUpdate=false;
                createInstanceSubObjects(instancedMesh, objId);
            }
        }
    } else {

        let geo = window.gamedata.objectIndex[objId].mesh_.geometry.clone();
        let mats = window.gamedata.objectIndex[objId].mesh_.material.clone()
        geo.scale(0.5, 0.5, 0.5);
        instancedMesh = new THREE.InstancedMesh(
            geo,
            mats,
            objCount
        );
        createInstanceSubObjects(instancedMesh, objId);
    }
}

function createInstanceSubObjects(instancedMesh, objId) {
    let instancedIdx = 0;
    for (var my=0;my<30;my++) {
        for (var mx=0;mx<30;mx++) {
            if (mapManager.getMapData(mx, my) == objId) {
                dummy.position.set( mx, 1, my );

                // rotation
                if (window.gamedata.objectIndex[objId].orientation==undefined) {
                    dummy.rotation.y=0;
                } else if (window.gamedata.objectIndex[objId].orientation=="calc") {
                    dummy.rotation.y=((mx+my)%4)*rad;
                } else if (window.gamedata.objectIndex[objId].orientation=="connect") {
                    let adjacentWall=mapManager.getMapData((mx<2?(mx-1):(mx+1)), my);
                    if (window.gamedata.objectIndex[adjacentWall].type=="floor") {
                        dummy.rotation.y=rad;
                    } else {
                        dummy.rotation.y=0;
                    }
                } else {
                    dummy.rotation.y=0;
                }

                dummy.updateMatrix();
                instancedMesh.setMatrixAt( instancedIdx, dummy.matrix );
                instancedIdx++;
            }
        }
    }
    scene.add( instancedMesh );
}

function createWater() {
    plane = new THREE.PlaneGeometry( 50, 50 );

    const watermaterial =  new THREE.MeshPhongMaterial();
    watermaterial.transparent=true;
    watermaterial.opacity=0.5;
    watermaterial.color=new THREE.Color("#4747d2");
    water = new THREE.Mesh(plane, watermaterial);
    water.position.x=14;
    water.position.y=parseFloat(mapManager.getMapWaterLevel());
    console.log("createWater, at %o", water.position);
    water.position.z=20;
    water.renderOrder=-1;
    water.rotateX(Math.PI * - 0.5);
    window.gamedata.water=water;
    scene.add( water );
}

function spawnMob(mob) {
// spawnMob({id:"17", x:14, y:18, life:"2", rotation:0});
    if (mob.id==undefined) { console.log("spawnMob, missing id", mob); return; }
    if (mob.x==undefined) { console.log("spawnMob, missing id", mob); return; }
    if (mob.y==undefined) { console.log("spawnMob, missing id", mob); return; }
    if (mob.life==undefined) { console.log("spawnMob, missing id", mob); return; }
    if (mob.rotation==undefined) { mob.rotation=0; }

    console.log("spawnMob, spawning mob ", mob);
    mapManager.addMob(mob);
    loadMob(mob);
    // push to map and loadMob
}

function loadMob(mob) {
    if (window.gamedata.objectIndex[mob.id]==undefined) {
        console.log("Unknown Index "+mob.id+". Omitting Object.");
        return;
    }

    loader.load( window.gamedata.objectIndex[mob.id].mesh, ( gltf ) => {

        objidx=0;
        for (let i=0;i<gltf.scene.children.length;i++) {
            if (gltf.scene.children[i].type=="Mesh") {
                objidx=i;
            }
        }

        let cube = gltf.scene.children[ objidx ];
        cube.scale.x=cube.scale.y=cube.scale.z=0.5;
        cube.position.y=1.05;
        cube.position.x=mob.x;
        cube.position.z=mob.y;     
        cube.rotation.y=mob.rotation*rad;

        // opacity & color
        let skin=getSkin(cube);
        cube.skin=skin;
        if (skin !== undefined) {
            if (window.gamedata.objectIndex[mob.id].opacity !== undefined) {
                skin.transparent = true;
                skin.depthWrite = false;
                //skin.side=THREE.FrontSide;
                skin.opacity = parseFloat(window.gamedata.objectIndex[mob.id].opacity);
                skin.blending=THREE.AdditiveBlending;
            }
            // color
            if (mob.color!==undefined) {
                skin.color.r=mob.color.r;
                skin.color.g=mob.color.g;
                skin.color.b=mob.color.b;
            }
        } else {
            console.log("transparency failed for ", mob.id, window.gamedata.objectIndex[mob.id].opacity);
        }

        scene.add( cube );
        mob.object=cube;
        if (gltf.animations!=undefined && gltf.animations.length>0) {
            mob.animations=gltf.animations;
            mob.mixer=new THREE.AnimationMixer(cube);
            mob.idle=getActionByName(mob.mixer, mob.animations, "Idle");
            if (mob.idle!=undefined) mob.idle.play();

            mob.walk=getActionByName(mob.mixer, mob.animations, "Walk");
            if (mob.walk!=undefined) {
                mob.walk.setDuration(0.3);
                mob.walking=false;
            }
            mob.die=getActionByName(mob.mixer, mob.animations, "Die");
            if (mob.die!=undefined) {
                mob.dieing=false;
                mob.die.clampWhenFinished=true;
            }
            mob.attack=getActionByName(mob.mixer, mob.animations, "Attack");
            if (mob.attack!=undefined) {
                mob.attacking=false;
                mob.attack.clampWhenFinished=true;
                mob.attack.iterations=1;
                mob.attack.loop=THREE.LoopOnce;
                mob.attack.setDuration(0.8);
            }
        }          
    }, undefined, ( e ) => {
        console.error( e );
    } );
}

function getMesh(obj) {
    if (obj.type=="SkinnedMesh" || obj.type=="Mesh") return obj;
    if (obj.children == undefined) return undefined;
    for (let idx=0;idx<obj.children.length;idx++) {
        if (obj.children[idx].type=="SkinnedMesh" || obj.children[idx].type=="Mesh") {
            if (obj.children[idx].material == undefined) return undefined;
            if (obj.children[idx].material.opacity == undefined) return undefined;
            return obj.children[idx];// .material
        }
    }
}

function getSkin(obj) {
    let mesh=getMesh(obj);
    if (mesh==undefined) {
        console.log("getSkin, failed", obj, mesh);
        return undefined;
    }
    return mesh.material;
}

function getActionByName(mixer, animations, animationname) {
    for (let i=0;i<animations.length;i++) {
        if (animations[i].name.includes(animationname)) {
            return mixer.clipAction(animations[i]);
        }
    }
    return undefined;
}

export function moveCameraTop() {
    camera.rotation.x=-1.5;
    camera.rotation.y=0;
    camera.position.y=29;
    camera.position.z=17;
    camera.position.x=15;    

    console.log(ambientlight);
    ambientlight.intensity=10;
}

export function setPartyPosition(pos) {
    partyPos=pos;
}

export function getCameraDiff() {
    return Math.abs(parseInt(camera.position.x)-parseInt(partyPos.x)+1)+Math.abs(parseInt(camera.position.z)-parseInt(partyPos.y)+1);
}

function resetCameraPosition() {
    camera.position.x=(partyPos.x+window.gamedata.camera.deltaX-1);
    camera.position.z=(partyPos.y+window.gamedata.camera.deltaY-1);
}

// spectatorMode only
export function modifyCamera(mode) {
    if (!spectatorMode) return;
    let cdir=undefined;
    switch (mode) {
        case "ascend":
            camera.position.y+=0.1; break;
        case "descend":
            camera.position.y-=0.1; break;
        case "left":
            camera.rotation.y+=0.1*rad; break;
        case "right":
            camera.rotation.y-=0.1*rad; break;
        case "up":
           // camera.rotation.x+=0.1*rad;
            break;
        case "down":
           // camera.rotation.x-=0.1*rad;
            camera.lookAt(
              camera.position.x+camera.getWorldDirection().x*3,
              0,
              camera.position.z+camera.getWorldDirection().z*3
            );
            break;
        case "forward":
           // camera.rotation.x-=0.1*rad; break;
            cdir=camera.getWorldDirection();
            camera.position.x+=cdir.x*0.3;
            camera.position.y+=cdir.y*0.3;
            camera.position.z+=cdir.z*0.3;
            break;
        case "backward":
            // camera.rotation.x-=0.1*rad; break;
            cdir=camera.getWorldDirection();
            camera.position.x-=cdir.x*0.3;
            camera.position.y-=cdir.y*0.3;
            camera.position.z-=cdir.z*0.3;
            break;
    }
}