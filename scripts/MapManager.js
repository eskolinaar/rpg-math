"use strict";

import { parseJSON, Position } from './helper.js';
import { partyPos, onMapLoaded } from './World.js';
import { Quest } from './quests.js';

export class MapManager {
	constructor(mapName) {
		this.mapName=null;
		this.map=null;
		this.mobs=null;
		this.token=null;
		this.charPos=null;
		this.quest=null;
		this.intro=null;
		this.questTemplates=null;
		this.loadMap(mapName);
	}

	loadMap(mapName) {
		this.mapName=mapName;
	    this.map=[];
	    for (var i=0;i<30*30;i++) { this.map.push(0); }
	    console.log("loadMap, loading ", mapName);

	    $.get( "maps/"+this.mapName, (data) => {

	        var data_obj=parseJSON(data);
	        if (this.map==undefined) this.map=[];
	        
	        this.map=data_obj.fielddata;
	        
	        if (data_obj.mobs!=undefined) this.mobs=data_obj.mobs; else this.mobs=new Array();
	        if (data_obj.token!=undefined) this.token=data_obj.token; else this.token=new Array();

	        window.gamedata.direction=3;
	        if (data_obj.direction!=undefined) window.gamedata.direction=parseInt(data_obj.direction);

	        this.charPos=new Position(parseInt(data_obj.x), parseInt(data_obj.y));

	        this.questTemplates=data_obj.quest.template;
	        this.quest=new Quest(
	        	data_obj.quest.event, 
	        	data_obj.quest.amount,
	        	this.chooseTemplate(data_obj.quest.template),
	        	"#quest_ui"
	        	);

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
	    });
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

	getMobData() {
		return this.mobs;
	}

	getMobDataLength() {
		if (this.mobs==null) return 0;
		return this.mobs.length;
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
}