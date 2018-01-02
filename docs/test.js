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
window.onkeydown = evt => {
    if(evt.code === 'KeyS') isStereo = !isStereo;
};

function setup(video) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer = new THREE.WebGLRenderer({});
    renderer.setSize(w, h);
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 10000);
    const geometry = new THREE.SphereBufferGeometry(100, 32, 32);
    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;
    texture.repeat.y = 0.5;
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
}

function render() {
    requestAnimationFrame(render);
    if (isStereo) {
        // ステレオレンダリング
        w /= 2;
        renderer.setScissorTest(true);
        stereoRender(0, 0, w, h, 0.5);
        stereoRender(w, 0, w, h, -0.5);
        renderer.setScissorTest(false);
    } else {
        // ノーマルレンダリング
        renderer.setViewport(0, 0, w, h);
        renderer.render(scene, camera);
    }    
}

function stereoRender(left, top, width, height, repeatY) {
    texture.repeat.y = repeatY;
    renderer.setViewport(left, top, width, height);
    renderer.setScissor(left, top, width, height);
    renderer.render(scene, camera);
}

