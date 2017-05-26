var sc = new BroadcastChannel('Remote-Viewport');
sc.send = (data) => sc.postMessage(JSON.stringify(data));
sc.onmessage = processMessage;
var pcs = {}, pc;
var myId;
var remoteIdx = 0;

window.onload = function () {
    sc.send({ connect: { w: window.innerWidth, h: window.innerHeight } });
}

function processMessage(evt) {
    var msg = JSON.parse(evt.data);
    if (msg.to && msg.to !== myId) {
        console.log(msg.to, myId);
        return;
    }
    if (msg.connect) {
        if (!myId || myId === 'sender') {
            if (!myId) {
                setupSender();
                myIdTitle.textContent = myId = 'sender';
                info.style.display = '';
            }
            var remoteId = 'reciever' + (remoteIdx++);
            setupPeerConnection(remoteId);
            sc.send({ reciever: remoteId, videoDownloaded });
            addClient(remoteId, msg.connect);
        }
    } else if(msg.close) {
        if(myId === 'sender') {
            if(pcs[msg.close]) {
                pcs[msg.close].close();
            }
        } 
    } else if (msg.reciever && !myId) {
        myIdTitle.textContent = myId = msg.reciever;
        info.style.display = '';
        pc = setupPeerConnection('sender');
        recieverMessage.style.display = '';
        recieverViewer.style.display = msg.videoDownloaded ? '' : 'none';
        setupReciever(msg.ready);
        if(msg.videoDownloaded) {
            render();
        }
    } else if (msg.percentage) {
        progressBar.style.width = msg.percentage + '%';
        if (msg.percentage >= 100) {
            recieverViewer.style.display = '';
            messageContainer.style.display = 'none';
            render();
        }
    } else if (msg.update) {
        if (myId === 'sender') {
            clients[msg.from].update = msg.update;
        }
    } else if (msg.resize) {
        if (myId === 'sender') {
            resizeClient(msg.from, msg.resize);
        }
    } else if (msg.desc) {
        console.log('desc', msg.desc, msg.from);
        if (!pcs[msg.from]) setupPeerConnection(msg.from);
        var pc = pcs[msg.from];
        var desc = msg.desc;
        if (desc.type === 'offer') {
            console.log('recieve offer', `from:${msg.from}`, `to:${msg.to}`, desc);
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .then(_ => {
                    console.log('create answer');
                    return pc.createAnswer()
                })
                .then(answer => {
                    console.log('answer, setLocalDescription', answer);
                    return pc.setLocalDescription(answer)
                })
                .then(_ => {
                    console.log('send answer', `from:${myId}`, `to:${msg.from}`);
                    return sc.send({ desc: pc.localDescription, from: myId, to: msg.from })
                })
                .catch(error => console.log('recieveOffer', error));
        } else if (desc.type === 'answer') {
            console.log('recieve answer', `from:${msg.from}`, `to:${msg.to}`, desc);
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .catch(error => console.log('recieveAnswer', error));
        } else {
            console.log('Unsupported SDP type.');
        }
    } else if (msg.candidate) {
        console.log('recieve candidate', `from:${msg.from}`, `to:${msg.to}`, msg.candidate);
        //if (!pcs[msg.from]) setupPeerConnection(msg.from);
        pcs[msg.from].addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
}

function setupPeerConnection(remoteId) {
    var pc = new RTCPeerConnection(null);
    pc.remoteId = remoteId;
    pc.onicecandidate = function (evt) {
        console.log('onicecandidate', `from:${myId}`, `to:${this.remoteId}`);
        sc.send({
            candidate: evt.candidate,
            from: myId,
            to: this.remoteId
        });
    }
    pc.onnegotiationneeded = function (evt) {
        console.log('onnegotiationneeded', this.remoteId);
        pc.createOffer()
            .then(offer => {
                console.log('create offer', `remoteId:${pc.remoteId}`, offer);
                return pc.setLocalDescription(offer);
            })
            .then(_ => {
                console.log('send offer', pc.localDescription, `from:${myId}`, `to:${pc.remoteId}`);
                sc.send({
                    desc: pc.localDescription,
                    from: myId,
                    to: pc.remoteId
                });
            })
            .catch(error => console.log('createOffer', error));
    }
    if ('onaddstream' in pc) {
        pc.onaddstream = function (evt) {
            console.log('onaddstream', `remoteId:${this.remoteId}`);
            recieverViewer.srcObject = evt.stream;
        }
    } else {
        pc.ontrack = function (evt) {
            console.log('ontrack', this.remoteId);
            recieverViewer.srcObject = evt.streams[0];
        }
    }
    pc.oniceconnectionstatechange = function () {
        if (!this) return;
        console.log('ICE connection Status has changed to ' + this.iceConnectionState);
        if (['closed', 'failed'].includes(pc.iceConnectionState)) {
            try {
                this.close();
            } catch (ex) {
                console.log('close exception', ex);
            }
            delete pcs[this.remoteId];
            if (myId === 'sender' && clients[this.remoteId]) {
                clientList.removeChild(clients[this.remoteId].renderer.domElement.parentElement);
                delete clients[this.remoteId];
            }
        }
    };
    pcs[remoteId] = pc;
    return pc;
}

window.onbeforeunload = function () {
    if (myId && myId !== 'sender' && pc) {
        sc.send({ close: myId });
    }
}
