const video = document.createElement('video');
video.onloadedmetadata = evt => {
    video.play();
    setup(video);
};
video.src = 'sample.mp4';

let renderer = null;
let scene = null;
let camera = null;

function setup(video) {
    renderer = new THREE.WebGLRenderer({});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    const geometry = new THREE.SphereBufferGeometry(100, 32, 32);
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;
    texture.repeat.x = 0.5;
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    render();
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}
