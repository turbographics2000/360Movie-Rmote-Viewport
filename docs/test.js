const video = document.createElement('video');
video.onloadedmetadata = evt => {
    video.play();
    setup(video);
};
video.src = 'sample.mp4';

function setup(video) {
    const renderer = new THREE.WebGLRenderer({});
    document.body.appendChild(renderer.domElmeent);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, this.ouputSize.aspectRatio, 0.1, 10000);
    const geometry = new THREE.SphereBufferGeometry(100, 32, 32);
    const texture = new THREE.VideoTexture(video);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geometry, material);
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}
