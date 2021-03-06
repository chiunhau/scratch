
var video = document.querySelector('video');
var diff = [];
var COLS = 40;
var ROWS = 30;
var start = false;
var waiting = false;
function getWebcam(){
	navigator.getMedia =  navigator.getUserMedia ||
        								navigator.webkitGetUserMedia ||
								        navigator.mozGetUserMedia ||
								        navigator.msGetUserMedia;

  if (navigator.getMedia) {
		navigator.getMedia (
			{	
				video: true
			}, 
			function(localMediaStream){
				console.log('success callback');
				video.src = window.URL.createObjectURL(localMediaStream);
				video.onloadedmetadata = function(e) {
		      setTimeout(function(){
		      	start = true;
		      	onFrame();
		      },1000);
		    };
			}, 
		  function(e){
	   		console.log(e);
	   	}
		);
	}
}

function Source(width, height) {
	this.cols = COLS;
	this.rows = ROWS;
	this.width = width;
	this.height = height;
	this.colWidth = width / this.cols;
	this.rowHeight = height / this.rows;
	this.currentFrame = null;
	this.previousFrame = null;
	this.canvas = document.getElementById('sourceCanvas');
	this.diff = [];
}

Source.prototype.initCanvas = function() {
	this.canvas.width = this.width;
	this.canvas.height = this.height;
};

Source.prototype.drawCanvas = function() {
	var c = this.canvas.getContext('2d');
	var width = this.canvas.width;
	var height = this.canvas.height;
	c.save();
	c.scale(-1, 1);
  c.drawImage(video, -width, 0, width, height);
  c.restore();
  this.storeFrames();
}

Source.prototype.storeFrames = function() {
	var c = this.canvas.getContext('2d');
	var width = this.canvas.width;
	var height = this.canvas.height;

	if (this.previousFrame === null) {
		this.previousFrame = c.getImageData(0, 0, width, height);
	}
	else {
		if (this.currentFrame !== null) {
			this.previousFrame = this.currentFrame;
		}
		this.currentFrame = c.getImageData(0, 0, width, height);
		this.detect();
	}
}

Source.prototype.detect = function() {
	diff = [];
	var previous = this.previousFrame;
	var current = this.currentFrame;

	for(var r = 0; r < this.rows; r++) {
		for(var c = 0; c < this.cols; c++) {
			var x = c * this.colWidth + Math.floor(this.colWidth / 2);
			var y = r * this.rowHeight + Math.floor(this.rowHeight / 2);
			var pixelPos = (this.canvas.width * 4) * y + x * 4;

			var dr = Math.abs(previous.data[pixelPos] - current.data[pixelPos]);
			var dg = Math.abs(previous.data[pixelPos + 1] - current.data[pixelPos + 1]);
			var db = Math.abs(previous.data[pixelPos + 2] - current.data[pixelPos + 2]);

			// motion detected
			if((dr + dg + db) >= 100) {
				diff.push([c, r]);
			}			
		}
	}
}

function Back(width, height) {
	this.canvas = document.getElementById('backCanvas');
	this.width = width;
	this.height = height;
}

Back.prototype.initCanvas = function() {
	this.canvas.width = this.width;
	this.canvas.height = this.height;
}

Back.prototype.drawCanvas = function() {
	var c = this.canvas.getContext('2d');
	var width = this.canvas.width;
	var height = this.canvas.height;
	if(frontCanvas.isScratching) {
		c.save();
		c.scale(-1, 1);
	  c.drawImage(video, -width, 0, width, height);
	  c.restore();
	}
	else{
		c.putImageData(this.captureFrame, 0, 0);
	}
	
}

Back.prototype.capture = function(argument) {
	this.captureFrame = sourceCanvas.currentFrame;
}

function Front(width, height) {
	this.canvas = document.getElementById('frontCanvas');
	this.width = width;
	this.height = height;
	this.colWidth = width / COLS;
	this.rowHeight = height / ROWS;
	this.bricks = [];
	this.cleared = 0;
	this.isScratching = true;
}

Front.prototype.initCanvas = function() {
	this.canvas.width = this.width;
	this.canvas.height = this.height;

}

Front.prototype.fill = function() {
	this.bg = 'hsl('+ Math.random() * 360 + ', 100%, 70%)';
	for(var r = 0; r < ROWS; r++) {
		for(var c = 0; c < COLS; c++) {
			var x = c * this.colWidth;
			var y = r * this.rowHeight;
			var rectangle = new Rectangle(new Point(x, y), new Point(x + this.colWidth, y + this.rowHeight));
			var brick  = new Path.Rectangle(rectangle);
			brick.fillColor = this.bg;
			this.bricks.push(brick);
		}
	}
}

Front.prototype.scratch = function() {

	var diffs = diff.length;
	if(diffs > 0) {
		for(var i = 0; i < diffs; i ++) {
			var index = diff[i][1] * COLS + diff[i][0];
			if(this.bricks[index].opacity === 1) {
				this.cleared += 1;
				this.bricks[index].opacity = 0;
				if (this.cleared === 1200) {
					this.isScratching  = false;
					backCanvas.capture();
					$(function(){
						$('#backCanvas').removeClass('general');
		  			$('#backCanvas').addClass('highlight');
		  		});
		  		this.bg = 'hsl('+ Math.random() * 360 + ', 100%, 70%)';
		  		for(var i = 0; i< 1200; i ++) {
		  			this.bricks[i].fillColor = this.bg;
		  		}
		  		waiting = true;
					break;
				}
			}
		}	
	}
}

Front.prototype.recover = function() {
	var diffs = diff.length;
	if(diffs > 0) {
		for(var i = 0; i < diffs; i ++) {
			var index = diff[i][1] * COLS + diff[i][0];
			if(this.bricks[index].opacity === 0) {
				this.cleared -= 1;
				this.bricks[index].opacity = 1;
				if (this.cleared === 0) {
					this.isScratching  = true;
					$(function(){
		  			$('#backCanvas').removeClass('highlight');
		  			$('#backCanvas').addClass('general');
		  		});
					break;
				}
			}
		}
	}
}
var waitingCounter = 0;


function onFrame(event){
	/*if(waiting) {
		waitingCounter += 1;
		if(waitingCounter >= 300) {
			waitingCounter = 0;
			waiting = false;
			sourceCanvas.currentFrame = null;
			sourceCanvas.previousFrame = null;
		}
	}
	else {*/
		sourceCanvas.drawCanvas();
	  backCanvas.drawCanvas();
	  if (start) {
	  	if (frontCanvas.isScratching) {
	  		frontCanvas.scratch();
	  	}
	  	else {
	  		frontCanvas.recover();
	  	}
	  }
	/*}*/
	
}

var sourceCanvas = new Source(800,600);
sourceCanvas.initCanvas();

var backCanvas = new Back(800, 600);
backCanvas.initCanvas();

var frontCanvas = new Front(800, 600);
view.size = new Size(this.width, this.height);
frontCanvas.initCanvas();
frontCanvas.fill();
getWebcam();

