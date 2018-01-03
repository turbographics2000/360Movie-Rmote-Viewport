/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 */

class VRControls {
    constructor(object, onError) {
        this.object = object;
        this.onError = onError;
        this.vrDisplay = null;
        this.vrDisplays = null;
        this.standingMatrix = new THREE.Matrix4();
        this.frameData = 'VRFrameData' in window ? new VRFrameData() : null;

        if (navigator.getVRDisplays) {
            navigator.getVRDisplays().then(displays => {
                this.vrDisplays = displays;
                if (displays.length > 0) {
                    this.vrDisplay = displays[0];
                } else {
                    if (onError) onError('VR input not available.');
                }
            }).catch(_ => {
                console.warn('THREE.VRControls: Unable to get VR Displays');
            });
        }

        // the Rift SDK returns the position in meters
        // this scale factor allows the user to define how meters
        // are converted to scene units.

        this.scale = 1;

        // If true will use "standing space" coordinate system where y=0 is the
        // floor and x=0, z=0 is the center of the room.
        this.standing = false;

        // Distance from the users eyes to the floor in meters. Used when
        // standing=true but the VRDisplay doesn't provide stageParameters.
        this.userHeight = 1.6;
    }

    get VRDisplay() {
        return this.vrDisplay;
    }

    set VRDisplay(value) {
        this.vrDisplay = value;
    }

    get VRDisplays() {
        console.warn('THREE.VRControls: getVRDisplays() is being deprecated.');
        return this.vrDisplays;
    }

    get StandingMatrix() {
        return this.standingMatrix;
    }

    update() {
        if (this.vrDisplay) {
            let pose = null;
            if (this.vrDisplay.getFrameData) {
                this.vrDisplay.getFrameData(this.frameData);
                pose = this.frameData.pose;
            } else if (this.vrDisplay.getPose) {
                pose = this.vrDisplay.getPose();
            }

            if (pose.orientation !== null) {
                this.object.quaternion.fromArray(pose.orientation);
            }

            if (pose.position !== null) {
                this.object.position.fromArray(pose.position);
            } else {
                this.object.position.set(0, 0, 0);
            }

            if (this.standing) {
                if (this.vrDisplay.stageParameters) {
                    this.object.updateMatrix();
                    this.standingMatrix.fromArray(this.vrDisplay.stageParameters.sittingToStandingTransform);
                    this.object.applyMatrix(this.standingMatrix);
                } else {
                    this.object.position.setY(this.object.position.y + this.userHeight);
                }
            }

            this.object.position.multiplyScalar(this.scale);
        }
    }

    dispose() {
        this.vrDisplay = null;
    }
}

THREE.VRControls = VRControls;
