"use strict";

export class SaveGame {

    constructor() {
        this.mapname = null;
        this.savemode = "none";
    }

    setSaveMode(savemode) {
        this.savemode=savemode;
    }

    saveGameValue(key, value) {
        //if (this.savemode == "none") return;
        if (value == undefined) {
            localStorage.removeItem("save#" + key);
            return;
        }
        localStorage.setItem("save#" + key, JSON.stringify(value));
    }

    loadGameValue(key) {
        return JSON.parse(localStorage.getItem("save#" + key));
    }

    saveMapValue(key, value) {
        //if (this.savemode == "none") return;
        if (value == undefined) {
            localStorage.removeItem("save#" + this.mapname + "#" + key);
            return;
        }
        localStorage.setItem("save#" + this.mapname + "#" + key, JSON.stringify(value));
    }

    loadMapValue(key) {
        let item=localStorage.getItem("save#" + this.mapname + "#" + key);
        if (item==undefined) return null;
        return JSON.parse(localStorage.getItem("save#" + this.mapname + "#" + key));
    }

    setMap(mapname) {
        this.mapname = mapname;
    }

    getMap() {
        return this.mapname;
    }

}

