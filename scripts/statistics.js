"use strict";

export class Statistic {

	constructor() {
		this.calculations=[];
		this.currentMath={};
		this.deathCount=0;
		this.winCount=0;
		window.statistic=this;

		$("body").on("stageLoaded", (e) => {
			if (e.var.type=="math_add") {
				this.currentMath={};
				this.currentMath.type="Math";
				this.currentMath.difficulty=window.gamedata.difficulty;
				this.currentMath.from=Date.now();
				this.currentMath.fromDate=(new Date()).toISOString();
			}
		});

		$("body").on("nextMath", () => {
			this.currentMath={};
			this.currentMath.type="Math";
			this.currentMath.difficulty=window.gamedata.difficulty;
			this.currentMath.from=Date.now();
			this.currentMath.fromDate=(new Date()).toISOString();
		});

		$("body").on("correct", () => {
			this.currentMath.to=Date.now();
			this.currentMath.toDate=(new Date()).toISOString();
			this.currentMath.time=this.currentMath.to-this.currentMath.from;
			this.currentMath.correct=true;
			this.calculations.push(this.currentMath);
		});

		$("body").on("mistake", () => {
			this.currentMath.to=Date.now();
			this.currentMath.toDate=(new Date()).toISOString();
			this.currentMath.time=this.currentMath.to-this.currentMath.from;
			this.currentMath.correct=false;
			this.calculations.push(this.currentMath);
		});

		$("body").on("playerDeath", () => {
			this.deathCount++;
		});

		$("body").on("winCombat", () => {
			this.winCount++;
		});
	}

	getAll() {
		return this.calculations;
	}

	count() {
		return this.calculations.length;
	}

	correctCount() {
		return this.calculations.filter((el) => (el.correct==true)).length;
	}

	wrongCount() {
		return this.calculations.filter((el) => (el.correct!=true)).length;
	}

	getDeathCount() {
		return this.deathCount;
	}

	getWinCount() {
		return this.winCount;
	}

	ratio() {
		return this.correctCount()/this.count();
	}

	difficulty() {
		// todo: check if all cals are at the same difficulty
		return window.gamedata.difficulty;
	}

	averageTime() {
		if (this.count()<1) return "0";
		let avgTime=0;
		for (let i=0;i<this.calculations.length;i++) {
		    avgTime+=this.calculations[i].time;
		}
		return (avgTime/this.count()/1000).toPrecision(3);
	}

	resetAll() {
		this.calculations=[];
		this.currentMath={};
		this.deathCount=0;
		this.winCount=0;
	}

	getStars() {
		let starCount=5;
		starCount-=2*this.getDeathCount();
		if (this.wrongCount()>0) starCount--;
		if (this.wrongCount()/this.count()>0.2) starCount--;
		if (this.wrongCount()/this.count()>0.5) starCount--;
		if (starCount<1) return 1;
		return starCount;
	}

	getSummaryHtml() {
		return `<p class="center"><b>Zusammenfassung</b><br>
				<span class="weak">(Schwierigkeit: ${this.difficulty()})</span></p>
				<p><span class="digits3">${this.count()}</span> Rechnungen<br>
				<span class="digits3">${this.wrongCount()}</span> Fehler<br>
				<span class="digits3">${this.getWinCount()}</span> gewonnene Kämpfe<br>
				<span class="digits3">${this.getDeathCount()}</span> verlorene Kämpfe<br>
				<span class="digits3">${this.averageTime()}</span> Sekunden mittlere Rechenzeit</p>
				<p class="center"><b>${this.getStars()} von 5 Sterne</b></p>`;
	}
}