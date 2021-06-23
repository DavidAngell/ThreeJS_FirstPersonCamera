import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

let game = null;

const PointerHandler = () => {
    let _handlePointerRelease = () => {
        let mainElm = document.getElementById("main");
        if (document.pointerLockElement !== mainElm && document.mozPointerLockElement !== mainElm) {
            document.getElementById("request_pointer").style.display = "block";
            game.pauseGame();
        }
    };
  
    document.addEventListener('pointerlockchange', _handlePointerRelease, false);
    document.addEventListener('mozpointerlockchange', _handlePointerRelease, false);
    document.addEventListener('webkitpointerlockchange', _handlePointerRelease, false);
  
    return {
        requestPointerLock: () => {
            document.getElementById("request_pointer").style.display = "none";
            document.getElementById("main").requestPointerLock =  document.getElementById("main").requestPointerLock ||  document.getElementById("main").mozRequestPointerLock;
            document.getElementById("main").requestPointerLock();
            game.unpauseGame();
        },
    }
}

const FirstPersonCamera = (params) => {
    const _camera = params.camera;
    const _cameraPivot = new THREE.Object3D();
    params.scene.add(_cameraPivot);

    let yawAngle = 0;
    let pitchAngle = 0;
    let pivotRadius = 50;

    const _decceleration = new THREE.Vector3(-0.5, -9.8, -5.0);
    const _acceleration = new THREE.Vector3(30, 30, 80);
    const _velocity = new THREE.Vector3(0, 0, 0);
    const _inputHandler = FirstPersonCameraController();

    function _moveForwardAndBackward(camera_vector3, forwardDistance, angle) {
        return new THREE.Vector3(
            camera_vector3.x + forwardDistance*Math.sin(angle), 
            camera_vector3.y, 
            camera_vector3.z + forwardDistance*Math.cos(angle)
        );
    }

    function _moveSideToSide(camera_vector3, sidewaysDistance, angle) {
        return new THREE.Vector3(
            camera_vector3.x + sidewaysDistance*Math.sin(angle + Math.PI / 2), 
            camera_vector3.y, 
            camera_vector3.z + sidewaysDistance*Math.cos(angle + Math.PI / 2)
        );
    }

    function _yawCamera(vector3, angle, radius) {
        return new THREE.Vector3(
            vector3.x + radius*Math.sin(angle), 
            vector3.y, 
            vector3.z + radius*Math.cos(angle)
        );
    }

    function _pitchCamera(vector3, yawAngle, pitchAngle, radius) {
        return new THREE.Vector3(
            vector3.x + 2*radius*Math.sin(pitchAngle)*Math.sin(yawAngle), 
            vector3.y + 2*radius*Math.cos(pitchAngle), 
            vector3.z + 2*radius*Math.sin(pitchAngle)*Math.cos(yawAngle)
        );
    }

    return {
        update: (timeElapsed) => {
            let input = _inputHandler.getControllerState();

            const velocity = _velocity;
            const acc = _acceleration.clone();
            const frameDecceleration = new THREE.Vector3(velocity.x * _decceleration.x, velocity.y * _decceleration.y, velocity.z * _decceleration.z);
            frameDecceleration.multiplyScalar(timeElapsed);
            frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));
            velocity.add(frameDecceleration);

            let forwardDistance = 0;
            let sidewaysDistance = 0;

            //Handle Keyboard Inputs
            if (input.keys.shift) acc.z *= 2.0;
            if (input.keys.forward) forwardDistance += acc.z * timeElapsed;
            if (input.keys.backward) forwardDistance -= acc.z * timeElapsed;
            if (input.keys.right) sidewaysDistance -= acc.x * timeElapsed;
            if (input.keys.left) sidewaysDistance += acc.x * timeElapsed;

            //Update Camera Postition
            _camera.position.copy(_moveForwardAndBackward(_camera.position, forwardDistance, yawAngle));
            _camera.position.copy(_moveSideToSide(_camera.position, sidewaysDistance, yawAngle));

            //Update Camera Yaw
            yawAngle -= input.mouseCoordinates.xOffset / 100;
            _cameraPivot.position.copy(_yawCamera(_camera.position, yawAngle, pivotRadius));

            //Update Camera Pitch
            if (pitchAngle + input.mouseCoordinates.yOffset / 50 < 3.14 && pitchAngle + input.mouseCoordinates.yOffset / 50 > 0)
                pitchAngle += input.mouseCoordinates.yOffset / 50;
            
            _cameraPivot.position.copy(_pitchCamera(_cameraPivot.position, yawAngle, pitchAngle, pivotRadius));
            _camera.lookAt(_cameraPivot.position);

            //Reset Mouse Offsets
            _inputHandler.setMouseCoordinates(0, 0);

        }
    };
};

const FirstPersonCameraController = () => {
    let _mouseCoordinates = { xOffset: 0, yOffset: 0 };
    let _keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false,
    };

    function _onKeyDown(event) {
        switch (event.keyCode) {
            case 87: // w
                _keys.forward = true;
                break;
            case 65: // a
                _keys.left = true;
                break;
            case 83: // s
                _keys.backward = true;
                break;
            case 68: // d
                _keys.right = true;
                break;
            case 32: // SPACE
                _keys.space = true;
                break;
            case 16: // SHIFT
                _keys.shift = true;
                break;
        }
    }

    function _onKeyUp(event) {
        switch(event.keyCode) {
            case 87: // w
                _keys.forward = false;
                break;
            case 65: // a
                _keys.left = false;
                break;
            case 83: // s
                _keys.backward = false;
                break;
            case 68: // d
                _keys.right = false;
                break;
            case 32: // SPACE
                _keys.space = false;
                break;
            case 16: // SHIFT
                _keys.shift = false;
                break;
        }
    }

    function _onMouseMove(e) {
        _mouseCoordinates.xOffset = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        _mouseCoordinates.yOffset = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
    }

    document.addEventListener('keydown', e => _onKeyDown(e));
    document.addEventListener('keyup', e => _onKeyUp(e));
    document.addEventListener('mousemove', e => _onMouseMove(e));

    return {
        getControllerState: () => ({ mouseCoordinates: _mouseCoordinates, keys: _keys }),
        setMouseCoordinates: (x, y) => _mouseCoordinates = { xOffset: x, yOffset: y },
    }
}

const Game = () => {
    //Private Vars
    const fov = 60;
    const aspect = 1920 / 1080;
    const nearClip = 1.0;
    const far = 1000.0;

    let _mixers = [];
    let _previousRAF = null;
    let _controls;
    let _firstPersonCamera;
    let _isPaused = true;
  
    //Load Scene
    const threeJS = new THREE.WebGLRenderer({ antialias: true });
    threeJS.outputEncoding = THREE.sRGBEncoding;
    threeJS.shadowMap.enabled = true;
    threeJS.shadowMap.type = THREE.PCFSoftShadowMap;
    threeJS.setPixelRatio(window.devicePixelRatio);
    threeJS.setSize(window.innerWidth, window.innerHeight);
  
    document.getElementById("main").appendChild(threeJS.domElement);
  
    window.addEventListener('resize', () => _onWindowResize(), false);
    
    const _scene = new THREE.Scene();
    const _camera = new THREE.PerspectiveCamera(fov, aspect, nearClip, far);
    _camera.position.set(25, 10, 25);
  
    let light = new THREE.AmbientLight(0xFFFFFF, 0.25);
    _scene.add(light);
  
    const loader = new THREE.CubeTextureLoader();
    const skyBoxTexture = loader.load([
        './resources/posx.jpg',
        './resources/negx.jpg',
        './resources/posy.jpg',
        './resources/negy.jpg',
        './resources/posz.jpg',
        './resources/negz.jpg',
    ]);
    skyBoxTexture.encoding = THREE.sRGBEncoding;
    _scene.background = skyBoxTexture;

    //Private Functions
    function _loadCameraSystem() {
        _controls = FirstPersonCameraController({ camera: _camera, scene: _scene });
        _firstPersonCamera = FirstPersonCamera({ camera: _camera, scene: _scene });
    }
    
    function _onWindowResize() {
        _camera.aspect = window.innerWidth / window.innerHeight;
        _camera.updateProjectionMatrix();
        threeJS.setSize(window.innerWidth, window.innerHeight);
    }
      
    function _RAF() {
        requestAnimationFrame(t => {
            if (!_isPaused) {
                if (_previousRAF === null) _previousRAF = t;
        
                threeJS.render(_scene, _camera);
                _step(t - _previousRAF);
                _previousRAF = t;
            }
            
            _RAF();
        });
    }

    function _step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (_mixers) _mixers.map(m => m.update(timeElapsedS));
        _firstPersonCamera.update(timeElapsedS);
    }
  
    //Load Ground
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100, 10, 10), new THREE.MeshStandardMaterial({ color: 0x808080 }));
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    _scene.add(plane);
  
    _loadCameraSystem();
    _RAF();
  
    //Public Functions
    return {
        isPaused: () => _isPaused, 
        unpauseGame: () => _isPaused = false,
        pauseGame: () => _isPaused = true,
    };
}

window.addEventListener('DOMContentLoaded', () => {
    game = Game();

    let pointerHandler = PointerHandler();
    document.getElementById("request_pointer").onclick = () => {
        pointerHandler.requestPointerLock();
    };
});