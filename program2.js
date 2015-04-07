var canvas;
var gl;
var programId;

// Binds "on-change" events for the controls on the web page
function initControlEvents() {
    document.getElementById("superquadric-constant-n1").onchange = 
        function(e) {
			rebuildAll();
        };
    document.getElementById("superquadric-constant-n2").onchange = 
        function(e) {
			rebuildAll();
        };
	document.getElementById("superquadric-constant-a").onchange = 
        function(e) {
			rebuildAll();
        };
	document.getElementById("superquadric-constant-b").onchange = 
        function(e) {
			rebuildAll();
        };
	document.getElementById("superquadric-constant-c").onchange = 
        function(e) {
			rebuildAll();
        };
	document.getElementById("FOV").onchange = 
        function(e) {
			var fov = getFOV().FOV;
			var z;
			switch(fov) {
				case 30:
					z = 1.25;
					break;
				case 60:
					z = 1;
					break;
				case 90:
					z = 0.75;
					break;
				case 120:
					z = 0.5;
					break;
			}
			left = -2.0/z;
			right = 2.0/z;
			ytop = 2.0/z;
			bottom = -2.0/z;
			rebuildAll();
        };
	document.getElementById("foreground-color").onchange = 
        function(e) {
			rebuildAll();
        };
	
	document.getElementById("Button1").onclick = function(){near  *= 1.1; far *= 1.1;};
    document.getElementById("Button2").onclick = function(){near  *= 0.9; far *= 0.9;};
    document.getElementById("Button3").onclick = function(){radius *= 2.0;};
    document.getElementById("Button4").onclick = function(){radius *= 0.5;};
	document.getElementById("Button5").onclick = function(){theta += dr;};
    document.getElementById("Button6").onclick = function(){theta -= dr;};
    document.getElementById("Button7").onclick = function(){phi += dr;};
    document.getElementById("Button8").onclick = function(){phi -= dr;};
    document.getElementById("Button9").onclick = function(){left  *= 0.9; right *= 0.9;};
    document.getElementById("Button10").onclick = function(){left *= 1.1; right *= 1.1;};
    document.getElementById("Button11").onclick = function(){ytop  *= 0.9; bottom *= 0.9;};
    document.getElementById("Button12").onclick = function(){ytop *= 1.1; bottom *= 1.1;};
}

// Function for querying the current superquadric constants: a, b, c, d, n1, n2
function getSuperquadricConstants() {
    return {
        n1: parseFloat(document.getElementById("superquadric-constant-n1").value),
        n2: parseFloat(document.getElementById("superquadric-constant-n2").value),
        a: parseFloat(document.getElementById("superquadric-constant-a").value),
		b: parseFloat(document.getElementById("superquadric-constant-b").value),
		c: parseFloat(document.getElementById("superquadric-constant-c").value),
    }
}

function getFOV() {
	return {
		FOV: parseFloat(document.getElementById("FOV").value)
	}
}

// Function for querying the current wireframe color
function getWireframeColor() {
    var hex = document.getElementById("foreground-color").value;
    var red = parseInt(hex.substring(1, 3), 16);
    var green = parseInt(hex.substring(3, 5), 16);
    var blue = parseInt(hex.substring(5, 7), 16);
    return vec3(red / 255.0, green / 255.0, blue / 255.0);
}

window.onload = function() {
    // Find the canvas on the page
    canvas = document.getElementById("gl-canvas");
    
    // Initialize a WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert("WebGL isn't available"); 
    }
	
	if (gl) {
		gl.viewport( 0, 0, canvas.width, canvas.height );
		gl.clearColor(1.0, 1.0, 1.0, 1.0);                      // Set clear color to black, fully opaque
		gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
		//gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
		//gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
	}
	
	
    // Load shaders
    programId = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(programId);
    
    // Set up events for the HTML controls
    initControlEvents();

	thetaLocation = gl.getUniformLocation( programId, "theta" );
	
	initSuperEllipsoid();
	rebuildPointsArray();
	rebuildVBO();
	
    window.setInterval(function () {
		// Left and right (Azimuth) rotation
  		if (rotatingLeft) {
            //Theta = add(Theta, dTheta);
			theta = theta - dr;
			rotatingLeft = false;
        }
		else if (rotatingRight) {
			theta = theta + dr;
			rotatingRight = false;
        }
		// Up and down (altitude) rotation
		if (rotatingUp) {
			phi = phi - dr;
			if(phi < -Math.PI) {
				phi = 0.0;
			}
			rotatingUp = false;
        }
		else if (rotatingDown) {
			phi = phi + dr;
			if(phi > Math.PI) {
				phi = 0.0;
			}
			rotatingDown = false;
        }
		render();	
	}, 16);
};

window.onmousedown = function() {
	mouseDown = true;
	cMouseX = event.clientX;
}

window.onmouseup = function() {
	mouseDown = false;
	cMouseX = 0.0;
	nMouseX = 0.0;
	rotatingLeft = false;
	rotatingRight = false;
	rotatingUp = false;
	rotatingDown = false;
}

window.onmousemove = function() {
	if(mouseDown) {
		
		// Check for left or right mouse motion
		nMouseX = event.clientX;
		var dX = cMouseX - nMouseX;
		
		if(dX < -0) {
			// Then rotate left
			rotatingLeft = true;
			rotatingRight = false;
		}
		else if(dX > 0) {
			// Then rotate right
			rotatingLeft = false;
			rotatingRight = true;
		}
		
		// Check for up or down mouse motion
		nMouseY = event.clientY;
		var dY = cMouseY - nMouseY;
		cMouseY = nMouseY;
		
		
		if(dY < -0) {
			// Then rotate down
			rotatingUp = false;
			rotatingDown = true;
		}
		else if(dY > 0) {
			// Then rotate up
			rotatingUp = true;
			rotatingDown = false;
		}
		
		
	}
}

window.onkeydown = function() {
	var rebuild = false;
	// < and > keys...
	if(event.keyCode == 188) {
		// Then < was pressed
		left  *= 0.9; right *= 0.9;
		ytop  *= 0.9; bottom *= 0.9;
		rebuild = true;
	}
	else if(event.keyCode == 190) {
		// Then < was pressed
		left  *= 1.1; right *= 1.1;
		ytop  *= 1.1; bottom *= 1.1;
		rebuild = true;
	}
	
	// Up, down, left, and right arrow keys...
	if(event.keyCode == 37) {
		// Then left was pressed
		xPan = xPan - 0.2;
		rebuild = true;
	}
	if(event.keyCode == 39) {
		// Then right was pressed
		xPan = xPan + 0.2;
		rebuild = true;
	}
	if(event.keyCode == 38) {
		// Then down was pressed
		yPan = yPan + 0.2;
		rebuild = true;
	}
	if(event.keyCode == 40) {
		// Then up was pressed
		yPan = yPan - 0.2;
		rebuild = true;
	}
	
	
	
	if(rebuild) {
		rebuildAll();
	}
}

// Other Global Variables
var xPan = 0.0;
var yPan = 0.0;

var nRows = 32;
var nColumns = 32;
var pointsArray = [];

var canvas;
var gl;

var near = -10;
var far = 10;
var radius = 1.0;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

var left = -2.0;
var right = 2.0;
var ytop = 2.0;
var bottom = -2.0;

var fColor;
var fColorLoc;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye;

at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// For mouse event rotations
var rotatingLeft = false;
var rotatingRight = false;
var rotatingUp = false;
var rotatingDown = false;
var mouseDown = false;
var cMouseX = 0.0;
var nMouseX = 0.0;
var cMouseY = 0.0;
var nMouseY = 0.0;

var dataX;
var dataY;
var dataZ;

// Textures
var texture;
var texCoordsArray = [];

function configureTexture( image ) {
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, 
         gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
                      gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    
    gl.uniform1i(gl.getUniformLocation(programId, "texture"), 0);
}

var initSuperEllipsoid = function() {
	dataX = new Array(nRows);
	for(var i =0; i<nRows; i++) dataX[i]=new Array(nColumns);

	dataY = new Array(nRows);
	for(var i =0; i<nRows; i++) dataY[i]=new Array(nColumns);

	dataZ = new Array(nRows);
	for(var i =0; i<nRows; i++) dataZ[i]=new Array(nColumns);
	
	
	// Super ellipsoid Data - n1, n2, a, b, & c should come from UI
	// ( (x/a)^(n2) + (y/b)^(n2) )^(n1/n2)
	
	var sqValues = getSuperquadricConstants();
	var n1 = sqValues.n1;
	var n2 = sqValues.n2;
	var a = sqValues.a;
	var b = sqValues.b;
	var c = sqValues.c;

	for(var i=0; i<nRows; i++) {
		for(var j=0; j<nColumns; j++) {
			
			// Step size is (nRows - 1) so that there is no gap at the "end" of the model
			// v range: -pi/2 to pi/2
			// u range: -pi to pi
			var v = ((Math.PI/2)*(-1)) + ((Math.PI/(nRows-1)) * j);
			var u = ((Math.PI)*(-1)) + (((2*Math.PI)/(nRows-1)) * i);
			
			var cosU = Math.abs(Math.cos(u));
			var cosV = Math.abs(Math.cos(v));
			var sinU = Math.abs(Math.sin(u));
			var sinV = Math.abs(Math.sin(v));
			
			var x = a * Math.pow(cosV,(2/n1)) * Math.pow(cosU,(2/n2));
			var y = b * Math.pow(cosV,(2/n1)) * Math.pow(sinU,(2/n2));
			var z = c * Math.pow(sinV,(2/n1));
			
			x = x * Math.sign(Math.cos(u)) * Math.sign(Math.cos(v));
			y = y * Math.sign(Math.cos(v)) * Math.sign(Math.sin(u));
			z = z * Math.sign(Math.sin(v));
	  
			dataX[i][j] = x + xPan;
			dataY[i][j] = y + yPan;
			dataZ[i][j] = z;
		}
	}

}

var rebuildPointsArray = function() {
		// The horizontal grid lines...
	pointsArray = [];
	for(var i=0; i<nRows; i++) for(var j=0; j<nColumns;j++) {
		pointsArray.push(vec4(dataX[i][j], dataY[i][j], dataZ[i][j], 1.0));
		//texCoordsArray.push(vec2(0, 0));
	}
		// The vertical grid lines...
	for(var j=0; j<nColumns; j++) for(var i=0; i<nRows;i++) {
		pointsArray.push(vec4(dataX[i][j], dataY[i][j], dataZ[i][j], 1.0));
		//texCoordsArray.push(vec2(0, 0));
	}
	
	for(var r = 0; r < nRows; r++) {
		for(c = 0; c < nColumns; c++) {
			var x = r / nRows;
			var y = c / nColumns;
			texCoordsArray.push(vec2(x, y));
		}
	}
	
}

var rebuildVBO = function() {
	var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation( programId, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
	var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );
    
    var vTexCoord = gl.getAttribLocation( programId, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );
	
	var image = document.getElementById("tile-img");
    configureTexture( image );
	
	fColorLoc = gl.getUniformLocation(programId, "fColor");
	fColor = getWireframeColor();
	fColor = vec4(fColor, 1.0);
	

    modelViewMatrixLoc = gl.getUniformLocation( programId, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( programId, "projectionMatrix" );
	
}

var rebuildAll = function() {
	initSuperEllipsoid();
	rebuildPointsArray();
	rebuildVBO();
}

var render = function() {
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
    eye = vec3(radius*Math.sin(theta)*Math.cos(phi), 
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
            
		
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
	gl.uniform4fv(fColorLoc, fColor);

	for(var i=0; i<nRows; i++) {
		gl.drawArrays( gl.LINE_STRIP, i*nColumns, nColumns );
	}
    for(var i=0; i<nColumns; i++) {
		gl.drawArrays( gl.LINE_STRIP, i*nRows+pointsArray.length/2, nRows );
	}
    requestAnimFrame(render);
}