"use strict";

import { mapManager, damageLight } from './World.js';
import { targetMob } from './movement.js';

export function initAnimations() {
	$("body").on("damage", animateDamage);
	$("body").on("suffer", animateSuffer);
}

function animateDamage() {
	if (targetMob<0) return;
	let mesh=mapManager.getMob(targetMob).object.children.filter((m) => (m.type=="SkinnedMesh"));
	if (mesh.length<1) return;
	mesh[0].material.emissive.g=45;
	
	setTimeout(
		() => {
			mesh[0].material.emissive.g=0;
		}, 
		300
	);	
}

function animateSuffer() {
	damageLight.intensity=2;
	setTimeout(
		() => {
			damageLight.intensity=0;
		}, 
		300
	);	
}