"use strict";

export class Expression {
    constructor(newPattern) {
        this.pattern=newPattern;
        this.currentValue=newPattern;
    }

    getValue() {
        return this.currentValue;
    }

    toString() {
        return "Expression "+this.pattern+" to "+this.currentValue;
    }

    log() {
        console.log("Resolving "+this.toString());
    }

    solveVariables(store) {
        Object.getOwnPropertyNames(store).forEach((val, idx, array) => {
            this.currentValue=this.currentValue.replaceAll(val, store[val]);
        });
        if (this.currentValue==undefined) this.currentValue="0";
        return this;
    }

    solveVariable(varName, varValue) {
        return this;
    }

    solveNegation() {
        this.currentValue=this.currentValue.replaceAll("!1", "0");
        this.currentValue=this.currentValue.replaceAll("!0", "1");
        return this;
    }

    solveAnd() {
        this.currentValue=this.currentValue.replaceAll("1&1", "1");
        this.currentValue=this.currentValue.replaceAll("0&1", "0");
        this.currentValue=this.currentValue.replaceAll("1&0", "0");
        this.currentValue=this.currentValue.replaceAll("0&0", "0");
        return this;
    }

    solveOr() {
        this.currentValue=this.currentValue.replaceAll("1|1", "1");
        this.currentValue=this.currentValue.replaceAll("0|1", "1");
        this.currentValue=this.currentValue.replaceAll("1|0", "1");
        this.currentValue=this.currentValue.replaceAll("0|0", "0");
        return this;
    }

    solveAll(store) {
        return this
            .solveVariables(store)
            .solveNegation()
            .solveAnd()
            .solveAnd()
            .solveAnd()
            .solveOr()
            .solveOr()
            .solveOr();
    }
}