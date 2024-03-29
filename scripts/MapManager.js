"use strict";

import { parseJSON, Position } from './helper.js';
import {onMapLoaded, partyPos} from './World.js';
import { Quest } from './quests.js';
import {setPaused, evaluateDoorStates, updateCompass} from './movement.js';
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
		this.fog_data=null;
		this.light=null;
		this.lightColor=null;
		this.pendingQuest=null;
		this.pendingQuestNPC=null;
		this.pendingQuestToken=null;
		this.openSwitchDialog=null;
		this.openSwitchToken=null;
		this.loadMap(mapName);
	}

	loadMap(mapName) {
		if (mapName === undefined || mapName == null) return;
		console.log("loadMap, loading ", mapName);

		this.mapName=mapName;
		savegame.saveGameValue("currentmap", mapName);

		$(".pause_message_maplink").html("<a href='"+window.document.location.href+"#map="+this.mapName+"'>"+this.mapName+"</a>");

		this.map=[];
		for (let i=0;i<30*30;i++) { this.map.push(0); }
	    $.get( "maps/"+this.mapName, (data) => {
			this.loadMapInternal(data);
			onMapLoaded();
		});
	}

	loadMapWithPosition(mapName, position) {
		if (mapName===undefined || mapName == null) return;
		console.log("loadMap, loading ", mapName);

		this.mapName=mapName;
		savegame.saveGameValue("currentmap", mapName);

		this.map=[];
		for (let i=0;i<30*30;i++) { this.map.push(0); }
		$.get( "maps/"+this.mapName, (data) => {
			this.loadMapInternal(data);
			this.charPos=new Position(parseInt(position.x), parseInt(position.y));
			if (position.dir!==undefined) { window.gamedata.direction=parseInt(position.dir); updateCompass(); }
			onMapLoaded();
		});
	}

	loadMapFromData(rawMapData) {
	    this.map=[];
	    for (var i=0;i<30*30;i++) { this.map.push(0); }
	    console.log("loadMap, loading from data");

		this.loadMapInternal(rawMapData);
		onMapLoaded();
	}

	loadMapInternal(data) {
        let data_obj=parseJSON(data);

		if (this.mapName==undefined) this.mapName=data_obj.mapName;
		savegame.setMap(this.mapName);
		$(".pause_message_mapname").text("");
		if (data_obj.mapname!=undefined) {
			$(".pause_message_mapname").html("<br><br>"+data_obj.mapname);
		}

		if (this.map==undefined) this.map=[];
        this.map=data_obj.fielddata;

        if (data_obj.mobs!=undefined) this.mobs=data_obj.mobs; else this.mobs=new Array();
		this.allMobs=JSON.parse(JSON.stringify(this.mobs));
        if (data_obj.token!=undefined) this.token=data_obj.token; else this.token=new Array();
		this.allToken=JSON.parse(JSON.stringify(this.token));

		if (data_obj.resetValues!==undefined) {
			data_obj.resetValues.split(",").forEach((keyname) => this.resetSwitchState(keyname));
		}

		if (data_obj.showcompass=="true") {
			$("#compass_ui").show();
		} else {
			$("#compass_ui").hide();
		}

        window.gamedata.direction=3;
        if (data_obj.direction!=undefined) window.gamedata.direction=parseInt(data_obj.direction);
		updateCompass();

        this.charPos=new Position(parseInt(data_obj.x), parseInt(data_obj.y));
		savegame.saveGameValue("position", {
			"x":this.charPos.x,
			"y":this.charPos.y,
			"dir":window.gamedata.direction
		});

		this.fog_data=data_obj.fog;
		this.water_level=data_obj.water_level;
		this.updateFog();

		if (data_obj.light==undefined) {
			this.light=5;
			this.lightColor="#444444";
		} else {
			if (data_obj.light.split(" ").length<2) {
				this.light = parseFloat(data_obj.light);
				this.lightColor="#444444";
			} else {
				let lightSplit = data_obj.light.split(" ");
				this.light = parseFloat(lightSplit[0]);
				this.lightColor=lightSplit[1];
			}
		}

		if (data_obj.quest!=undefined) {
			if (this.quest!=undefined) this.quest.dispose();

			this.questTemplates=data_obj.quest.template;
			this.questProgressTemplates=data_obj.quest?.progressTemplate;
			this.quest = new Quest(
				data_obj.quest.event,
				data_obj.quest.filter,
				data_obj.quest.amount,
				this.chooseTemplate(data_obj.quest.template),
				this.chooseTemplate(data_obj.quest?.progressTemplate),
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
		$("button.needs_map").show();
    }


	updateFog() {
		let fog_multiplicator=parseInt($(".fog_multiplicator").eq(0).val());

		if (this.fog_data==undefined) {
			console.log("loadMapInternal, using fog fallback");
			this.fog=new THREE.Fog(0x224466, 0.1 * fog_multiplicator, 8 * fog_multiplicator);
		} else if (this.fog_data=="none") {
			this.fog=undefined;
		} else {
			console.log("loadMapInternal, using fog "+this.fog_data);
			let fog_arr=this.fog_data.split(" ");
			this.fog=new THREE.Fog(fog_arr[0], fog_arr[1] * fog_multiplicator, fog_arr[2] * fog_multiplicator);
		}
	}

	chooseTemplate(tpl) {
		if (tpl === undefined) return undefined;
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
		this.quest.changeLanguage(this.chooseTemplate(this.questTemplates), this.chooseTemplate(this.questProgressTemplates));
	}

	getCharPosition() {
		return new Position(this.charPos.x, this.charPos.y);
	}

	getMapData(x, y) {
		if (x instanceof Position) return this.getMapDataByPosition(x);

	    let cell=y*30+x;
	    if (this.map==undefined || this.map[cell]==undefined) {
	    	return 0;
	    }
	    return this.map[cell];
	}

	getMapDataArray() {
		return this.map;
	}

	getMapFog() {
		return this.fog;
	}

	getMapLight() {
		return this.light;
	}

	getMapWaterLevel() {
		if (this.water_level===undefined) return 1.05;
		return this.water_level;
	}

	getMapLightColor() {
		return this.lightColor;
	}

	getMapDataByPosition(position) {
	    let cell=position.y*30+position.x;
	    if (this.map==undefined || this.map[cell]==undefined) {
	    	//console.log("2. map or cell undefined.");
	    	return 0;
	    }
	    //console.log("2. getMapData", cell, this.map, this.map[cell]);
	    return this.map[cell];
	}		

	isFloor(x, y) {
		if (x instanceof Position) return this.isFloorByPosition(x);

    	let fieldvalue=this.getMapData(x, y);
    	if (window.gamedata.objectIndex[fieldvalue].type=="floor") return true;
    	return false;
	}

	isFloorByPosition(position) {
		if (position===undefined) { console.log("position is undefined"); return false; }
		if (this.map===undefined) { console.log("map is undefined"); return false; }
		if (this.getMapData(position)==0) return false;
		if (window.gamedata.objectIndex[this.getMapData(position)]===undefined) { console.log("OIdx is undefined", window.gamedata.objectIndex, this.getMapData(position)); return false; }
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

	getToken(idx) {
		return this.token[idx];
	}

	getTokenData() {
		return this.token;
	}

	getTokenDataLength() {
		if (this.token==null) return 0;
		return this.token.length;		
	}

	removeToken(idx) {
		this.token[idx].x=-1;//splice(idx, 1);
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

	announceQuest(quest, mobidx, tokenidx) {
		if (mobidx!=null && this.getMob(mobidx).quest!==undefined && this.getMob(mobidx).quest.completed!==undefined
			|| tokenidx!=null && this.getToken(tokenidx).action!==undefined && this.getToken(tokenidx).action.quest!==undefined && this.getToken(tokenidx).action.quest.completed!==undefined) {
			console.log("acceptQuest, quest already accepted or completed", quest.complete_message);
			$(".simple_message_de .simple_text_placeholder").html(quest.complete_message.de.replaceAll("\n", "<br>"));
			$(".simple_message_en .simple_text_placeholder").html(quest.complete_message.en.replaceAll("\n", "<br>"));
			setPaused(true);
			showMessage("simple_message");
			return;
		}
		this.pendingQuest=quest;
		this.pendingQuestNPC=mobidx;
		this.pendingQuestToken=tokenidx;
		if (quest.introduction !== undefined) {
			$(".quest_message_de .quest_text_placeholder").html(quest.introduction.de.replaceAll("\n", "<br>"));
			$(".quest_message_en .quest_text_placeholder").html(quest.introduction.en.replaceAll("\n", "<br>"));
		}
		setPaused(true);
		showMessage("quest_message");
	}

	/**
	 * Populate simple_message_de/en and show it.
	 * Optionally hook an event for quest tracking.
	 *
	 * @param message to be shown
	 * @param firstTime only trigger quest event once
	 * @param eventQualifier to filter for mob/token types within quest tracking
	 */
	showSimpleMessage(message, firstTime, eventQualifier, customEvent) {
		console.log("showSimpleMessage, showing simple message", message, firstTime, eventQualifier);
		$(".simple_message_de .simple_text_placeholder").html(message.de.replaceAll("\n", "<br>"));
		$(".simple_message_en .simple_text_placeholder").html(message.en.replaceAll("\n", "<br>"));
		$(".simple_message_de button[data-id], .simple_message_en button[data-id]").attr("data-event-qualifier", (firstTime?eventQualifier:null));
		$(".simple_message_de button[data-id], .simple_message_en button[data-id]").attr("data-custom-event", (firstTime&&customEvent!==undefined?customEvent:null));
		setPaused(true);
		showMessage("simple_message");
	}

	showSwitchDialog(token) {
		let action=token.action;
		console.log("showSwitchDialog, showing dialog", action.message);
		this.openSwitchDialog=action.keyname;
		this.openSwitchToken=token;
		if (action.message !== undefined) {
			$(".switch_message_de .switch_text_placeholder").html(action.message.de.replaceAll("\n", "<br>"));
			$(".switch_message_en .switch_text_placeholder").html(action.message.en.replaceAll("\n", "<br>"));
		} else {
			$(".switch_message_de .switch_text_placeholder").html("Willst du ein oder ausschalten?");
			$(".switch_message_en .switch_text_placeholder").html("Do you want it on or off?");
		}
		// default values
		$(".switch_message_de button.switch_off").text("Aus");
		$(".switch_message_de button.switch_on").text("Ein");
		$(".switch_message_en button.switch_off").text("Off");
		$(".switch_message_en button.switch_on").text("On");
		if (action.labels !== undefined) {
			$(".switch_message_de button.switch_off").text(action.labels.off.de);
			$(".switch_message_de button.switch_on").text(action.labels.on.de);
			$(".switch_message_en button.switch_off").text(action.labels.off.en);
			$(".switch_message_en button.switch_on").text(action.labels.on.en);
		}
		let state = this.loadSwitchState(action.keyname);
		if (state=="1") {
			$("[data-id=switch_on]").addClass("active");
			$("[data-id=switch_off]").removeClass("active");
		} else {
			$("[data-id=switch_off]").addClass("active");
			$("[data-id=switch_on]").removeClass("active");
		}
		setPaused(true);
		showMessage("switch_message");
	}

	acceptQuest() {
		if (this.pendingQuestNPC!=null && this.getMob(this.pendingQuestNPC).quest.completed!==undefined) {
			console.log("acceptQuest, quest already finished");
		}
		console.log("accepting quest ", this.pendingQuest);

		this.quest = new Quest(
			this.pendingQuest.event,
			this.pendingQuest.filter,
			this.pendingQuest.amount,
			this.chooseTemplate(this.pendingQuest.template),
			this.chooseTemplate(this.pendingQuest?.progressTemplate),
			"#quest_ui",
			this.pendingQuest.complete_event===undefined?"quest_complete":this.pendingQuest.complete_event,
			true
		);
		if (this.pendingQuestNPC!=null) {
			this.getMob(this.pendingQuestNPC).quest.completed = true;
		} else {
			console.log("acceptQuest, accepting quest from token", this.pendingQuestToken, this.getToken(this.pendingQuestToken));
			this.getToken(this.pendingQuestToken).action.quest.completed = true;
		}
		this.pendingQuestNPC=null;
		this.pendingQuestToken=null;
		this.pendingQuest=null;
	}

	saveVariableState(varname, newvalue) {
		console.log("saveVariableState, ", varname, newvalue);
		savegame.saveMapValue("switch#"+varname, newvalue);
		evaluateDoorStates(varname);
	}

	saveSwitchState(newstate) {
		if (this.openSwitchDialog==null) {
			console.log("saveSwitchState, failed saving new state");
			return;
		}
		savegame.saveMapValue("switch#"+this.openSwitchDialog, newstate);
		evaluateDoorStates(this.openSwitchDialog);
		this.openSwitchDialog=null;
	}

	loadSwitchState(keyname) {
		let state=savegame.loadMapValue("switch#"+keyname);
		console.log("loadSwitchState, loading '"+keyname+"', '"+state+"'");
		return state;
	}

	resetSwitchState(keyname) {
		savegame.saveMapValue("switch#"+keyname, "0");
		console.log("resetSwitchState, resetting '"+keyname+"'");
	}

}