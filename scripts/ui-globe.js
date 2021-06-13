
class UiGlobe extends HTMLElement {

	static get observedAttributes() {
    	return ['value', 'max', 'color'];
  	}

	get value() { return this.getAttribute('value'); }
	set value(val) { if (val) { this.setAttribute('value', val); } else { this.removeAttribute('value'); } }

	get max() { return this.getAttribute('max'); }
	set max(val) { if (val) { this.setAttribute('max', val); } else { this.removeAttribute('max'); } }

	get color() { return this.getAttribute('color'); }
	set color(val) { if (val) { this.setAttribute('color', val); } else { this.removeAttribute('color'); } }

  	constructor() {
		super();
		this._shadowRoot=this.attachShadow({mode:'closed'});
		var out="";
		out+=this.getStyleString();
		out+=`
			<div class="globe_wrapper">
				<div class="globe_front"></div>
				<div class="globe_mask">
					<div class="globe_back"></div>
				</div>
			</div>`;		
		this._shadowRoot.innerHTML=out;				
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name=="value") {
			if (newValue==undefined) {
				this.value_=0;
			} else {
				this.value_=newValue;
			}
		}
		if (name=="max") {
			this.max_=newValue;
		}
		if (name=="color") {
			this.color_=newValue;
		}		
		this.updateContent();
	}

	connectedCallback() {
		setTimeout(() => {
			this.updateContent();
		}, 100);
	}

	updateContent() {
		if (this.max_==undefined) this.max_=100;
		if (this.value_==undefined) this.value_=this.max_;
		if (this.color_==undefined) this.color_="red";

		let value_height=(this.clientHeight*parseInt(this.value_)/parseInt(this.max_));
		//console.log("heights, ", this.clientHeight, parseInt(this.value_), parseInt(this.max_), value_height);

		let color=this.color_;

		this._shadowRoot.querySelector(".globe_back").style.height=this.clientHeight+"px";
		this._shadowRoot.querySelector(".globe_back").style.backgroundColor=color;
		this._shadowRoot.querySelector(".globe_mask").style.height=value_height+"px";
	}

	getStyleString() {
		if (this.max_==undefined) this.max_=100;
		if (this.value_==undefined) this.value_=this.max_;
		if (this.color_==undefined) this.color_="red";

		let value_height=(100*parseInt(this.value_)/parseInt(this.max_));
		console.log("value_height, ", parseInt(this.value_), parseInt(this.max_), value_height);
		let color=this.color_;

		if (value_height>100) value_height=100;
		if (value_height<0) value_height=0;
		return `<style>	
			:host {
				display:block;
				min-height:80px;
				min-width:80px;		
				overflow:hidden;
			}

			:host .globe_wrapper {
				position:relative;
				height:100%;
				width:100%;	
				transform: rotate(180deg);
			}

			:host .globe_front {
				position: absolute;
				top:0;
				left:0;
				height:100%;
				width:100%;
				border-radius: 100%;
				box-shadow: 0 0 10px #fff inset;
				background:linear-gradient(0, #000, #fff);
				opacity:0.8;
			}

			:host .globe_mask {
				height:50%;
				width:100%;
				overflow:hidden;
				position: absolute;
				top:0;
				left:0;	

			}

			:host .globe_back {
				position: absolute;
				top:0;
				left:0;	
				height:100%;
				width:100%;
				border-radius: 100%;
				box-shadow: 0 0 10px #fff inset;
				background-color:` + color + `;
			}		

		</style>`;
	}

}

customElements.define("ui-globe", UiGlobe);