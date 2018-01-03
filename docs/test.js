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
const renderingTypes = ['normal', 'stereo', 'anaglyph'];
let renderingTypeIndex = 0;
let width = window.innerWidth;
let height = window.innerHeight;
let halfWidth = width / 2;
let anaglyphEffect = null;
let stereoEffect = null;
let vrEffect = null;
let vrControls = null;

window.onkeydown = evt => {
    if(evt.code === 'KeyS') {
        renderingTypeIndex = (renderingTypeIndex + 1) % 3;
        onResize();
    } else evt.code === 'KeyF') {
        vrEffect.setFullScreen(true);
    }
};

function setup(video) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer = new THREE.WebGLRenderer({});
    stereoEffect = new THREE.StereoEffect(renderer);
    stereoEffect.setSize(width, height);
    anaglyphEffect = new THREE.AnaglyphEffect(renderer);
    anaglyphEffect.setSize(width, height);
    renderer.domElement.style.display = 'inherit';
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75 / 2, width / height, 0.1, 10000);
    vrControls = new THREE.VRControls(camera);
    vrEffect   = new THREE.VREffect(renderer);
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
    switch(renderingTypes[renderingTypeIndex]) {
        case 'normal':
            renderer.render(scene, camera);
            break;
        case 'stereo':
            stereoEffect.render(scene, camera);
            break;
        case 'anaglyph':
            anaglyphEffect.render(scene, camera);
            break;
    }
}

window.addEventListener('resize', onResize);
function onResize(evt) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    stereoEffect.setSize(window.innerWidth, window.innerHeight);
    anaglyphEffect.setSize(window.innerWidth, window.innerHeight);
}

