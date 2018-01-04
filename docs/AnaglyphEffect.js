/**
 * @author mrdoob / http://mrdoob.com/
 * @author marklundin / http://mark-lundin.com/
 * @author alteredq / http://alteredqualia.com/
 * @author tschw
 */

class AnaglyphEffect {
    constructor(renderer, width = 512, height = 512, texture) {
        this.renderer = renderer;
        // Matrices generated with angler.js https://github.com/tschw/angler.js/
        // (in column-major element order, as accepted by WebGL)

        this.colorMatrixLeft = new THREE.Matrix3().fromArray([
            1.0671679973602295, -0.0016435992438346148, 0.0001777536963345483,  // r out
            -0.028107794001698494, -0.00019593400065787137, -0.0002875397040043026, // g out
            -0.04279090091586113, 0.000015809757314855233, -0.00024287120322696865 // b out
        ]);

        //          red                  green                    blue                 -->in

        this.colorMatrixRight = new THREE.Matrix3().fromArray([
            -0.0355340838432312, -0.06440307199954987, 0.018319187685847282,   // r out
            -0.10269022732973099, 0.8079727292060852, -0.04835830628871918,   // g out
            0.0001224992738571018, -0.009558862075209618, 0.567823588848114       // b out
        ]);

        this._camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
        this._scene = new THREE.Scene();
        this._stereo = new THREE.StereoCamera();
        const _params = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat
        };
        
        if(!texture) {    
            this._renderTargetL = new THREE.WebGLRenderTarget(width, height, _params);
            this._renderTargetR = new THREE.WebGLRenderTarget(width, height, _params);
        }
        const _material = new THREE.ShaderMaterial({
            uniforms: {
                mapLeft: { value: texture || this._renderTargetL.texture },
                mapRight: { value: texture || this._renderTargetR.texture },
                repeat: { value: texuture ? 0.5 : 1 },
                offset: { value: texuture ? 0.5 : 0 },
                colorMatrixLeft: { value: this.colorMatrixLeft },
                colorMatrixRight: { value: this.colorMatrixRight }
            },
            vertexShader: `
varying vec2 vUv;
void main() {
    vUv = vec2( uv.x, uv.y );
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,
            fragmentShader: `
uniform sampler2D mapLeft;
uniform sampler2D mapRight;
uniform float repeat;
uniform float offset;
varying vec2 vUv;
uniform mat3 colorMatrixLeft;
uniform mat3 colorMatrixRight;

float lin( float c ) {
    return c <= 0.04045 ? c * 0.0773993808 : pow( c * 0.9478672986 + 0.0521327014, 2.4 );
}

vec4 lin( vec4 c ) {
    return vec4( lin( c.r ), lin( c.g ), lin( c.b ), c.a );
}

float dev( float c ) {
    return c <= 0.0031308 ? c * 12.92 : pow( c, 0.41666 ) * 1.055 - 0.055;
}

void main() {
    vec2 uv = vUv;
    uv.u *= repeat;
    uv.v += offset;
    vec4 colorL = lin( texture2D( mapLeft, uv ) );
    vec4 colorR = lin( texture2D( mapRight, uv ) );
    vec3 color = clamp(colorMatrixLeft * colorL.rgb + colorMatrixRight * colorR.rgb, 0., 1. );
    gl_FragColor = vec4(dev( color.r ), dev( color.g ), dev( color.b ), max( colorL.a, colorR.a ));
}`
        });

        const mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), _material);
        this._scene.add(mesh);
    }

    setSize(width, height) {
        this.renderer.setSize(width, height);
        const pixelRatio = renderer.getPixelRatio();
        if(this._renderTargetL) {
            this._renderTargetL.setSize(width * pixelRatio, height * pixelRatio);
            this._renderTargetR.setSize(width * pixelRatio, height * pixelRatio);
        }
    }

    render(scene, camera) {
        scene.updateMatrixWorld();
        if (camera.parent === null) camera.updateMatrixWorld();
        this._stereo.update(camera);
        if(this._renderTargetL) {
            this.renderer.render(scene, this._stereo.cameraL, this._renderTargetL, true);
            this.renderer.render(scene, this._stereo.cameraR, this._renderTargetR, true);
        }
        this.renderer.render(this._scene, this._camera);
    }

    dispose() {
        if (this._renderTargetL) this._renderTargetL.dispose();
        if (this._renderTargetR) this._renderTargetR.dispose();
    }
}

THREE.AnaglyphEffect = AnaglyphEffect;
