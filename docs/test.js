const video = document.createElement('video');
video.onloadedmetadata = evt => {
    video.play();
    setup(video);
};
video.src = 'sample.mp4';

let renderer = null;
let scene = null;
let texture = null;
let camera = null;
let isStereo = false;
const width = window.innerWidth;
const height = window.innerHeight;
const halfWidth = width / 2;
window.onkeydown = evt => {
    if(evt.code === 'KeyS') isStereo = !isStereo;
};

function setup(video) {
    renderer = new THREE.WebGLRenderer({});
    renderer.setSize(width, height);
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    const geometry = new THREE.SphereBufferGeometry(100, 32, 32);
    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;
    texture.repeat.y = 0.5;
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    render();
}

function render() {
    requestAnimationFrame(render);
    if (isStereo) {
        // ステレオレンダリング
        renderer.setScissorTest(true);
        stereoRender(0, 0, halfWidth, height, 0);
        stereoRender(halfWidth, 0, halfWidth, height, 0.5);
        renderer.setScissorTest(false);
    } else {
        // ノーマルレンダリング
        renderer.setViewport(0, 0, width, height);
        renderer.render(scene, camera);
    }    
}

function stereoRender(left, top, width, height, offsetY) {
    texture.offset.y = offsetY;
    renderer.setViewport(left, top, width, height);
    renderer.setScissor(left, top, width, height);
    renderer.render(scene, camera);
}

