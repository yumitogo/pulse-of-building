//ref 1440 1024

var fontPrintChar21;
var fontSFUIText;

var uiDefinition = { //in pixels, not in ratio. Change this object if necessary
  textfontSize: 13 + 1, //p5js dont have hotizontal spacing, so used larger font
  leftSpacing: 75, //updated
  textBottomSpacing: 73, //updated
  columnPosition: [0, 172, 1216], //updated
  fftHeight: 400,
  fftFontSize: 10,
  fftBlackSpace: 45,
  animationFrame: 5,
  fftGraphicLength: 0,
  fftPointsLength: 30 * 5,
  lineWeight: 1,
  initWindowWidth: 1440,
  initWindowHeight: 1024,
};

var uiDefinitionInit = null;

textEncoder = new TextEncoder();

var motorHeartbeatBeginned = false;
var motorCurrentStatus = false;
var motorStatusChangeTime = 0;

var tableContent = {
  content: [{
    text: ['NEW YORK TIMES', '620 EIGHTH AVENUE NEW YORK, NY 10018', '00:00:00'],
    sound: 'assets/Instagram_770_broadway_09_05_2017.mp3'
  }]
};

var selectedRow = -1;

var soundFilesObj = [];
var fftObj;
var fftResult = [];
var framePlaying = [];
var wavePhase = [];
var fftAverage = [];
var fftAvgLength = 64;
var phaseShift = 0;
var displayInstruction = true;

function preload() {
  fontPrintChar21 = loadFont('assets/PrintChar21.otf');
  fontSFUIText = loadFont('assets/SFUIText-Regular.ttf');

  var i;
  for (i = 0; i < tableContent.content.length; i++) soundFilesObj[i] = null;
  for (i = 0; i < tableContent.content.length; i++) {
    fftResult[i] = [];
    for (j = 0; j < uiDefinition.fftPointsLength; j++) {
      fftResult[i][j] = 0;
    }
  }
  for (i = 0; i < tableContent.content.length; i++) framePlaying[i] = 0;
  for (i = 0; i < tableContent.content.length; i++) wavePhase[i] = 0;
}

function recalulateUI() {
  if (uiDefinitionInit == null) {
    uiDefinitionInit = JSON.parse(JSON.stringify(uiDefinition)); //do a deep clone
  }
  var zoomScale = windowWidth / uiDefinitionInit.initWindowWidth;
  console.log("zoomScale", zoomScale);
  uiDefinition.textfontSize = uiDefinitionInit.textfontSize * zoomScale;
  uiDefinition.leftSpacing = uiDefinitionInit.leftSpacing * zoomScale;
  uiDefinition.textBottomSpacing = uiDefinitionInit.textBottomSpacing * zoomScale;

  for (i = 0; i < uiDefinitionInit.columnPosition.length; i++) {
    uiDefinition.columnPosition[i] = uiDefinitionInit.columnPosition[i] * zoomScale;
  }
  uiDefinition.fftHeight = uiDefinitionInit.fftHeight * zoomScale;
  uiDefinition.fftFontSize = uiDefinitionInit.fftFontSize * zoomScale;

  uiDefinition.fftBlackSpace = uiDefinitionInit.fftBlackSpace * zoomScale;
  uiDefinition.fftGraphicLength = uiDefinitionInit.initWindowWidth * zoomScale;
  uiDefinition.lineWeight = uiDefinitionInit.lineWeight * zoomScale;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);
  fftObj = new p5.FFT(0, 32);
  windowResized();

}

function draw() {
  background(0);
  noStroke();
  //fill(0);
  //rect(0, 0, uiDefinition.leftSpacing + uiDefinition.fftGraphicLength + uiDefinition.leftSpacing, 800);

  //update time
  if (soundFilesObj[0]) {
    var seconds = parseInt(soundFilesObj[0].currentTime());
    var s;
    s = ("000000000" + parseInt(seconds / 3600));
    var hourStr = s.substr(s.length - 2);
    s = ("000000000" + (parseInt(seconds / 60) % 60));
    var mintueStr = s.substr(s.length - 2);
    s = ("000000000" + (parseInt(seconds / 1) % 60));
    var secondStr = s.substr(s.length - 2);
    tableContent.content[0].text[2] = hourStr + ":" + mintueStr + ":" + secondStr;
  }


  //draw table
  {
    fill(255);
    textFont(fontSFUIText, uiDefinition.textfontSize);

    var bottomPos = uiDefinition.textBottomSpacing;
    for (j = 0; j < tableContent.content.length; j++) {
      for (i = 0; i < 3; i++) {
        var leftPosCell = uiDefinition.leftSpacing + uiDefinition.columnPosition[i];
        text(tableContent.content[j].text[i], leftPosCell, height - bottomPos);
      }
    }
  }
  //process FFT
  if (selectedRow >= 0) {
    if ((frameCount & 1) !== 0) {

      var spectrum = fftObj.analyze();

      var debugFFT = 0;
      if (debugFFT) {
        push();
        noStroke();
        fill(0, 255, 0); // spectrum is green
        for (var i = 0; i < spectrum.length; i++) {
          var x = map(i, 0, spectrum.length, 0, width);
          var h = -height + map(spectrum[i], 0, 255, height, 0);
          rect(x, height, width / spectrum.length, h)
        }
        pop();
      }

      var sumFFT = 0;
      for (i = 0; i < spectrum.length / 32; i++) {
        sumFFT += spectrum[i];
      }

      fftAverage.push(sumFFT);
      if (fftAverage.length > fftAvgLength) {
        fftAverage.shift();
      }

      var total = 0;
      fftAverage.forEach(function(element) {
        total += element;
      })
      var average = total / fftAverage.length;

      phaseShift = sumFFT / 2048 + ((fftAverage.length == fftAvgLength) ? ((average - sumFFT) / 256) : 0);
    }

    if (soundFilesObj[selectedRow] && soundFilesObj[selectedRow].isPlaying()) {
      wavePhase[selectedRow] += phaseShift;
    }

    var fftSelected = fftResult[selectedRow];
    var totalLenfth = uiDefinition.fftPointsLength;
    for (i = 0; i < (totalLenfth - 1); i++) {
      fftSelected[i] = fftSelected[i + 1];
    }

    fftSelected[totalLenfth - 1] = sin(wavePhase[selectedRow]);
    framePlaying[selectedRow]++;

  }

  //drawgraph
  {
    push();
    topPos = uiDefinition.topSpacing + uiDefinition.titleSpaceing;
    for (j = 0; j < tableContent.content.length; j++) {
      if (true) {

        var spaceMiddle = (height - bottomPos) / 2;
        var spaceTop = spaceMiddle - uiDefinition.fftHeight / 2;
        var spaceBottom = spaceMiddle + uiDefinition.fftHeight / 2;
        //var spaceTop = 0 + uiDefinition.rowSize + uiDefinition.fftBlackSpace;
        //var spaceBottom = 0 + 100 + uiDefinition.rowSize + uiDefinition.rowSize - uiDefinition.fontSize - uiDefinition.fftBlackSpace;


        //console.log(spaceTop,spaceBottom,spaceMiddle,uiDefinition.fftGraphicLength)

        var totalLength = uiDefinition.fftPointsLength;


        textFont(fontPrintChar21, uiDefinition.fftFontSize);
        fill(0x6D);
        text('200 HZ', uiDefinition.leftSpacing, spaceTop - uiDefinition.fftFontSize * 1);
        text('005 HZ', uiDefinition.leftSpacing, spaceBottom + uiDefinition.fftFontSize * 1.8);

        stroke(0x33);
        strokeWeight(uiDefinition.lineWeight);
        line(0, spaceMiddle, uiDefinition.fftGraphicLength, spaceMiddle);

        noFill();
        beginShape(LINES);
        for (i = 0; i < 6; i++) {
          var xPos = map(i, -0.5, 5.5, 0, uiDefinition.fftGraphicLength);
          vertex(xPos, spaceTop);
          vertex(xPos, spaceBottom);
        }
        endShape();

        if (displayInstruction) {
          fill(255);
          text('click to play/stop', map(2.15, -0.5, 5.5, 0, uiDefinition.fftGraphicLength), spaceMiddle - uiDefinition.fftFontSize * 0.5);
        }

        var fftData = fftResult[j];
        stroke(0xc7);
        var xPos = uiDefinition.leftSpacing;

        var verticalScale = (spaceBottom - spaceTop) * 0.4;
        var waveScale = uiDefinition.fftGraphicLength / (totalLength - 1);
        noFill();
        beginShape();
        for (i = 0; i < (totalLength); i++) {
          vertex(0 + i * waveScale, spaceMiddle + verticalScale * fftData[i]);
        }
        endShape();
      }
      if (selectedRow == j) {
        //playsound
        if (soundFilesObj[j]) {
          if (soundFilesObj[j].isLoaded()) {
            if (!soundFilesObj[j].isPlaying()) {
              soundFilesObj[j].play();
              wavePhase[j] = 0;
            }
          }
        }
      }
    }

    pop();
  }

}

function mouseClicked() {
  //console.log(mouseY);

  //check which row is clicked;
  var lineClicked = 0;
  if (selectedRow == 0) lineClicked = -1;

  if (lineClicked >= 0) {
    displayInstruction = false;
    if (soundFilesObj[lineClicked] === null) {
      var soundFileLocation = tableContent.content[lineClicked].sound;
      if (soundFileLocation) {
        soundFilesObj[lineClicked] = loadSound(soundFileLocation);
        console.log('load sound: ' + soundFileLocation);
      }
    } else {

    }
  }

  //pause and rewind the rest
  for (i = 0; i < tableContent.content.length; i++) {
    if (soundFilesObj[i] && (i != lineClicked)) {
      if (soundFilesObj[i].isLoaded()) {
        soundFilesObj[i].stop();
      }
    }
  }

  if (selectedRow != lineClicked) {
    fftAverage.length = 0; //clear average array
    if (selectedRow >= 0) {
      framePlaying[selectedRow] = 0;
      for (j = 0; j < uiDefinition.fftPointsLength; j++) {
        fftResult[selectedRow][j] = 0;
      }
    }
  }

  selectedRow = lineClicked;

}

function windowResized() {
  //adaptive
  recalulateUI();
  resizeCanvas(windowWidth, windowHeight);
}