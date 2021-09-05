/*
	Maurer Peter (https://github.com/eskolinaar)
	MIT-License
	
	HTML UI-Element to choose a number that indicate an amount of health.
	Used for custom difficulty screen.
*/

class UiNumber extends HTMLElement {
	static get observedAttributes() {
    	return ['value'];
  	}

	get value() { return this.getAttribute('value'); }
	set value(val) { if (val) { this.setAttribute('value', val); } else { this.removeAttribute('value'); } }

  	constructor() {
		super();
		this.value_=0;
		this._shadowRoot=this.attachShadow({mode:'open'});
		var out="";
		out+=this.getStyleString();
		console.log("constructor", this);
		out+=`
			<div class="number_wrapper">
				<p>&nbsp;</p>
				<ul>
					<li class="selected">-</li>
					<li>10</li>
					<li>20</li>
					<li>40</li>
					<li>100</li>
					<li>200</li>
					<li>400</li>
					<li>1000</li>
				</ul>
				<br style="clear:both">
			</div>`;		
		this._shadowRoot.innerHTML=out;				
	}

	// update visual when layout is done
	connectedCallback() {
		setTimeout(() => {
			this.registerEvents();
			this.updateContent();
		}, 100);
	}

	registerEvents() {
		let li=this._shadowRoot.querySelectorAll("ul li");
		for (var i=0;i<li.length;i++) {
			li[i].addEventListener("click", (el) => {
				el.target.parentElement.querySelector(".selected").classList.remove("selected");
				el.target.classList.add("selected");

				if (el.target.innerHTML=="-") this.value="0"; else this.value=el.target.innerHTML;
			});
		}
	}

	updateContent() {
		this._shadowRoot.querySelector("p").innerHTML=this.innerHTML;
	}

	getStyleString() {
		return `<style>	
			:host {
				display:block;
				min-height:80px;
				min-width:220px;		
				max-width:350px;
				border:1px solid #888;
				margin:5px;
				background-color:#ccc;
				text-align:left;
				padding-left:10px;
				padding-bottom: 5px;
			}

			:host .number_wrapper ul {
				margin:0;
				padding:0;
				list-style-type: none;
			}

			:host .number_wrapper ul li {
			    float: left;
			    border: 1px solid #888;
			    box-shadow: 0 0 5px #fff inset;
			    background-color: #ccc;
			    padding: 5px 2px;
			    border-radius: 5px;
			    margin-right: 3px;
			    margin-bottom:3px;
			    cursor: pointer;
			    min-width: 34px;
			    text-align: center;
			    color:#666;
			    font-size:14px;
			}		

			:host .number_wrapper ul li.selected {
				border: 1px solid #000;
				background-color: #89ff89;
				color:#000;
				
			}	
		</style>`;
	}	
}

customElements.define("ui-number", UiNumber);	