var sc = new BroadcastChannel('Remote-Viewport');
sc.send = (data) => sc.postMessage(JSON.stringify(data));
sc.onmessage = processMessage;
var pcs = {}, pc, dcs = {}, dc;
var myId;
var remoteIdx = 0;

window.onload = function () {
    if (debugLevel >= 2) console.log('window.onload');
    sc.send({ connect: { w: window.innerWidth, h: window.innerHeight } });
}

function processMessage(evt) {
    var msg = JSON.parse(evt.data);
    if (msg.to && msg.to !== myId) {
        return;
    }
    if (debugLevel >= 3) console.log('signaling message', msg);
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
    } else if (msg.close) {
        if (myId === 'sender') {
            if (pcs[msg.close]) {
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
        if (msg.videoDownloaded) {
            render();
        }
    } else if (msg.percentage) {
        progressBar.style.width = msg.percentage + '%';
        if (msg.percentage >= 100) {
            recieverViewer.style.display = '';
            messageContainer.style.display = 'none';
            render();
        }
    } else if (msg.resize) {
        if (myId === 'sender') {
            resizeClient(msg.from, msg.resize);
        }
    } else if (msg.desc) {
        if (!pcs[msg.from]) setupPeerConnection(msg.from);
        var pc = pcs[msg.from];
        var desc = msg.desc;
        if (desc.type === 'offer') {
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .then(_ => {
                    return pc.createAnswer()
                })
                .then(answer => {
                    return pc.setLocalDescription(answer)
                })
                .then(_ => {
                    return sc.send({ desc: pc.localDescription, from: myId, to: msg.from })
                })
                .catch(error => console.log('recieveOffer', error));
        } else if (desc.type === 'answer') {
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .catch(error => console.log('recieveAnswer', error));
        } else {
            console.log('Unsupported SDP type.');
        }
    } else if (msg.candidate) {
        pcs[msg.from].addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
}

function setupPeerConnection(remoteId) {
    if (debugLevel >= 2) console.log('setupPeerConnection', `remoteId:${remoteId}`);
    var pc = new RTCPeerConnection(null);
    pc.remoteId = remoteId;
    pc.onicecandidate = function (evt) {
        if (debugLevel >= 2) console.log('pc.onicecandidate', `from:${myId}`, `to:${this.remoteId}`);
        sc.send({
            candidate: evt.candidate,
            from: myId,
            to: this.remoteId
        });
    };
    pc.onnegotiationneeded = function (evt) {
        if (debugLevel >= 2) console.log('pc.onnegotiationneeded', this.remoteId);
        pc.createOffer()
            .then(offer => {
                return pc.setLocalDescription(offer);
            })
            .then(_ => {
                sc.send({
                    desc: pc.localDescription,
                    from: myId,
                    to: pc.remoteId
                });
            })
            .catch(error => console.log('createOffer', error));
    };
    pc.onsignalingstatechange = function () {
        if (debugLevel >= 1) console.log(`signalingState:${this.signalingState}`);
        if (debugLevel >= 2) console.log('pc.onsignalingstatechange', `remoteId:${this.remoteId}`);
    };
    pc.oniceconnectionstatechange = function () {
        if (debugLevel >= 1) console.log(`iceConnectionState:${this.iceConnectionState}`);
        if (debugLevel >= 2) console.log('pc.iceConnectionState', `remoteId:${this.remoteId}`);
        if (!this) return;
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
    pc.onicegatheringstatechange = function () {
        if (debugLevel >= 1) console.log(`iceGatheringState:${this.iceGatheringState}`);
        if (debugLevel >= 2) console.log('pc.onicegatheringstatechange', `remoteId:${this.remoteId}`);
    };
    pc.onconnectionstatechange = function () {
        if (debugLevel >= 1) console.log('pc.onconnectionstatechange', `remoteId:${this.remoteId}`);
        if (debugLevel >= 2) console.log(`connectionState:${this.connectionState}`);
    };
    if ('onaddstream' in pc) {
        pc.onaddstream = function (evt) {
            if (debugLevel >= 2) console.log('pc.onaddstream', `remoteId:${this.remoteId}`);
            recieverViewer.srcObject = evt.stream;
        };
    } else {
        pc.ontrack = function (evt) {
            if (debugLevel >= 2) console.log('pc.ontrack', this.remoteId);
            recieverViewer.srcObject = evt.streams[0];
        };
    }
    pc.ondatachannel = function (evt) {
        if (debugLevel >= 2) console.log('pc.ondatachannel', `remoteId:$${this.remoteId}`, `label:${evt.channel.label}`);
        dc = evt.channel;
    }


    if (myId === 'sender') {
        createDataChannel(pc);
    }
    pcs[remoteId] = pc;
    return pc;
}

function createDataChannel(pc) {
    if (debugLevel >= 2) console.log('createDataChannel', `remoteId:${pc.remoteId}`);
    var dc = dcs[pc.remoteId] = pc.createDataChannel('remoteControl');
    dc.remoteId = pc.remoteId;
    dc.onopen = function (evt) {
        if (debugLevel >= 2) console.log('dc.open', `label:${this.label}`, `remoteId:${this.remoteId}`);
    }
    dc.onmessage = function (evt) {
        var msg = JSON.parse(evt.data);
        if (debugLevel >= 4) console.log('dataChannel message', `label:${this.label}`, `remoteId:${this.remoteId}`, msg);
        if (msg.update) {
            if (myId === 'sender') {
                clients[msg.from].update = msg.update;
            }
        }
    }
    dc.onclose = function (evt) {
        if (debugLevel >= 2) console.log(`dc.close`, `label:${this.label}`, `remoteId:${this.remoteId}`);
    }
}

window.onbeforeunload = function () {
    if (debugLevel >= 2) console.log('window.onbeforeunload');
    if (myId && myId !== 'sender' && pc) {
        sc.send({ close: myId });
    }
}
