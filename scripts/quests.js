import { i18n } from './game.js';

"use strict";

export class Quest {

	constructor(eventName, eventCount, template, container, completeEvent) {
		this.eventName=eventName;
		this.eventCount=eventCount;
		this.currentCount=0;
		this.template=template;
		this.container=container;
		this.complete=false;
		this.completeEvent=completeEvent;

		console.log("starting new quest, ", eventName, eventCount, template, container, completeEvent);
		let tpl=this.template.split("{}");
		$(container).html(tpl[0]+this.currentCount+tpl[1]+this.eventCount+tpl[2]);

		$("body").on(this.eventName, () => {
			this.currentCount=parseInt(this.currentCount)+1;
			let tpl=this.template.split("{}");
			$(container).html(tpl[0]+this.currentCount+tpl[1]+this.eventCount+tpl[2]);
			console.log("quest progress "+this.currentCount+" / "+this.eventCount);
			if (parseInt(this.currentCount)>=parseInt(this.eventCount)) {
				console.log("quest complete");
				$(container).html(i18n("quest_complete"));
				$("body").off(this.eventName);
				this.currentCount=0;
				this.complete=true;
				$("body").trigger({ type:this.completeEvent });
			}
		});
	}

	dispose() {
		console.log("disposing quest");
		$("body").off(this.eventName);
		this.currentCount=0;
		this.complete=true;		
	}

	changeLanguage(newTemplate) {
		this.template=newTemplate;
		let tpl=this.template.split("{}");
		$(this.container).html(tpl[0]+this.currentCount+tpl[1]+this.eventCount+tpl[2]);
		console.log("quest change language "+this.currentCount+" / "+this.eventCount);	
	}

	isComplete() {
		return (this.complete);
	}
}