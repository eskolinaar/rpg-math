"use strict";

export function parseJSON(data) {
    if (data instanceof Object) {
        return data;
    }
    return JSON.parse(data);
}

export class Vector {
	constructor(x, y) {
		this.x=x;
		this.y=y;
	}

	setX(x) {
		this.x=x;
	}

	getX(x) { 
		return this.x;
	}

	setY(y) {
		this.x=x;
	}

	getY(x) { 
		return this.x;
	}
}

export class Position {
	constructor(x, y) {
		this.x=x;
		this.y=y;
	}

	setX(x) {
		this.x=x;
		return this;
	}

	getX(x) { 
		return this.x;
	}

	setY(y) {
		this.x=x;
		return this;
	}

	getY(x) { 
		return this.x;
	}

	collide(pos2, vector) {
		if (vector==undefined) {
			if (this.x==pos2.x && this.y==pos2.y) return true;
			return false;
		}

		if (this.x+vector.x==pos2.x && this.y+vector.y==pos2.y) return true;
		return false;
	}

	apply(x, y) {
		if (x instanceof Vector) return this.applyVector(x);

		var p = new Position(this.x, this.y);
		p.x+=x;
		p.y+=y;
		return p;
	}

	applyVector(vector) {
		var p = new Position(this.x, this.y);
		p.x+=vector.x;
		p.y+=vector.y;
		return p;
	}

	clone() {
		return new Position(this.x, this.y);
	}

	add(x, y) {
		if (x instanceof Vector) return this.addVector(x);

		this.x+=x;
		this.y+=y;
		return this;		
	}

	addVector(vector) {
		this.x+=vector.x;
		this.y+=vector.y;
		return this;
	}	

	asArray() {
		return [this.x, this.y];
	}

	toString() {
		return "["+this.x+", "+this.y+"]";
	}

	equals(vector) {
		if (this.x==vector.x && this.y==vector.y) return true;
		return false;
	}
}