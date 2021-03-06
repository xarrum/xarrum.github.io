var canvas; // The canvas

var gl; // The GL context
var shaderProgram; // The shader program
var vertexPosAttrib; // The vertex position attribute location
var solidVertexBuffer; // The vertex buffer for solid cube
var solidVertices; // Vertex data for solid cube

var cubeSize = 1.75; // Size of the cubes

var aspectRatio;

var viewMatrix; // The view matrix
var projectionMatrix; // The projection matrix

function Start(){
	// Get canvas
	canvas = document.getElementById("glcanvas");
	
	cubeSize = 0.75;

	// Update canvas size
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	// Update aspect ratio var
	aspectRatio = canvas.width / canvas.height;

	gl = InitWebGL(canvas);
	
	if (gl){
		// Depth testing
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);

		// Initialize shaders
		InitShaders();

		// Initialize buffers
		InitBuffers();

		// Draw the scene
		setInterval(DrawScene, 83);
	}
}

function Resize(){
	// Get canvas
	canvas = document.getElementById("glcanvas");
	
	// Update canvas size
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	// Update aspect ratio var
	aspectRatio = canvas.width / canvas.height;
	
	// Set viewport
	gl.viewport(0, 0, canvas.width, canvas.height);
}

function InitWebGL(canvas){
	gl = null;

	try{
		// Try to grab the standard context. If it fails, fallback to experimental.
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	}
	catch(e) {}

	// If we don't have a GL context, give up now
	if (!gl){
		alert("Unable to initialize WebGL. Your browser may not support it.");
		gl = null;
	}

	return gl;
}

function InitShaders(){
	var vs = GetShader(gl, "shader-vs");
	var fs = GetShader(gl, "shader-fs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vs);
	gl.attachShader(shaderProgram, fs);
	gl.linkProgram(shaderProgram);

	// Check shader is ok
	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
		alert("GL Shader program initialization failed.");
	}

	gl.useProgram(shaderProgram);

	vertexPosAttrib = gl.getAttribLocation(shaderProgram, "aVertexPos");
	gl.enableVertexAttribArray(vertexPosAttrib);
}

function GetShader(gl, id){
	var shaderScript;
	
	shaderScript = document.getElementById(id);
	
	if(!shaderScript){
		return null;
	}
	
	var shaderSource = "";
	var currentChild = shaderScript.firstChild;
	
	while(currentChild){
		if(currentChild.nodeType == currentChild.TEXT_NODE){
			shaderSource = currentChild.textContent;
		}
		
		currentChild = currentChild.nextSibling;
	}
	
	var shader;
	if(shaderScript.type == "x-shader/x-vertex"){
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else if(shaderScript.type == "x-shader/x-fragment"){
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else{
		return null;
	}
	
	gl.shaderSource(shader, shaderSource);
	
	gl.compileShader(shader);
	
	// Check shader is ok
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	
	return shader;
}

function InitBuffers(){	
	solidVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, solidVertexBuffer);
	solidVertices = [
		-1.0, -1.0, 1.0, // Start
		-1.0, 1.0, 1.0,
		1.0, -1.0, 1.0,
		1.0, 1.0, 1.0,
		
		1.0, -1.0, -1.0,
		1.0, 1.0, -1.0,
		-1.0, -1.0, -1.0,
		
		-1.0, 1.0, -1.0,
		-1.0, -1.0, 1.0,
		-1.0, 1.0, 1.0,
		
		-1.0, 1.0, 1.0, // Degenerate
		-1.0, 1.0, -1.0,
		1.0, 1.0, 1.0,
		1.0, 1.0, -1.0
		
		
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(solidVertices), gl.STATIC_DRAW);
}

function DrawScene(){
	// Time
	var time = Date.now();
	var timeScale = 0.000005;
	
	// Camera
	var cameraPosition = $V([
							15.0 * Math.sin(time * timeScale+0.4), 
							6.0, 
							15.0 * Math.cos(time * timeScale+0.4)
							]);
	
	var cameraRotation = -(time * timeScale+0.4);
	var cameraRotationAxis = $V([0.0, 1.0, 0.0]);
	
	cameraPosition = Vector.Zero(3).subtract(cameraPosition);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	//gl.clearColor(0.97, 0.94, 0.92, 1.0);

	// Clear the color as well as the depth buffer.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Calculate the camera matrix
	projectionMatrix = makePerspective(45.0, aspectRatio, 0.1, 100.0);

	viewMatrix = Matrix.I(4);
	viewMatrix = viewMatrix.x(Matrix.Rotation(0.25, $V([1.0, 0.0, 0.0])).ensure4x4());
	viewMatrix = viewMatrix.x(Matrix.Rotation(cameraRotation, cameraRotationAxis).ensure4x4());
	viewMatrix = viewMatrix.x(Matrix.Translation(cameraPosition).ensure4x4());

	var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	gl.uniformMatrix4fv(pUniform, false, new Float32Array(projectionMatrix.flatten()));

	var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	gl.uniformMatrix4fv(mvUniform, false, new Float32Array(viewMatrix.flatten()));

	
	var offsetUniform = gl.getUniformLocation(shaderProgram, "uOffset");
	var colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
	
	var cubeSizeUniform = gl.getUniformLocation(shaderProgram, "uCubeSize");
	gl.uniform1f(cubeSizeUniform, cubeSize);
	
	var numCubes = 10;
	var cubeTimeScale = 0.000025;
	
	// Draw solids
	gl.bindBuffer(gl.ARRAY_BUFFER, solidVertexBuffer);
	gl.vertexAttribPointer(vertexPosAttrib, 3, gl.FLOAT, false, 0, 0);
	
	// Draw som pretty rainbow colors
	var cR = Math.sin(time * 0.00005 + 0.0)*0.5 + 0.5;
	var cG = Math.sin(time * 0.00005 + 2.0)*0.5 + 0.5;
	var cB = Math.sin(time * 0.00005 + 4.0)*0.5 + 0.5;
	gl.uniform4f(colorUniform, cR, cG, cB, 1.0);
	
	for( y=0; y < numCubes; y++ ){
		for( x=0; x < numCubes; x++ ){		
			gl.uniform3f(offsetUniform, 
			2.0*x-numCubes+1.0, 
			0.75 * Math.sin(x + time * cubeTimeScale) * Math.cos(y + time * cubeTimeScale), 
			2.0*y-numCubes+1.0
			);
			
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, solidVertices.length / 3);
		}
	}
	
}








