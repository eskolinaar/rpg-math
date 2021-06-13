import { GLTFLoader } from './GLTFLoader-r124.js';

var obj;
var mixer;
var clock;
var renderer;
var scene;
var camera;

function init() {
    console.log("init");

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    clock = new THREE.Clock();


    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );



    scene.add(new THREE.AmbientLight( 0x666666, 5 ));

    const loader = new GLTFLoader();
    loader.load( 'objects/models/blob5b.glb', function ( gltf ) { // blob5b.glb
        obj=gltf.scene;
        scene.add( obj );
        console.log(gltf);

        mixer = new THREE.AnimationMixer( obj );
        mixer.clipAction( gltf.animations[ 0 ] ).play();

        animate();
    }, undefined, function ( error ) {
        console.error( error );
    });

    camera.position.z = 3;
    camera.position.y=1;

}

function animate() {
    requestAnimationFrame( animate );
    const delta = clock.getDelta();
    mixer.update( delta );

    renderer.render( scene, camera );
}

$(document).ready(init);