"use strict";

import { parseJSON, Position } from './helper.js';
import {onMapLoaded, partyPos} from './World.js';
import { Quest } from './quests.js';
import { setPaused } from './movement.js';
import { savegame, showMessage } from "./game.js";

export class MapManager {
	constructor(mapName) {
		this.mapName=null;
		this.map=null;
		this.mobs=null;
		this.allMobs=null;
		this.token=null;
		this.allToken=null;
		this.charPos=null;
		this.quest=null;
		this.intro=null;
		this.questTemplates=null;
		this.fog=null;
		this.light=null;
		this.pendingQuest=null;
		this.pendingQuestNPC=null;
		this.loadMap(mapName);
	}

	loadMap(mapName) {
		if (mapName==undefined || mapName==null) return;
		this.mapName=mapName;
	    this.map=[];
	    for (var i=0;i<30*30;i++) { this.map.push(0); }
	    console.log("loadMap, loading ", mapName);

		savegame.saveGameValue("currentmap", mapName);
	    $.get( "maps/"+this.mapName, (data) => { this.loadMapInternal(data); });
	}

	loadMapFromData(rawMapData) {
		this.mapName="uploaded_file.map.json";
	    this.map=[];
	    for (var i=0;i<30*30;i++) { this.map.push(0); }
	    console.log("loadMap, loading from data");

		this.loadMapInternal(rawMapData);
	}

	loadMapInternal(data) {
        var data_obj=parseJSON(data);
        if (this.map==undefined) this.map=[];
        
        this.map=data_obj.fielddata;
        
        if (data_obj.mobs!=undefined) this.mobs=data_obj.mobs; else this.mobs=new Array();
		this.allMobs=JSON.parse(JSON.stringify(this.mobs));
        if (data_obj.token!=undefined) this.token=data_obj.token; else this.token=new Array();
		this.allToken=JSON.parse(JSON.stringify(this.token));

        window.gamedata.direction=3;
        if (data_obj.direction!=undefined) window.gamedata.direction=parseInt(data_obj.direction);

        this.charPos=new Position(parseInt(data_obj.x), parseInt(data_obj.y));
		savegame.saveGameValue("position", {
			"x":this.charPos.x,
			"y":this.charPos.y,
			"dir":window.gamedata.direction
		});

		if (data_obj.fog==undefined) {
			console.log("loadMapInternal, using fog fallback");
			this.fog=new THREE.Fog(0x224466, 0.1, 8);
		} else if (data_obj.fog=="none") {
			this.fog=undefined;
		} else {
			console.log("loadMapInternal, using fog "+data_obj.fog);
			let fog_arr=data_obj.fog.split(" ");
			this.fog=new THREE.Fog(fog_arr[0], fog_arr[1], fog_arr[2]);
		}

		if (data_obj.light==undefined) {
			this.light=5;
		} else {
			this.light=parseFloat(data_obj.light);
		}

		if (data_obj.quest!=undefined) {
			if (this.quest!=undefined) this.quest.dispose();

			this.questTemplates=data_obj.quest.template;
			this.quest = new Quest(
				data_obj.quest.event,
				data_obj.quest.amount,
				this.chooseTemplate(data_obj.quest.template),
				"#quest_ui",
				data_obj.quest.complete_event==undefined?"quest_complete":this.pendingQuest.complete_event,
				false
			);
		}

        console.log("new introtext = ", data_obj, data_obj.introtext);

        this.intro=data_obj.introtext;
        let intro_i18n="";
        if (this.intro[window.gamedata.language] == undefined) {
			if (this.intro["en"] == undefined) {
				if (this.intro["de"] == undefined) {
					// try tpl as is
        		} else {
	        		intro_i18n=this.intro["de"];
        		}
        	} else {
        		intro_i18n=this.intro["en"];
        	}
        } else {
        	intro_i18n=this.intro[window.gamedata.language];
        }
		$(".level_introtext").text(intro_i18n);

        onMapLoaded();
    }

	chooseTemplate(tpl) {
		let out="";
        if (tpl[window.gamedata.language] == undefined) {
			if (tpl["en"] == undefined) {
				if (tpl["de"] == undefined) {
					// try tpl as is
					out=tpl;
        		} else {
	        		out=tpl["de"];
        		}
        	} else {
        		out=tpl["en"];
        	}
        } else {
        	out=tpl[window.gamedata.language];
        }	
        return out;	
	}

	changeLanguage(new_lang) {
		if (this.intro==undefined) return;
		$(".level_introtext").text(this.intro[new_lang]);	
		this.quest.changeLanguage(this.chooseTemplate(this.questTemplates));	
	}

	getCharPosition() {
		return new Position(this.charPos.x, this.charPos.y);
	}

	getMapData(x, y) {
		if (x instanceof Position) return this.getMapDataByPosition(x);

	    var cell=y*30+x;
	    if (this.map==undefined || this.map[cell]==undefined) {
	    	//console.log("map or cell undefined.");
	    	return 0;
	    }
	    //console.log("getMapData", cell, this.map, this.map[cell]);
	    return this.map[cell];
	}

	getMapFog() {
		return this.fog;
	}

	getMapLight() {
		return this.light;
	}

	getMapDataByPosition(position) {
	    var cell=position.y*30+position.x;
	    if (this.map==undefined || this.map[cell]==undefined) {
	    	//console.log("2. map or cell undefined.");
	    	return 0;
	    }
	    //console.log("2. getMapData", cell, this.map, this.map[cell]);
	    return this.map[cell];
	}		

	isFloor(x, y) {
		if (x instanceof Position) return this.isFloorByPosition(x);

    	var fieldvalue=this.getMapData(x, y);
    	if (window.gamedata.objectIndex[fieldvalue].type=="floor") return true;
    	return false;
	}

	isFloorByPosition(position) {
		if (position==undefined) { console.log("position is undefined"); return false; }
		if (this.map==undefined) { console.log("map is undefined"); return false; }
		if (this.getMapData(position)==0) {
			//console.log("requesting properties for invalid objectIndex. position=", position)	
			// fixme. this maybe happens when starting map before its completely loaded
			return false;
		}
		if (window.gamedata.objectIndex[this.getMapData(position)]==undefined) { console.log("OIdx is undefined", window.gamedata.objectIndex, this.getMapData(position)); return false; }
    	if (window.gamedata.objectIndex[this.getMapData(position)].type=="floor") {
    		return true;
    	}	
    	return false;
	}

	removeMob(idx) {
		this.mobs.splice(idx, 1);
	}	

	getMob(idx) {
		return this.mobs[idx];
	}

	addMob(mob) {
		this.mobs.push(mob);
	}

	resetMobData() {
		this.mobs=JSON.parse(JSON.stringify(this.allMobs));
		return this.mobs;
	}

	getMobData() {
		return this.mobs;
	}

	getMobDataLength() {
		if (this.mobs==null) return 0;
		return this.mobs.length;
	}

	disposeMobs() {
		this.mobs=[];
	}

	resetTokenData() {
		this.token=JSON.parse(JSON.stringify(this.allToken));
		return this.token;
	}

	getTokenData() {
		return this.token;
	}

	getTokenDataLength() {
		if (this.token==null) return 0;
		return this.token.length;		
	}

	removeToken(idx) {
		this.token.splice(idx, 1);
	}

	getQuest() {
		return this.quest;
	}

	needsObject(idx) {
		let searchIdx=parseInt(idx);
		
		for (var cell=0;cell<this.map.length;cell++) {
			if (this.map[cell]==searchIdx) return true;
		}
		for (var mobIdx=0;mobIdx<this.mobs.length;mobIdx++) {
			if (parseInt(this.mobs[mobIdx].id)==searchIdx) return true;
		}
		for (var tokenIdx=0;tokenIdx<this.token.length;tokenIdx++) {
			if (parseInt(this.token[tokenIdx].id)==searchIdx) return true;
		}		
		return false;
	}

	announceQuest(quest, mobidx) {
		if (this.getMob(mobidx).quest.completed!==undefined) {
			console.log("acceptQuest, quest already finished", quest.complete_message);
			$(".simple_message_de .simple_text_placeholder").text(quest.complete_message.de);
			$(".simple_message_en .simple_text_placeholder").text(quest.complete_message.en);
			setPaused(true);
			showMessage("simple_message");
			return;
		}
		this.pendingQuest=quest;
		this.pendingQuestNPC=mobidx;
		if (quest.introduction !== undefined) {
			$(".quest_message_de .quest_text_placeholder").text(quest.introduction.de);
			$(".quest_message_en .quest_text_placeholder").text(quest.introduction.en);
		}
		setPaused(true);
		showMessage("quest_message");
	}

	acceptQuest() {
		if (this.getMob(this.pendingQuestNPC).quest.completed!==undefined) {
			console.log("acceptQuest, quest already finished");
		}
		console.log("accepting quest ", this.pendingQuest);

		this.quest = new Quest(
			this.pendingQuest.event,
			this.pendingQuest.amount,
			this.chooseTemplate(this.pendingQuest.template),
			"#quest_ui",
			this.pendingQuest.complete_event===undefined?"quest_complete":this.pendingQuest.complete_event,
			true
		);
		this.getMob(this.pendingQuestNPC).quest.completed=true;
		this.pendingQuestNPC=null;
		this.pendingQuest=null;
	}
}