// noinspection EqualityComparisonWithCoercionJS

"use strict";

import { GLTFLoader } from './GLTFLoader-r124.js';
import { parseJSON, Position } from './helper.js';
import { MapManager } from './MapManager.js';
import { onTop, setPaused, directions } from './movement.js';
import { i18n, showMessage, getLanguage } from './game.js';
import { damage } from './combat.js';
import { Water } from './Water2.js';

export var partyPos;
export var damageLight;
export var mapManager;
export var scene;
var delta;
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
var light;
var light2;
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

export function initWorld() {
    partyPos=new Position(17, 13);
    clock = new THREE.Clock();

    rotationspeed=4;
    speed=4;
    mobspeed=1;

    light = new THREE.PointLight( 0xaaaaaa, 2.5, 7 ); // soft white light
    light.position.x=partyPos.x-1;
    light.position.z=partyPos.y-1;
    light.position.y=2.3;

    rad=(90 * Math.PI / 180);
    rad4=2 * Math.PI;
    rotationoffset=Math.PI;  

    light2 = new THREE.AmbientLight( 0x444444, 5 );

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

    if (window.location.hash=="#bc_map") {
        window.location.hash="";
        mapManager=new MapManager();
        console.log("checking for map editor map");
        $("body").trigger({ type:"checkMapEditor" });
    } else if (mapManager==undefined || mapManager==null) {
        mapManager=new MapManager();
        window.gamedata.mapManager=mapManager;
    } else {
        mapManager.loadMap(window.gamedata.maps[window.gamedata.currentmap]);
    }
}

export function loadTexturesAndMaterials(data) {
    if (data==undefined) {
        console.log("not loading objectIndex as its already loaded");
    } else {
        var data_obj=parseJSON(data);
        window.gamedata.objectIndex=data_obj;
    }

    loader = new GLTFLoader().setPath( 'objects/models/' );   
    // loader = new THREE.JSONLoader();
    meshQueue=[];
    for (var i in window.gamedata.objectIndex) {
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
    var skyloader = new THREE.TextureLoader();
    skyloader.load(
        "objects/sky.png",
        texture => {
            var objGeometry = new THREE.SphereBufferGeometry(60, 20, 20);
            var objMaterial = new THREE.MeshPhongMaterial({
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
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );       
    });
}

export function onMapLoaded() {
    partyPos=mapManager.getCharPosition();

    camera = new THREE.PerspectiveCamera( 60, (window.innerWidth)/window.innerHeight, 0.05, 1000 );
    camera.position.x=partyPos.x+window.gamedata.camera.deltaX-1;
    camera.position.z=partyPos.y+window.gamedata.camera.deltaY-1;
    camera.position.y=window.gamedata.camera.deltaZ; 
    camera.rotation.y=(window.gamedata.direction)*rad+rotationoffset;    

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({
        canvas : (document.getElementById("three_outputcanvas"))
    });
    renderer.setSize(window.innerWidth, window.innerHeight );
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

function spell() {
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
            //spellEffect.go.timeScale=6; // if spell.glb is used. speed up animation by ~5
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
        //$("body").trigger({ type:"loadMeshes", var: meshQueue.length });
        $(".startup_progress").html("<p>"+i18n("loading")+" "+meshQueue.length+" "+i18n("files")+"</p>");

        if (meshQueue.length>0) loadMeshObject(meshQueue[0]); else createScene();        
    }, undefined, ( e ) => {
        console.error( e );
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
    $("#quest_complete_"+window.gamedata.language).fadeIn(400);
    setTimeout(() => {
        $("#quest_complete_"+window.gamedata.language).fadeOut(400);
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

        light = new THREE.PointLight( 0xaaaaaa, 2.5, 7 ); // soft white light
        light.position.x=partyPos.x-1;
        light.position.z=partyPos.y-1;
        light.position.y=2.3;

        light2 = new THREE.AmbientLight( 0x444444, 3 );

        damageLight = new THREE.AmbientLight( 0xaa0000, 0 );

        //onTop=0;

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
    delta = clock.getDelta();
  
    //
    // animate player position
    //
    
    if (onTop==0) { // when being in top down view. apply no camera changes
        if (camera == undefined) return;

        // X
        if (camera.position.x>(partyPos.x+window.gamedata.camera.deltaX-1)) { 
            if (camera.position.x-(partyPos.x+window.gamedata.camera.deltaX-1)>delta*speed ) {
                camera.position.x-=delta*speed;     
            } else {
                camera.position.x=(partyPos.x+window.gamedata.camera.deltaX-1);
            }
        } else 
        if (camera.position.x<(partyPos.x+window.gamedata.camera.deltaX-1)) {
            if ((partyPos.x+window.gamedata.camera.deltaX-1)-camera.position.x>delta*speed) {
                camera.position.x+=delta*speed;     
            } else {
                camera.position.x=(partyPos.x+window.gamedata.camera.deltaX-1);
            }
        }
        
        // Y
        if (camera.position.z>(partyPos.y+window.gamedata.camera.deltaY-1)) { 
            if (camera.position.z-(partyPos.y+window.gamedata.camera.deltaY-1)>delta*speed) {
                camera.position.z-=delta*speed;     
            } else {
                camera.position.z=(partyPos.y+window.gamedata.camera.deltaY-1);
            }
        } else 
        if (camera.position.z<(partyPos.y+window.gamedata.camera.deltaY-1)) {
            if ((partyPos.y+window.gamedata.camera.deltaY-1)-camera.position.z>delta*speed) {
                camera.position.z+=delta*speed;     
            } else {
                camera.position.z=(partyPos.y+window.gamedata.camera.deltaY-1);
            }
        }
        
        //
        // animate player rotation
        //
        wr=window.gamedata.direction*rad+rotationoffset;
        if (wr>=rad4) wr-=rad4;
        if (camera.rotation.y!=wr) {
            diff=((wr-camera.rotation.y)/rad);
            if (diff>0) diff_dir="L"; else diff_dir="R";
            if (diff>2 || diff<-2) { if (diff>0) diff_dir="R"; else diff_dir="L"; } 
            
            if (Math.abs(wr-camera.rotation.y)<delta*rotationspeed) {
                camera.rotation.y=wr;
            } else {
                if (diff_dir=="L") {
                    camera.rotation.y+=delta*rotationspeed; 
                } else {
                    if (camera.rotation.y<0) camera.rotation.y+=rad4;
                    camera.rotation.y-=delta*rotationspeed;
                }
            }
            
            camera.rotation.y=camera.rotation.y%(rad4);
        }

        light.position.x=camera.position.x;
        light.position.z=camera.position.z;   
    } // onTop end

    // spell Effect
    if (spellEffect!=null && spellEffect.mixer!=undefined) spellEffect.mixer.update(delta);

    //
    // animate mob position
    //
    for (let i=0;i<mapManager.getMobDataLength();i++) {
        mob=mapManager.getMob(i);

        if (mob.current_life==0) {
            mob.object.skin.opacity-=delta;
        }

        if (mob.mixer!=undefined) mob.mixer.update(delta);

        if (mob.object!=undefined) {
            // X
            if (mob.object.position.x>(mob.x)) { // -1?
                if (mob.object.position.x-(mob.x)>delta*mobspeed) {
                    mob.object.position.x-=delta*mobspeed;     
                } else {
                    mob.object.position.x=(mob.x);
                }
            } else 
            if (mob.object.position.x<(mob.x)) {
                if ((mob.x)-mob.object.position.x>delta*mobspeed) {
                    mob.object.position.x+=delta*mobspeed;     
                } else {
                    mob.object.position.x=(mob.x);
                }
            }

            // Y
            if (mob.object.position.z>(mob.y)) { // -1?
                if (mob.object.position.z-(mob.y)>delta*mobspeed) {
                    mob.object.position.z-=delta*mobspeed;     
                } else {
                    mob.object.position.z=(mob.y);
                }
            } else 
            if (mob.object.position.z<(mob.y)) {
                if ((mob.y)-mob.object.position.z>delta*mobspeed) {
                    mob.object.position.z+=delta*mobspeed;     
                } else {
                    mob.object.position.z=(mob.y);
                }
            }

            //mob.object.rotation.y=mob.object.rotation.y+0.3*delta;
            // Rotation

            //mob.object.rotation.y=mob.rotation*rad;

            // window.gamedata.direction => mob.rotation
            // camera.rotation.y => mob.object.rotation.y

            mob.object.rotation.y=mob.object.rotation.y%(rad4); 
            
            wr=mob.rotation*rad;//+rotationoffset;
            if (wr>=rad4) wr-=rad4;
            if (mob.object.rotation.y!=wr) {
                diff=((wr-mob.object.rotation.y)/rad);
                if (diff>0) diff_dir="L"; else diff_dir="R";
                if (diff>2 || diff<-2) { if (diff>0) diff_dir="R"; else diff_dir="L"; } 

                if (Math.abs(wr-mob.object.rotation.y)<delta*rotationspeed) {
                    mob.object.rotation.y=wr;
                } else {
                    if (diff_dir=="L") {
                        mob.object.rotation.y+=delta*rotationspeed; 
                    } else {
                        if (mob.object.rotation.y<0) mob.object.rotation.y+=rad4;
                        mob.object.rotation.y-=delta*rotationspeed;
                    }
                }
                
                mob.object.rotation.y=mob.object.rotation.y%(rad4);                
            }

            if (mob.walk!=undefined) {
                if (mob.object.position.x!=mob.x || mob.object.position.z!=mob.y || mob.object.rotation.y!=wr) {
                    if (!mob.walking) {
                        mob.walk.play();
                        mob.walking=true;
                    }
                } else {
                    if (mob.walking) {
                        mob.walk.stop();
                        mob.walking=false;
                    }
                }
            }     
            if (mob.die!=undefined) {
                if (mob.current_life<1 && mob.dieing==false) {
                    mob.dieing=true;
                    mob.die.start();
                }
            }
        }
    }

    for (let i=0;i<mapManager.getTokenDataLength();i++) {
        tokenObj=mapManager.getToken(i);
        if (tokenObj.mixer!=undefined) tokenObj.mixer.update(delta);
    }
     
    renderer.render(scene, camera);
}

function addFieldObject(wall, x, y) {
    if (window.gamedata.objectIndex[wall]==undefined) {
        if (wall!=0) {
            console.log("Unknown Index " + wall + ". Omitting Object.");
        }
        return;
    }
    var cube;
    cube=window.gamedata.objectIndex[wall].mesh_.clone();
    cube.scale.x = cube.scale.y = cube.scale.z = 0.5;
    cube.position.y=1;
    cube.position.x=x;
    cube.position.z=y;
    cube.name=window.gamedata.objectIndex[wall].name;
    if (window.gamedata.objectIndex[wall].orientation!=undefined && window.gamedata.objectIndex[wall].orientation=="calc") {
        // rot*rad
        cube.rotation.y=((x+y)%4)*rad;
    } else {
        cube.rotation.y=0;
    }
    // ToDo: fix this by changing objects
    if (wall==13 || wall==14 || wall==15) {
        cube.position.y=1.05;
    }
    scene.add( cube );
    return cube;
}

function addToken(idx, wall, x, y, rot) {
    let mob=mapManager.getTokenData()[idx];

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
        cube.position.x=x;
        cube.position.z=y;
        cube.rotation.y=rot*rad;

        // opacity
        let skin=getSkin(cube);
        cube.skin=skin;
        if (skin !== undefined) {
            skin.transparent = true;
            skin.side=THREE.FrontSide;
            if (window.gamedata.objectIndex[mob.id].opacity !== undefined) {
                skin.opacity = parseFloat(window.gamedata.objectIndex[mob.id].opacity);
                skin.blending=THREE.AdditiveBlending;
            }
        } else {
            console.log("transparency failed for ", mob.id, window.gamedata.objectIndex[mob.id].opacity);
        }

        scene.add( cube );
        mob.object=cube;
        if (gltf.animations!=undefined && gltf.animations.length>0) {
            mob.animations=gltf.animations;
            mob.mixer=new THREE.AnimationMixer(cube);
            mob.open=getActionByName(mob.mixer, mob.animations, "Open");
            if (mob.open!=undefined) {
                mob.open.clampWhenFinished=true;
                mob.open.iterations=1;
                mob.open.loop=THREE.LoopOnce;
            }
            mob.close=getActionByName(mob.mixer, mob.animations, "Close");
            if (mob.close!=undefined) {
                mob.close.clampWhenFinished=true;
                mob.close.iterations=1;
                mob.close.loop=THREE.LoopOnce;
            }
            console.log("addToken, added", mob, mob.open, mob.close);
        }
    }, undefined, ( e ) => {
        console.error( e );
    } );

}

function createScene() {
    scene.add( light );
    scene.add( light2 );
    scene.add( damageLight );
    window.gamedata.scene=scene;

    textureLoader = new THREE.TextureLoader();
    
    Water_1_M_Normal=textureLoader.load(
        './scripts/Water_1_M_Normal.jpg',
        undefined,
        undefined,
        error => {
            console.log("Error loading texture './scripts/Water_1_M_Normal.jpg' " , error);
        }
    );   
    Water_2_M_Normal=textureLoader.load(
        './scripts/Water_2_M_Normal.jpg',
        undefined,
        undefined,
        error => {
            console.log("Error loading texture './scripts/Water_2_M_Normal.jpg' " , error);
        }
    );      

    plane = new THREE.PlaneBufferGeometry( 50, 50 );
    water = new Water( plane, {
                color: '#ffffff',
                scale: 4,
                flowDirection: new THREE.Vector2( 0.3, 0.3 ),
                textureWidth: 1024,
                textureHeight: 1024,
                normalMap0: Water_1_M_Normal,
                normalMap1: Water_2_M_Normal
            } );  
    water.position.x=14;
    water.position.y=1.05;
    water.position.z=20;  
    water.rotateX(Math.PI * - 0.5);
    window.gamedata.water=water;
    scene.add( water );

    scene.fog=mapManager.getMapFog();
    light2.intensity=mapManager.getMapLight();

    $(".startup_progress").html("<p>"+i18n("level_build")+"</p>");

    for (var my=0;my<30;my++) {
        for (var mx=0;mx<30;mx++) {
           addFieldObject(mapManager.getMapData(mx, my), mx, my);
        }
    }

    $(".startup_progress").html("<p>"+i18n("mob_instance")+"</p>");
    spawnAllMapMobs();

    $(".startup_progress").html("<p>"+i18n("token_instance")+"</p>");
    spawnAllMapToken();

    $(".startup_progress").html("");
    $(".startup_navigation").show();
}

function spawnMob(mob) {
// spawnMob({id:"17", x:14, y:18, life:"2", rotation:0});
    if (mob.id==undefined) { console.log("spawnMob, missing id", mob); return; }
    if (mob.x==undefined) { console.log("spawnMob, missing id", mob); return; }
    if (mob.y==undefined) { console.log("spawnMob, missing id", mob); return; }
    if (mob.life==undefined) { console.log("spawnMob, missing id", mob); return; }
    if (mob.rotation==undefined) { mob.rotation=0; }

// check if floor

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

        // opacity
        let skin=getSkin(cube);
        cube.skin=skin;
        if (skin !== undefined) {
            skin.transparent = true;
            skin.side=THREE.FrontSide;
            if (window.gamedata.objectIndex[mob.id].opacity !== undefined) {
                skin.opacity = parseFloat(window.gamedata.objectIndex[mob.id].opacity);
                skin.blending=THREE.AdditiveBlending;
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

    console.log(light2);  
    light2.intensity=10;
}

export function setPartyPosition(pos) {
    partyPos=pos;
}

export function getCameraDiff() {
    return Math.abs(parseInt(camera.position.x)-parseInt(partyPos.x)+1)+Math.abs(parseInt(camera.position.z)-parseInt(partyPos.y)+1);
}
