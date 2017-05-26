var camera, scene, renderer;
var video, texture;
var controls, effect;
var clients = {};
var videoDownloaded = false;

function setupSender() {
    console.log('setupSender');
    // video
    var video = document.createElement('video');
    video.loop = true;
    video.muted = true;
    video.src = 'sample.mp4';
    video.setAttribute('webkit-playsinline', 'webkit-playsinline');
    video.play();

    var buffer = [];
    fetch('sample.mp4').then(res => {
        var size = res.headers.get('content-length');
        var recieved = 0;
        var reader = res.body.getReader();
        return reader.read().then(function process(result) {
            if (result.done) {
                return console.log('Fetch complete');
            }
            recieved += result.value.length;
            var percentage = recieved / size * 100;
            progressBar.style.width = percentage + '%';
            sc.send({ percentage });
            buffer.push(result.value);
            return reader.read().then(process);
        });
    }).then(_ => {
        messageContainer.style.display = 'none';
        clientList.style.display = '';
        video.src = URL.createObjectURL(new Blob(buffer, { type: 'video/mp4' }));
        video.play();
        videoDownloaded = true;
        setupScene(video);
    });
}

function setupScene(video) {
    console.log('setupScene', video);
    camera = new THREE.PerspectiveCamera(75, (window.innerWidth - 200) / window.innerHeight, 1, 1000);
    camera.layers.enable(1);

    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.NearestFilter;
    texture.maxFilter = THREE.NearestFilter;
    texture.format = THREE.RGBFormat;
    texture.generateMipmaps = false;

    scene = new THREE.Scene();

    // left, right
    [[0, 1], [0.5, 2]].forEach(val => {
        var geometry = new THREE.SphereGeometry(50, 50, 50);
        geometry.scale(-1, 1, 1);
        var uvs = geometry.faceVertexUvs[0];
        for (var i = 0; i < uvs.length; i++) {
            for (var j = 0; j < 3; j++) {
                uvs[i][j].y *= 0.5;
                uvs[i][j].y += val[0];
            }
        }
        var material = new THREE.MeshBasicMaterial({ map: texture });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = - Math.PI / 2;
        mesh.layers.set(val[1]);
        scene.add(mesh);
    });

    renderer = new THREE.WebGLRenderer();
    controls = new THREE.VRControls(camera);
    effect = new THREE.VREffect(true, renderer);
    effect.scale = 0;
    effect.setSize(window.innerWidth - 200, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    WEBVR.getVRDisplay(function (display) {
        document.body.appendChild(WEBVR.getButton(display, renderer.domElement));
    });
    window.onresize = function () {
        camera.aspect = (window.innerWidth - 200) / window.innerHeight;
        camera.updateProjectionMatrix();
        effect.setSize(window.innerWidth - 200, window.innerHeight);
    };
    render();
}

function addClient(remoteId, size) {
    console.log('addClient', `remoteId:${remoteId}`, `size:w=${size.w},h=${size.h}`);
    var rend = new THREE.WebGLRenderer();
    rend.setSize(size.w, size.h);

    var cam = new THREE.PerspectiveCamera(75, size.w / size.h, 1, 1000);
    cam.layers.enable(1);

    var cont = new THREE.VRControls(cam);
    var eff = new THREE.VREffect(false, rend);
    eff.setSize(size.w, size.h);
    rend.domElement.style.width = rend.domElement.style.height = '100%';
    var div = document.createElement('div');
    var span = document.createElement('span');
    div.className = 'client';
    span.className = 'client-title';
    span.textContent = remoteId;
    div.appendChild(span);
    div.appendChild(rend.domElement);
    clientList.appendChild(div);

    var stream = rend.domElement.captureStream(30);
    if (pcs[remoteId].addTrack) {
        pcs[remoteId].addTrack(stream.getVideoTracks()[0]);
    } else {
        pcs[remoteId].addStream(stream);
    }

    clients[remoteId] = { 
        renderer: rend, 
        camera: cam, 
        controls: cont,
        effect: eff 
    };
}

function resizeClient(remoteId, size) {
    console.log('resizeClient', `remoteId:${remoteId}`, `size:(${size.w},${size.h})`);
    var client = clients[remoteId];
    client.camera.aspect = size.w / size.h;
    client.camera.updateProjectionMatrix();
    client.effect.setSize(size.w, size.h);
}

function setupReciever(myId) {
    console.log('setupReciever', `myid:${myId}`);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    controls = new THREE.VRControls(camera, err => {
        console.log(err);
    }, myId);
    window.onresize = function () {
        if (myId) {
            sc.send({ w: window.innerWidth, h: window.innerHeight });
        }
    }
}

function render() {
    requestAnimationFrame(render);
    if (myId === 'sender') {
        controls.update();
        effect.render(scene, camera);
        Object.keys(clients).forEach(remoteId => {
            var client = clients[remoteId];
            if(client.update) {
                client.controls.senderUpdate(client.update);
            }
            client.effect.render(scene, client.camera);
        });
    } else {
        controls.recieverUpdate();
    }
}