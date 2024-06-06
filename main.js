'use strict';

let gl;                         // The webgl context
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse
let stereoCamera;               // A stereo camera object for handling stereo rendering
let texture;                    // A texture on the top of the surface
let background, texture_b;      // A background model and its associated texture
let video, track;               // A video element for webcam input and its associated track
let sphere;                     // A surface for displaying sound source rotation

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;
    this.countTexture = 0;

    this.BufferData = function (vertices, textures) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;

        if (textures != null) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

            this.countTexture = textures.length / 2;
        }
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    stereoCamera.readParams();

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.identity());

    //Binding the texture
    applyBackgroundTexture();

    background.Draw()

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.clear(gl.DEPTH_BUFFER_BIT)

    stereoCamera.ApplyLeftFrustum();

    modelViewProjection = m4.multiply(stereoCamera.mProjectionMatrix, m4.multiply(stereoCamera.mModelViewMatrix, matAccum1));

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.colorMask(true, false, false, false);

    surface.Draw();

    gl.clear(gl.DEPTH_BUFFER_BIT)

    stereoCamera.ApplyRightFrustum();

    modelViewProjection = m4.multiply(stereoCamera.mProjectionMatrix, m4.multiply(stereoCamera.mModelViewMatrix, matAccum1));

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.colorMask(false, true, true, false);

    surface.Draw();

    if (panner) {
        const step = 0.001;
        const x = Math.sin(step * Date.now());
        const y = Math.cos(step * Date.now()) / 3;
        panner.setPosition(x, y, 1);
    
        drawMovingSphere(x, y);
    }

    gl.colorMask(true, true, true, true);
}

function drawMovingSphere(x, y){
    const translationMatrix = m4.translation(x, y, 1);
    const modelViewProjectionMatrix = m4.multiply(m4.identity(), translationMatrix);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjectionMatrix);
    sphere.Draw();

    gl.clear(gl.DEPTH_BUFFER_BIT);
}

function applyBackgroundTexture(){
    gl.bindTexture(gl.TEXTURE_2D, texture_b);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
}

function CreateSurfaceData() {
    let vertexList = [];
    const uMax = Math.PI * 3.5;
    const vMax = Math.PI * 2;
    const step = 0.1;

    for (let v = -vMax; v < vMax; v += step) {
        for (let u = 0; u < uMax; u += step) {
            let v0 = CornucopiaFunc(u, v);
            let v1 = CornucopiaFunc(u + step, v);
            let v2 = CornucopiaFunc(u, v + step);
            let v3 = CornucopiaFunc(u + step, v + step);

            // First triangle
            vertexList.push(v0.x, v0.y, v0.z);
            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v2.x, v2.y, v2.z);

            // Second triangle
            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v2.x, v2.y, v2.z);

             // Disconnect the start and end of the surface
            // if (u + step >= uMax && v + step < vMax) {
              //  vertexList.push(NaN, NaN, NaN);
            //}
        }
    }

    return vertexList;
}

function CreateSurfaceTextureData() {
    let textureList = [];
    const uMax = Math.PI * 3.5;
    const vMax = Math.PI * 2;
    const step = 0.1;
    for (let v = -vMax; v < vMax; v += step) {
        for (let u = 0; u < uMax; u += step) {
            let u1 = map(u, 0, uMax, 0, 1)
            let v1 = map(v, -vMax, vMax, 0, 1)
            textureList.push(u1, v1)

            u1 = map(u + step, 0, uMax, 0, 1)
            textureList.push(u1, v1)

            u1 = map(u, 0, uMax, 0, 1)
            v1 = map(v + step, -vMax, vMax, 0, 1)
            textureList.push(u1, v1)

            u1 = map(u + step, 0, uMax, 0, 1)
            v1 = map(v, -vMax, vMax, 0, 1)
            textureList.push(u1, v1)

            v1 = map(v + step, -vMax, vMax, 0, 1)
            textureList.push(u1, v1)

            u1 = map(u, 0, uMax, 0, 1)
            v1 = map(v + step, -vMax, vMax, 0, 1)
            textureList.push(u1, v1)
        }
    }

    return textureList;
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

function CornucopiaFunc(u, v) {
    let p = 0.1;
    let m = 0.21;
    let scale = 0.16;

    let sinV = Math.sin(v);
    let cosV = Math.cos(v);
    let sinU = Math.sin(u);
    let cosU = Math.cos(u);

    let x = scale * (Math.exp(m * u) + (Math.exp(p * u) * cosV)) * cosU; 
    let y = scale * (Math.exp(m * u) + (Math.exp(p * u) * cosV)) * sinU; 
    let z = scale * Math.exp(p * u) * sinV;

    return { x, y, z };
}

function CreateCornucopiaSurface(r = 0.05, openingAngle = Math.PI / 2, latStep = 0.05) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -openingAngle * 0.5;

    while (lon < Math.PI) {
        while (lat < openingAngle * 0.5) {
            let v1 = cornucopiaSurfacePoint(r, lon, lat, openingAngle);
            vertexList.push(v1.x, v1.y, v1.z);
            lat += latStep;
        } 
    
        lat = -openingAngle * 0.5;
        lon += 0.05;
    }

    return vertexList;
}

function CornucopiaSurfacePoint(r, u, v, openingAngle) {
    let x = r * Math.sin(u) * Math.cos(v) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v) * Math.cos(v);
    let z = r * Math.cos(u) + r * Math.sin(u) * Math.sin(v) * Math.sin(openingAngle);

    return { x: x, y: y, z: z };
}

function CreateSphereSurface(r = 0.1) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    while (lon < Math.PI) {
      while (lat < Math.PI * 0.5) {
        let v1 = SphereSurfacePoint(r, lon, lat);
        vertexList.push(v1.x, v1.y, v1.z);
        lat += 0.05;
      }
      lat = -Math.PI * 0.5
      lon += 0.05;
    }
    return vertexList;
}
  
function SphereSurfacePoint(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    LoadTexture();

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData(), CreateSurfaceTextureData());

    background = new Model('WebCam');
    background.BufferData([1, 1, 0, -1, -1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, 1, -1, 0], [0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1]);

    sphere = new Model('Sphere');
    sphere.BufferData(CreateSphereSurface(0.2), CreateSphereSurface(0.2));

    stereoCamera = new StereoCamera(1, 0.5, 1, 0.8, -10, 50);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
        webCamVideo();
        startAudio();
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    
    drawUpdates();
}

function drawUpdates() {
    draw();
    window.requestAnimationFrame(drawUpdates);
}

// Loading a texture for a surface
function LoadTexture() {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    const image = new Image();
    image.crossOrigin = 'anonymus';
    image.src = "https://raw.githubusercontent.com/anndiak/WebGL-public/CGW/texture.png";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        draw();
    }
}

function webCamVideo(){
    video = document.createElement('video');
    video.setAttribute('autoplay', true);
    window.vid = video;
    getWebcam();
    СreateWebCamTexture();
}

function getWebcam() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        video.srcObject = stream;
        track = stream.getTracks()[0];
    }, function (e) {
        console.error('Rejected!', e);
    });
}

function СreateWebCamTexture() {
    texture_b = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture_b);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}