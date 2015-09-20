var canvas;
var gl;
var programId;

// Define two constants (by convention) for the number of subdivisions of u and v.
var SUBDIV_U = 32;
var SUBDIV_V = 16;

var index = 0;
var pointsArray = [];
var normalsArray = [];
function triangle(a, b, c) {
	
	 var t1 = subtract(b, a);
     var t2 = subtract(c, a);
     var normal = normalize(cross(t2, t1));
     normal = vec4(normal);

     pointsArray.push(a);
     pointsArray.push(b);      
     pointsArray.push(c);
    
     // normals are vectors
     normalsArray.push(a[0], a[1], a[2]);
     normalsArray.push(b[0], b[1], b[2]);
     normalsArray.push(c[0], c[1], c[2]);

     index += 3;
}

// Lighting
var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.64, 0.64, 0.64, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;

var ctm;
var ambientColor, diffuseColor, specularColor;
var normalMatrix, normalMatrixLoc;


// Binds "on-change" events for the controls on the web page
function initControlEvents() {
    // Use one event handler for all of the shape controls
    document.getElementById("shape-select").onchange = 
    document.getElementById("superquadric-constant-n1").onchange = 
    document.getElementById("superquadric-constant-n2").onchange = 
    document.getElementById("superquadric-constant-a").onchange =
    document.getElementById("superquadric-constant-b").onchange =
    document.getElementById("superquadric-constant-c").onchange =
    document.getElementById("superquadric-constant-d").onchange =
        function(e) {
            var shape = document.getElementById("shape-select").value;
            
            // Disable the "d" parameter if the shape is not a supertorus
            if (shape === "supertorus") {
                document.getElementById("superquadric-constant-d").disabled = false;
            }
            else {
                document.getElementById("superquadric-constant-d").disabled = true;
            }
            
            // Regenerate the vertex data
            updateWireframe(superquadrics[document.getElementById("shape-select").value],
                getSuperquadricConstants(), SUBDIV_U, SUBDIV_V);
        };
        
    // Event handler for the foreground color control
    document.getElementById("foreground-color").onchange = 
        function(e) {
            updateWireframeColor(getWireframeColor());
        };
        
    // Event handler for the FOV control
    document.getElementById("fov").onchange =
        function(e) {
            updateProjection(perspective(getFOV(), 1, 0.01, 100));
        };
		
	// Event handler for the texture control
    document.getElementById("texture-select").onchange =
        function(e) {
            updateTexture();
        };
	// Event handler for the surface control
    document.getElementById("surface-select").onchange =
        function(e) {
            updateSurface();
        };
}

// Function for querying the current superquadric constants: a, b, c, d, n1, n2
function getSuperquadricConstants() {
    return {
        a: parseFloat(document.getElementById("superquadric-constant-a").value),
        b: parseFloat(document.getElementById("superquadric-constant-b").value),
        c: parseFloat(document.getElementById("superquadric-constant-c").value),
        d: parseFloat(document.getElementById("superquadric-constant-d").value),
        n1: parseFloat(document.getElementById("superquadric-constant-n1").value),
        n2: parseFloat(document.getElementById("superquadric-constant-n2").value)
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

// Function for querying the current field of view
function getFOV() {
    return parseFloat(document.getElementById("fov").value);
}

function configureTexture( image ) {
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.uniform1i(gl.getUniformLocation(programId, "texture"), 0);
}

window.onload = function() {
    // Find the canvas on the page
    canvas = document.getElementById("gl-canvas");
    
    // Initialize a WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
	if (gl) {
		// Configure WebGL
		gl.viewport( 0, 0, canvas.width, canvas.height );
		gl.clearColor(1.0, 1.0, 1.0, 1.0);                      // Set clear color to black, fully opaque
		gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
		//gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
		//gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
	} else {
		alert("WebGL isn't available"); 
	}
    
    // Load shaders
    programId = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(programId);
	
	ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    // Set up events for the HTML controls
    initControlEvents();

    // Setup mouse and keyboard input
    initWindowEvents();
 
    // Load the initial data into the GPU
    vBuffer = gl.createBuffer();
	nBuffer = gl.createBuffer();
    updateWireframe(superquadrics.superellipsoid, getSuperquadricConstants(), SUBDIV_U, SUBDIV_V);

    // Associate the shader variable for position with our data buffer
    var vPosition = gl.getAttribLocation(programId, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
	
	var vTexCoord = gl.getAttribLocation( programId, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );
	
	var vNormal = gl.getAttribLocation( programId, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);
	
	
	// Initialize the texture
	updateTexture();
	
	// Initialize the surface:
	updateSurface();
    
    // Initialize the view and rotation matrices
    findShaderVariables();
    viewMatrix = lookAt(vec3(0,0,5), vec3(0,0,0), vec3(0,1,0));
    rotationMatrix = mat4(1);
    updateModelView(viewMatrix);
    
    // Initialize the projection matrix
    updateProjection(perspective(getFOV(), 1, 0.01, 100));
    
    // Initialize the wireframe color
    updateWireframeColor(getWireframeColor());
	
    normalMatrixLoc = gl.getUniformLocation( programId, "normalMatrix" );
    gl.uniform4fv( gl.getUniformLocation(programId, "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(programId, "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(programId, "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(programId, "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(programId, "shininess"),materialShininess );

    // Start continuous rendering
    window.setInterval(render, 33);
};

// The current view matrix
var viewMatrix;

// The current rotation matrix produced as the result of cumulative mouse drags.
// I chose to implement the effect of mouse dragging as "rotating the object."
// It would also be acceptable to implement it as "moving the camera."
var rotationMatrix;

// The OpenGL ID of the vertex buffer containing the current shape
var vBuffer;
var nBuffer;

// The number of vertices in the current vertex buffer
var wireframePointCount;

// Sets up keyboard and mouse events
function initWindowEvents() {

    // Affects how much the camera moves when the mouse is dragged.
    var sensitivity = 1;

    // Additional rotation caused by an active drag.
    var newRotationMatrix;
    
    // Whether or not the mouse button is currently being held down for a drag.
    var mousePressed = false;
    
    // The place where a mouse drag was started.
    var startX, startY;

    canvas.onmousedown = function(e) {
        // A mouse drag started.
        mousePressed = true;
        
        // Remember where the mouse drag started.
        startX = e.clientX;
        startY = e.clientY;
    }

    canvas.onmousemove = function(e) {
        if (mousePressed) {
            // Handle a mouse drag by constructing an axis-angle rotation matrix
            var axis = vec3(e.clientY - startY, e.clientX - startX, 0.0);
            var angle = length(axis) * sensitivity;
            if (angle > 0.0) {
                // Update the temporary rotation matrix
                newRotationMatrix = mult(rotate(angle, axis), rotationMatrix);
                
                // Update the model-view matrix.
                updateModelView(mult(viewMatrix, newRotationMatrix));
            }
        }
    }

    window.onmouseup = function(e) {
        // A mouse drag ended.
        mousePressed = false;
        
        if (newRotationMatrix) {
            // "Lock" the temporary rotation as the current rotation matrix.
            rotationMatrix = newRotationMatrix;
        }
        newRotationMatrix = null;
    }
    
    var speed = 0.1; // Affects how fast the camera pans and "zooms"
    window.onkeydown = function(e) {
        if (e.keyCode === 190) { // '>' key
            // "Zoom" in
            viewMatrix = mult(translate(0,0,speed), viewMatrix);
        }
        else if (e.keyCode === 188) { // '<' key
            // "Zoom" out
            viewMatrix = mult(translate(0,0,-speed), viewMatrix);
        }
        else if (e.keyCode === 37) { // Left key
            // Pan left
            viewMatrix = mult(translate(speed,0,0), viewMatrix);
            
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault(); 
        }
        else if (e.keyCode === 38) { // Up key
            // Pan up
            viewMatrix = mult(translate(0,-speed,0), viewMatrix);
            
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        else if (e.keyCode === 39) { // Right key
            // Pan right
            viewMatrix = mult(translate(-speed,0,0), viewMatrix);
            
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        else if (e.keyCode === 40) { // Down key
            // Pan down 
            viewMatrix = mult(translate(0,speed,0), viewMatrix);
            
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        
        // Update the model-view matrix and render.
        updateModelView(mult(viewMatrix, rotationMatrix));
        render();
    }
}

// Define the four possible superquadrics
var superquadrics = {
    superellipsoid: {
        evaluate: function(constants, u, v) {
            var cosU = Math.cos(u);
            var sinU = Math.sin(u);
            var cosV = Math.cos(v);
            var sinV = Math.sin(v);
            return vec3(
                constants.a * Math.sign(cosV * cosU) * Math.pow(Math.abs(cosV), 2 / constants.n1) * 
                    Math.pow(Math.abs(cosU), 2 / constants.n2),
                constants.b * Math.sign(cosV * sinU) * Math.pow(Math.abs(cosV), 2 / constants.n1) * 
                    Math.pow(Math.abs(sinU), 2/constants.n2),
                constants.c * Math.sign(sinV) * Math.pow(Math.abs(sinV), 2 / constants.n1)
            );
        },
        uMin: -Math.PI,
        uMax: Math.PI,
        vMin: -Math.PI / 2,
        vMax: Math.PI / 2
    },
    superhyperboloidOneSheet: {
        evaluate: function(constants, u, v) {
            var cosU = Math.cos(u);
            var sinU = Math.sin(u);
            var secV = 1 / Math.cos(v);
            var tanV = Math.tan(v);
            return vec3(
                constants.a * Math.sign(secV * cosU) * Math.pow(Math.abs(secV), 2 / constants.n1) * 
                    Math.pow(Math.abs(cosU), 2 / constants.n2),
                constants.b * Math.sign(secV * sinU) * Math.pow(Math.abs(secV), 2 / constants.n1) * 
                    Math.pow(Math.abs(sinU), 2/constants.n2),
                constants.c * Math.sign(tanV) * Math.pow(Math.abs(tanV), 2 / constants.n1)
            );
        },
        uMin: -Math.PI,
        uMax: Math.PI,
        // v = -pi/4 to pi/4 gives a reasonable view of most superhyperboloids 
        // (which are technically infinite)
        vMin: -Math.PI / 4, 
        vMax: Math.PI / 4
    },
    superhyperboloidTwoSheets: {
        evaluate: function(constants, u, v) {
            var eps = -0.001; // Avoid floating-point precision issues
            if (u < -Math.PI / 4 - eps || u > 5 * Math.PI / 4 + eps || 
                (u > Math.PI / 4 + eps && u < 3 * Math.PI / 4 - eps)) {
                // Return NaN if the value of u causes the function to take on an "extreme" value
                // (specifically, restrict u to be between -pi/4 and pi/4 or between 3pi/4 and 5pi/4)
                return vec3(NaN, NaN, NaN);
            }
            else {
                var secU = 1 / Math.cos(u);
                var tanU = Math.tan(u);
                var secV = 1 / Math.cos(v);
                var tanV = Math.tan(v);
                return vec3(
                    constants.a * Math.sign(secV * secU) * Math.pow(Math.abs(secV), 2 / constants.n1) * 
                        Math.pow(Math.abs(secU), 2 / constants.n2),
                    constants.b * Math.sign(secV * tanU) * Math.pow(Math.abs(secV), 2 / constants.n1) * 
                        Math.pow(Math.abs(tanU), 2/constants.n2),
                    constants.c * Math.sign(tanV) * Math.pow(Math.abs(tanV), 2 / constants.n1)
                );
            }
        },
        uMin: -Math.PI / 2,
        uMax: 3 * Math.PI / 2,
        // v = -pi/4 to pi/4 gives a reasonable view of most superhyperboloids 
        // (which are technically infinite)
        vMin: -Math.PI / 4,
        vMax: Math.PI / 4
    },
    supertorus: {
        evaluate: function(constants, u, v) {
            var cosU = Math.cos(u);
            var sinU = Math.sin(u);
            var cosV = Math.cos(v);
            var sinV = Math.sin(v);
            return vec3(
                constants.a * Math.sign(cosU) * 
                    (constants.d + Math.sign(cosV) * Math.pow(Math.abs(cosV), 2 / constants.n1)) * 
                    Math.pow(Math.abs(cosU), 2 / constants.n2),
                constants.b * Math.sign(sinU) * 
                    (constants.d + Math.sign(cosV) * Math.pow(Math.abs(cosV), 2 / constants.n1)) * 
                    Math.pow(Math.abs(sinU), 2/constants.n2),
                constants.c * Math.sign(sinV) * Math.pow(Math.abs(sinV), 2 / constants.n1)
            );
        },
        uMin: -Math.PI,
        uMax: Math.PI,
        vMin: -Math.PI,
        vMax: Math.PI
    }
}

// Regenerates the superquadric vertex data.
// Only needs to be called when the intrinsic properties (n1, n2, a, b, c, d) of the superquadric change,
// or the type of superquadric itself changes.
function updateWireframe(superquadric, constants, subdivU, subdivV) {
    // Initialize an empty array of points
    var points = [];
	pointsArray = [];
	normalsArray = [];
    
    // Determine how much u and v change with each segment
    var du = (superquadric.uMax - superquadric.uMin) / subdivU ;
    var dv = (superquadric.vMax - superquadric.vMin) / subdivV ;
    
    // Reset the vertex count to 0
    wireframePointCount = 0;
	
	var tempPoint1;
	var tempPoint2;
	var tempPoint3;
	var tempPoint4;
    
    // Loop over u and v, generating all the required line segments
    for (var i = 0; i < subdivU+1; i++) {
        for (var j = 0; j < subdivV+1; j++) {
            // Determine u and v
            var u = superquadric.uMin + i * du;
            var v = superquadric.vMin + j * dv;
        
            // p is the "current" point at surface coordinates (u,v)
            var p = superquadric.evaluate(constants, u, v);
            
            // pu is the point at surface coordinates (u+du, v)
            var pu = superquadric.evaluate(constants, u + du, v);
            
            // pv is the point at surface coordinates (u, v+dv)
            var pv = superquadric.evaluate(constants, u, v + dv);
            
            // Verify that all the points actually used are not infinite or NaN
            // (Could be an issue for hyperboloids)
            if (isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) {
                if (isFinite(pu[0]) && isFinite(pu[1]) && isFinite(pu[2])) {
                    // Add a line segment between p and pu
                    points.push(p);
                    points.push(pu);
					if(wireframePointCount > 4) {
						triangle(tempPoint1, tempPoint2, pu);
					}
					tempPoint1 = p;
					tempPoint2 = pu;
                    wireframePointCount += 2;
                }
                if (isFinite(pv[0]) && isFinite(pv[1]) && isFinite(pv[2])) {
                    // Add a line segment between p and pv
                    points.push(p);
                    points.push(pv);
					if(wireframePointCount > 4) {
						triangle(tempPoint3, tempPoint4, pv);
					}
					tempPoint3 = p;
					tempPoint4 = pv;
                    wireframePointCount += 2;
                }
				// NEW:
				/*if(wireframePointCount > 4) {
					triangle(tempPoint1, p, tempPoint2);
				}
				triangle(p, pu, pv);
				tempPoint1 = p;
				tempPoint2 = pu;*/
            }
            v += dv;
        }
        v = superquadric.vMax;
        
        // Add the final line segment from (u, vMax) to (u+du, vMax)
        // (may be redundant for some shapes)
        var p = superquadric.evaluate(constants, u, v);
        var pu = superquadric.evaluate(constants, u + du, v);
        if (isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2]) &&
                isFinite(pu[0]) && isFinite(pu[1]) && isFinite(pu[2])) {
            points.push(p);
            points.push(pu);
            wireframePointCount += 2;
        }
        u += du;
    }
    
    // Add all the line segments where u=uMax (may be redundant for some shapes)
    u = superquadric.uMax;
    var v = superquadric.vMin;
    for (var i = 0; i < subdivV; i++) {
        // Add a line segment between (uMax, v) and (uMax, v+dv)
        var p = superquadric.evaluate(constants, u, v);
        var pv = superquadric.evaluate(constants, u, v + dv);
        if (isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2]) &&
                isFinite(pv[0]) && isFinite(pv[1]) && isFinite(pv[2])) {
            points.push(p);
            points.push(pv);
            wireframePointCount += 2;
        }
        v += dv;
    }
    
    // Pass the new set of vertices to the graphics card
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.DYNAMIC_DRAW);
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.DYNAMIC_DRAW );
}

// The locations of the required GLSL uniform variables.
var locations = {};

// Looks up the locations of uniform variables once.
function findShaderVariables() {
    locations.modelView = gl.getUniformLocation(programId, "modelView");
    locations.projection = gl.getUniformLocation(programId, "projection");
    locations.normalMatrix = gl.getUniformLocation( programId, "normalMatrix" );
    locations.wireframeColor = gl.getUniformLocation(programId, "wireframeColor");
    locations.wireframeColor = gl.getUniformLocation(programId, "wireframeColor");
}

// Pass an updated model-view matrix to the graphics card.
function updateModelView(modelView) {
    gl.uniformMatrix4fv(locations.modelView, false, flatten(modelView));
}


// Pass an updated projection matrix to the graphics card.
function updateProjection(projection) {
    gl.uniformMatrix4fv(locations.projection, false, flatten(projection));
}

// Pass an updated projection matrix to the graphics card.
function updateWireframeColor(wireframeColor) {
    gl.uniform3fv(locations.wireframeColor, wireframeColor);
}

function updateTexture() {
	var txtrValue = document.getElementById("texture-select").value;
	var image;
	if( txtrValue == "tile" ) {
		image = document.getElementById("tile-img");
	} 
	else if ( txtrValue == "wood" ) {
		image = document.getElementById("wood-img");
	}
    configureTexture( image );
}

function updateSurface() {
	var surface = document.getElementById("surface-select").value;
	if( surface == "default" ) {
		materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
		ambientProduct = mult(lightAmbient, materialAmbient);
		gl.uniform4fv( gl.getUniformLocation(programId, "ambientProduct"),flatten(ambientProduct) );
		
		materialDiffuse = vec4( 1.0, 1.0, 0.0, 1.0 );
		diffuseProduct = mult(lightDiffuse, materialDiffuse);
		gl.uniform4fv( gl.getUniformLocation(programId, "diffuseProduct"),flatten(diffuseProduct) );
		
		materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
		specularProduct = mult(lightSpecular, materialSpecular);
		gl.uniform4fv( gl.getUniformLocation(programId, "specularProduct"),flatten(specularProduct) );
		
		materialShininess = 50.0;
		gl.uniform1f( gl.getUniformLocation(programId, "shininess"),materialShininess );
	} 
	else if( surface == "yellow-plastic") {
		materialAmbient = vec4( 1.0, 1.0, 0.0, 1.0 );
		var ambientP = mult(lightAmbient, materialAmbient);
		gl.uniform4fv( gl.getUniformLocation(programId, "ambientProduct"),flatten(ambientP) );
		
		materialDiffuse = vec4( 0.8, 0.8, 0.0, 1.0 );
		var diffuseP = mult(lightDiffuse, materialDiffuse);
		gl.uniform4fv( gl.getUniformLocation(programId, "diffuseProduct"),flatten(diffuseP) );
		
		materialSpecular = lightSpecular;
		var specularP = mult(lightSpecular, materialSpecular);
		gl.uniform4fv( gl.getUniformLocation(programId, "specularProduct"),flatten(specularP) );
		
		materialShininess = 0.5;
		gl.uniform1f( gl.getUniformLocation(programId, "shininess"),materialShininess );
	}
	else {
		// Bronze Metal
		materialAmbient = vec4( 0.71, 0.65, 0.26, 1.0 );
		ambientProduct = mult(lightAmbient, materialAmbient);
		gl.uniform4fv( gl.getUniformLocation(programId, "ambientProduct"),flatten(ambientProduct) );
		
		materialDiffuse = vec4( 1.0, 1.0, 0.0, 1.0 );
		diffuseProduct = mult(lightDiffuse, materialDiffuse);
		gl.uniform4fv( gl.getUniformLocation(programId, "diffuseProduct"),flatten(diffuseProduct) );
		
		materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
		specularProduct = mult(lightSpecular, materialSpecular);
		gl.uniform4fv( gl.getUniformLocation(programId, "specularProduct"),flatten(specularProduct) );
		
		materialShininess = 10.0;
		gl.uniform1f( gl.getUniformLocation(programId, "shininess"),materialShininess );
	}
	
}


// Render the scene
function render() {
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
    // Draw the wireframe using gl.LINES
    gl.drawArrays(gl.LINES, 0, wireframePointCount);
	
    for( var i=0; i<index; i+=1) {
        gl.drawArrays( gl.TRIANGLE_STRIP, i, 3 );
    }
}
