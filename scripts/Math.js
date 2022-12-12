"use strict";

import { targetMob, paused } from './movement.js';

function random(max) { 
	if (max==0) return 0;
	return Math.floor(Math.random() * Math.floor(max))+1; 
}
function random_choice(arr, min, max) {
	let low=Math.floor(arr[0]-0.3*max);
	if (low<Math.floor(arr[0]/2)) {
		low=Math.floor(arr[0]/2);
	}
	let high=Math.floor(arr[0]+0.3*max);
	if (high>Math.floor(2*arr[0])) {
		high=Math.floor(2*arr[0]);
	}
	console.log("random_choice", arr, max, low, high);
	if (low<1) low=1;
	if (low<min) low=min;
	if (high>max) high=max;
	let num=Math.floor(Math.random() * (high - low)) + low;
	console.log("random_choice, raw", arr, num);
	num=random_shift(arr, num, max);
	num=random_shift(arr, num, max);
	console.log("random_choice, after shift", arr, num);
	return num;
}
function random_shift(arr, num, max) {
	if (arr.indexOf(num)>-1) {
		num++;
		if (num>max) {
			num-=Math.floor(0.6*max);
		}
	}
	return Math.floor(num);
}


export class RandomMath {
	constructor() {
		this.registerRandomMath();
	}

	registerRandomMath() {
		$("body").on("stageLoaded", (e) => {
			console.log("stageLoaded observed => ", e.var.type);
			if (e.var.type=="math_add") {
				this.currentIndex=0;
				this.stageData=e.var.stage;
				this.createDOM(e.var.stage);
				this.setup();
			}
		});

		$("body").on("nextMath", () => {
			if (targetMob<0) {
				console.log("nextMath, combat already ended");
				return;
			}
			this.currentIndex++;
			if (this.currentIndex>=100) {
				this.stageCompleted();
				return;
			}
			this.createDOM(this.stageData);
			this.setup();
		});
	}

	createDOM(stageData) {
		console.log("math createDOM", stageData);
		$("#footer").hide();
		$("#main").html("");

		// select math type (one of: add, sul, mul, div, mod) if defined by difficulty
		let modes=Object.getOwnPropertyNames(window.gamedata.difficulty);
		let mode=modes[random(modes.length)-1];
		console.log("new math ", mode, modes, window.gamedata.difficulty);
		// create dom for math user interface
		this["createDOM_"+mode](window.gamedata.difficulty[mode]);

		document.querySelectorAll("#main ul.instruction .placeholder")[0].classList.add("active");
	}

	setup() {
		$(".placeholder").on("click", function() {
			$(".placeholder").removeClass("active");
			$(".wrong").removeClass("wrong");
			$(this).addClass("active");
		});

		$(".choice").on("click", function() {
			console.log("choice clicked ... ", $(this)[0].innerHTML);
			if (paused) return;
			if (parseInt($(this)[0].getAttribute("data-placeholder")) == parseInt($(".placeholder.active").index(".placeholder")+1)) {
				$(".placeholder.active").html($(this).html());
				$(".placeholder.active").addClass("correct");
				$(".wrong").removeClass("wrong");
				console.log("... correct");

				var next=$(".placeholder.active").nextAll(".placeholder:not(.correct)").eq(0);
				if (next.length<1) {
					next=$(".placeholder:not(.correct)").eq(0);
					if (next.length<1) {
						console.log("animate win");
						$(this).addClass("right");
						$(".choice").off();
						$("body").trigger({ type:"correct" });

						setTimeout(() => {
							console.log("triggering next");
							$("body").trigger({ type:"nextMath" });	
						}, 500); 					
					}
				}
				$(".placeholder").removeClass("active");
				next.addClass("active");				
			} else {
				$(this).addClass("wrong");
				console.log("triggering mistake");
				$("body").trigger({ type:"mistake" });

				$(".choice").off();

				setTimeout(() => {
					console.log("triggering next");
					$("body").trigger({ type:"nextMath" });	
				}, 2000); 					
			}
		});

	}

	winAnimation() {}

	stageCompleted() {
		var progress = document.querySelector("progress");
		progress.setAttribute("value", progress.getAttribute("max"));
		$(".description").html("Bravo! Du hast es geschafft!");
		$(".instruction").remove();
		$(".solution").remove();
	}

    createDOM_add(limit) {
		console.log("createDOM_add");
		var main=document.querySelector("#main");

		var max_sum=limit;
		var sum=Math.floor(Math.random()*0.7*max_sum)+1+0.3*max_sum;
		var a=Math.floor((sum-1)*Math.random())+1;
		var b=sum-a;		

	// instruction
		main.appendChild(makePlateList({
			listClass:"instruction",
			content: [ a, "+", b, "=", "_" ]
		}));

	// solution
		var choices=[];
		choices.push(sum);
		choices.push(random_choice(choices, Math.max(a,b)+1, max_sum));
		choices.push(random_choice(choices, Math.max(a,b)+1, max_sum));
		choices.sort(() => 0.5-Math.random());		

		main.appendChild(makePlateList({
			listClass:"solution",
			content: choices,
			plateClass: "choice",
			solution: sum
		}));	
	}

	createDOM_sub(limit) {
		console.log("createDOM_sub");
		var main=document.querySelector("#main");

		var max_sum=limit;
		var sum=Math.floor(Math.random()*0.7*max_sum)+1+0.3*max_sum;
		var a=Math.floor((sum-1)*Math.random())+1;
		var b=sum-a;		

	// instruction
		main.appendChild(makePlateList({
			listClass:"instruction",
			content: [ sum, "-", a, "=", "_" ]
		}));

	// solution
		var choices=[];
		choices.push(b);
		choices.push(random_choice(choices, 1, sum));
		choices.push(random_choice(choices, 1, sum));
		choices.sort(() => 0.5-Math.random());		

		main.appendChild(makePlateList({
			listClass:"solution",
			content: choices,
			plateClass: "choice",
			solution: b
		}));		
	}

	createDOM_mul(limit) {
		console.log("createDOM_mul");
		var main=document.querySelector("#main");

		var max_ab=Math.floor(Math.sqrt(limit));
		var a=Math.floor(Math.random()*max_ab)+1;
		var b=Math.floor(Math.random()*max_ab)+1;		
		var mul=a*b;

	// instruction
		main.appendChild(makePlateList({
			listClass:"instruction",
			content: [ a, "*", b, "=", "_" ]
		}));

	// solution
		var choices=[];
		choices.push(mul);
		choices.push(random_choice(choices, Math.max(a,b), max_ab*max_ab));
		choices.push(random_choice(choices, Math.max(a,b), max_ab*max_ab));
		choices.sort(() => 0.5-Math.random());		

		main.appendChild(makePlateList({
			listClass:"solution",
			content: choices,
			plateClass: "choice",
			solution: mul
		}));		
	}

	createDOM_div(limit) {
		console.log("createDOM_div");
		var main=document.querySelector("#main");

		var max_ab=Math.floor(Math.sqrt(limit));
		var a=Math.floor(Math.random()*max_ab)+1;
		var b=Math.floor(Math.random()*max_ab)+1;		
		var mul=a*b;

	// instruction
		main.appendChild(makePlateList({
			listClass:"instruction",
			content: [ mul, "/", a, "=", "_" ]
		}));

	// solution
		var choices=[];
		choices.push(b);
		choices.push(random_choice(choices, 1, a+b));
		choices.push(random_choice(choices, 1, a+b));
		choices.sort(() => 0.5-Math.random());		

		main.appendChild(makePlateList({
			listClass:"solution",
			content: choices,
			plateClass: "choice",
			solution: b
		}));		
	}	

	createDOM_mod(limit) {
		console.log("createDOM_mod");
		var main=document.querySelector("#main");

		var max=Math.ceil(Math.random()*limit);
		var a=Math.ceil(Math.random()*(max/2))+1;
		var b=max%a;

	// instruction
		main.appendChild(makePlateList({
			listClass:"instruction",
			content: [ max, "%", a, "=", "_" ]
		}));

	// solution
		var choices=[];
		choices.push(b);
		choices.push(random_choice(choices, 1, a-1));
		choices.push(random_choice(choices, 1, a-1));
		choices.sort(() => 0.5-Math.random());		

		main.appendChild(makePlateList({
			listClass:"solution",
			content: choices,
			plateClass: "choice",
			solution: b
		}));		
	}	
}

function makePlateList(def) {
	let plateList=document.createElement("ul");
	plateList.classList.add(def.listClass);

	for (var i = 0; i < def.content.length; i++) {
		let plate=document.createElement("li");

		plate.classList.add("plate");
		if (def.plateClass!=undefined && def.plateClass!='') plate.classList.add(def.plateClass);
		if (def.content[i]=='_') plate.classList.add("placeholder");
		if (def.solution!=undefined && parseInt(def.content[i])==parseInt(def.solution)) plate.setAttribute("data-placeholder", "1");

		plate.innerHTML=def.content[i];
		plateList.appendChild(plate);
	};

	return plateList;	
}