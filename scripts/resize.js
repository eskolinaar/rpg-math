"use strict";

export class Resize {

    constructor(begin, duration, initialValue, obj) {
        this.begin=checkEmpty(begin, 0);
        this.duration=checkEmpty(duration, 1);
        this.initialValue=checkEmpty(initialValue, 1);
        this.obj=checkEmpty(obj, { scale:0 });
    }

    getValue(ts) {
        if (ts<this.begin) return this.initialValue;
        if (ts>this.begin+this.duration) return 0;
        return (this.begin+this.duration-ts)*this.initialValue/this.duration;
    }

    tick(ts) {
        let scale=this.getValue(ts);
        console.log("tick, at", ts, scale);
        this.obj.scale.x=scale;
        this.obj.scale.y=scale;
        this.obj.scale.z=scale;
        if (scale<=0) return false;
        return true;
    }

    getObject() {
        return this.obj;
    }
}

function checkEmpty(input, fallback) {
    if (input!=null && input!=undefined) return input;
    return fallback;
}