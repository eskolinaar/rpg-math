import {i18n, savegame} from './game.js';
import {notify} from "./helper.js";

"use strict";

export class Quest {

	constructor(eventName, eventFilter, eventCount, template, progressTemplate, container, completeEvent, spawn) {
		this.eventName=eventName;
		this.eventFilter=eventFilter;
		this.eventCount=eventCount;
		this.currentCount=0;
		this.template=template;
		this.progressTemplate=progressTemplate;
		this.container=container;
		this.complete=false;
		this.completeEvent=completeEvent;

		console.log("starting new quest, ", eventName, eventFilter, eventCount, template, progressTemplate, container, completeEvent);
		this.updateContainerMessage();
		savegame.saveGameValue("currentquest", this);

		if (spawn && this.eventName == "token") {
			$("body").trigger({ type:"respawn", subtype:this.eventName });
		}

		$("body").on(this.eventName, (e) => {
			if (this.eventFilter != undefined && this.eventFilter != "" && this.eventFilter != e.filter) return;
			this.currentCount=parseInt(this.currentCount)+1;
			this.updateContainerMessage();
			if (progressTemplate!==undefined && progressTemplate!=null)	{
				notify(progressTemplate);
			}
			console.log("quest progress "+this.currentCount+" / "+this.eventCount);
			// check if this works
			savegame.saveGameValue("currentquest", this);
			if (parseInt(this.currentCount)>=parseInt(this.eventCount) || this.eventName=="position") {
				console.log("quest complete");
				$(container).html(i18n("quest_complete"));
				$("body").off(this.eventName);
				this.currentCount=0;
				this.complete=true;
				$("body").trigger({ type:this.completeEvent });
				savegame.saveGameValue("currentquest", undefined);
			}
		});
	}

	updateContainerMessage() {
		let tpl=this.template.split("{}");
		if (tpl.length>1) {
			$(this.container).html(tpl[0] + this.currentCount + tpl[1] + this.eventCount + tpl[2]);
		} else {
			$(this.container).html(this.template);
		}
	}

	dispose() {
		console.log("disposing quest");
		$("body").off(this.eventName);
		savegame.saveGameValue("currentquest", undefined)
		this.currentCount=0;
		this.complete=true;		
	}

	changeLanguage(newTemplate, newProgressTemplate) {
		this.template=newTemplate;
		this.progressTemplate=newProgressTemplate;
		let tpl=this.template.split("{}");
		$(this.container).html(tpl[0]+this.currentCount+tpl[1]+this.eventCount+tpl[2]);
		console.log("quest change language "+this.currentCount+" / "+this.eventCount);	
	}

	isComplete() {
		return (this.complete);
	}
}