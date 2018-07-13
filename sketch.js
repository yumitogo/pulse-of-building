var fontPrintChar21;

var uiDefinition = { //in pixels, not in ratio. Change this object if necessary
  fontSize: 13,
  topSpacing: 73,
  leftSpacing: 60,
  columnPosition: [0, 130, 310, 495, 865],
  titleSpaceing: 32,
  rowSize: 23,
  expandSize: 400,
  fftBlackSpace: 45,
  animationFrame: 5,
  fftGraphicLength: 920,
  fftPointsLength: 30 * 5,
  lineWeight: 1,
};

var uiDefinitionInit = null;

var useWebUSB = false;
var webUSBPressed = false;
var webUSBPort = null;

textEncoder = new TextEncoder();

var motorHeartbeatBeginned = false;
var motorCurrentStatus = false;
var motorStatusChangeTime = 0;

var tableContent = {
  title: ['IDX', 'LOC', 'NAME', 'TIME', 'DRTN'],
  content: [{
    text: ['001', 'BKLYN', 'CHANNEL', '08.31.2017.13:50', '52:30'],
    sound: 'assets/Channel_Design_06_01.mp3'
  }, {
    text: ['002', 'MTN', 'INSTAGRAM', '09.11.2017.17:44', '48:10'],
    sound: 'assets/Instagram_770_broadway_09_05_2017.mp3'
  }, {
    text: ['003', 'BKLYN', 'TOPOS', '09.15.2017.18:01', '32:50'],
    sound: 'assets/Topos_195_plymouth_Street_Brooklyn_Dumbo_09_11_2017_01.mp3'
  }, {
    text: ['004', 'BKLYN', 'MY OFFICE', '01.17.2018.15:59', '35:38'],
    sound: 'assets/My_Office_200_Morgan_Ave_Brooklyn_NY_01.mp3'
  }, {
    text: ['005', 'MTN', 'GOOGLE', '01.20.2018.12:35', '38:00'],
    sound: 'assets/Google_111_8th_Ave _New_York_NY_10011_01.mp3'
  }, {
    text: ['006', 'MTN', 'NEW YORK TIMES', '04.17.2018.13:34', '26:51'],
    sound: 'assets/New_York_Times_242_W_41st_St_New_York_NY_10036_01.mp3'
  }, {
    text: ['007', 'MTN', 'R/GA', '02.14.2018.15:20', '10:56'],
    sound: 'assets/Spotify_01.mp3'
  }, {
    text: ['008', 'MTN', 'Spotify', '02.14.2018.15:20', '10:56'],
    sound: 'assets/Spotify_01.mp3'
  }, {
    text: ['009', 'MTN', 'TOPOS', '09.11.2017.12:35', '18:00']
  }, {
    text: ['010', 'BKLYN', 'MY OFFICE', '09.11.2017.12:35', '17:44']
  }, ]
};

var tableExpandSize = [];
var selectedRow = -1;
var tableRowAnimationPhase = [];
var soundFilesObj = [];
var fftObj;
var fftResult = [];
var framePlaying = [];
var wavePhase = [];
var fftAverage = [];
var fftAvgLength = 64;
var phaseShift = 0;

function preload() {
  fontPrintChar21 = loadFont('assets/PrintChar21.otf');
  var i;
  for (i = 0; i < tableContent.content.length; i++) tableExpandSize[i] = 0;
  for (i = 0; i < tableContent.content.length; i++) tableRowAnimationPhase[i] = 0;
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
    uiDefinitionInit.initWindowWidth = uiDefinition.leftSpacing + uiDefinition.fftGraphicLength + uiDefinition.leftSpacing;
    uiDefinitionInit.initWindowHeight = 800;
  }
  var zoomScale = windowWidth / uiDefinitionInit.initWindowWidth;
  uiDefinition.fontSize = uiDefinitionInit.fontSize * zoomScale;
  uiDefinition.topSpacing = uiDefinitionInit.topSpacing * zoomScale;
  uiDefinition.leftSpacing = uiDefinitionInit.leftSpacing * zoomScale;
  for (i = 0; i < uiDefinitionInit.columnPosition.length; i++) {
    uiDefinition.columnPosition[i] = uiDefinitionInit.columnPosition[i] * zoomScale;
  }
  uiDefinition.titleSpaceing = uiDefinitionInit.titleSpaceing * zoomScale;
  uiDefinition.rowSize = uiDefinitionInit.rowSize * zoomScale;
  uiDefinition.expandSize = uiDefinitionInit.expandSize * zoomScale;
  uiDefinition.fftBlackSpace = uiDefinitionInit.fftBlackSpace * zoomScale;
  uiDefinition.fftGraphicLength = uiDefinitionInit.fftGraphicLength * zoomScale;
  uiDefinition.lineWeight = uiDefinitionInit.lineWeight * zoomScale;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);
  fftObj = new p5.FFT(0, 32);
  windowResized();

  useWebUSB = (window.location.search.substr(1)).includes('usb=1');

  if (useWebUSB) {
    serial.getPorts().then(ports => { //auto connect
      if (ports.length == 0) {
        console.log('No device found.');
      } else {
        console.log('Connecting...');
        webUSBPort = ports[0];
        webUSBConnect();
      }
    });
  }
}

function draw() {
  background(0);
  noStroke();
  //fill(0);
  //rect(0, 0, uiDefinition.leftSpacing + uiDefinition.fftGraphicLength + uiDefinition.leftSpacing, 800);
  //calculate animation of table
  for (j = 0; j < tableContent.content.length; j++) {
    if (tableRowAnimationPhase[j] > 0) {
      if (j == selectedRow) {
        if (tableRowAnimationPhase[j] < uiDefinition.animationFrame) tableRowAnimationPhase[j]++;
      } else {
        if (tableRowAnimationPhase[j] == uiDefinition.animationFrame) tableRowAnimationPhase[j]--;
        if (tableRowAnimationPhase[j] > 0) tableRowAnimationPhase[j]--;
      }
      tableExpandSize[j] = map(tableRowAnimationPhase[j], 0, uiDefinition.animationFrame, 0, uiDefinition.expandSize);
    } else {
      tableExpandSize[j] = 0;
    }
  }

  //draw table
  {
    fill(255);
    textFont(fontPrintChar21, uiDefinition.fontSize);
    for (i = 0; i < 5; i++) {
      var leftPosTitle = uiDefinition.leftSpacing + uiDefinition.columnPosition[i];
      text(tableContent.title[i], leftPosTitle, uiDefinition.topSpacing);
    }
    var topPos = uiDefinition.topSpacing + uiDefinition.titleSpaceing + uiDefinition.rowSize;
    for (j = 0; j < tableContent.content.length; j++) {
      fill(j == selectedRow ? 0x6D : 0xFF);
      for (i = 0; i < 5; i++) {
        var leftPosCell = uiDefinition.leftSpacing + uiDefinition.columnPosition[i];
        text(tableContent.content[j].text[i], leftPosCell, topPos);
      }
      topPos += uiDefinition.rowSize + tableExpandSize[j];
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

    if (useWebUSB && webUSBPort) {
      var sendValue = -fftSelected[totalLenfth - 1]; //Y axis down
      var LEDbrightness;
      var motorValue, motorStrength;
      var duration = 100; //let every command run for 100ms or be overwritten


      var LEDvariation = sin(millis() / 500);
      if (sendValue <= 0) { //LEDmap
        LEDbrightness = Math.floor(64 + 10 * LEDvariation);
      } else {
        var squareSendValue = sendValue * sendValue * sendValue;
        LEDbrightness = map(squareSendValue, 0, 1, 64, 175) + map(squareSendValue, 0, 1, 10, 0) * LEDvariation;
        LEDbrightness = Math.floor(LEDbrightness);
        if (LEDbrightness > 255) LEDbrightness = 255;
      }

      motorStrength = 150;
      var beatDuration = 80; //the number defines beat duration (motor on time)

      if (sendValue <= 0) { //if signal is below 0, shut down motor
        motorHeartbeatBeginned = false;
        if (motorCurrentStatus && (millis() < motorStatusChangeTime)) {
          //do nothing, let this beat finish
        } else {
          motorCurrentStatus = false;
          motorStatusChangeTime = 0;
        }
      } else {
        if (!motorHeartbeatBeginned) { //just begins
          motorStatusChangeTime = millis() + 750; //rest before 1st beat.
          motorHeartbeatBeginned = true;
        }
        if (millis() >= motorStatusChangeTime) {
          if (!motorCurrentStatus) {
            motorCurrentStatus = true;
            motorStatusChangeTime = millis() + beatDuration;
          } else {
            motorCurrentStatus = false;
            motorStatusChangeTime = millis() + Math.floor(random(600, 800)); //rest between each beat
          }
        }
      }

      if (motorCurrentStatus) { //give motor a value according to on and off status
        motorValue = motorStrength;
      } else {
        motorValue = 0;
      }


      var ledHighValue = [255, 36, 0, 0, 255, 129, 0, 0, 8, 8, 38, 0, 16, 0, 38, 0, 0, 20, 0, 0, 255, 0, 0, 0];
      var ledLowValue = [10, 1, 0, 0, 11, 12, 0, 0, 3, 3, 8, 0, 3, 0, 8, 0, 0, 6, 0, 0, 25, 0, 0, 0];
      var cmdBuf = ""
      for (i = 0; i < 4 * 6; i++) {
        var interpolatedValue = int(map(LEDbrightness, 54, 185, ledLowValue[i], ledHighValue[i]))
        if (interpolatedValue > 255) interpolatedValue = 255;
        if (interpolatedValue < 0) interpolatedValue = 255;

        cmdBuf = cmdBuf + ("00" + (interpolatedValue).toString(16)).slice(-2);
      }
      var ledCmd = "L" + cmdBuf + "\n";

      var motorStr = ("00" + (motorValue).toString(16)).slice(-2);
      var durationStr = ("0000" + (duration).toString(16)).slice(-4);
      var commandStr = "M" + motorStr + durationStr + "\n" + ledCmd;
      //console.log(commandStr);
      webUSBPort.send(textEncoder.encode(commandStr)).catch(error => {
        console.log('Send error: ' + error);
      });
    }
  }

  //drawgraph
  {
    push();
    topPos = uiDefinition.topSpacing + uiDefinition.titleSpaceing;
    for (j = 0; j < tableContent.content.length; j++) {
      if (tableRowAnimationPhase[j] > 0) {
        var spaceTop = topPos + uiDefinition.rowSize + uiDefinition.fftBlackSpace;
        var spaceBottom = topPos + tableExpandSize[j] + uiDefinition.rowSize + uiDefinition.rowSize - uiDefinition.fontSize - uiDefinition.fftBlackSpace;

        var spaceMiddle = (spaceTop + spaceBottom) / 2;

        var totalLength = uiDefinition.fftPointsLength;
        var waveScale = uiDefinition.fftGraphicLength / totalLength;

        textFont(fontPrintChar21, uiDefinition.fontSize * 0.8);
        fill(0x6D);
        text('200 HZ', uiDefinition.leftSpacing, spaceTop - uiDefinition.fontSize * 1);
        text('005 HZ', uiDefinition.leftSpacing, spaceBottom + uiDefinition.fontSize * 1.8);

        stroke(0x33);
        strokeWeight(uiDefinition.lineWeight);
        line(0, spaceMiddle, uiDefinition.leftSpacing + uiDefinition.fftGraphicLength + uiDefinition.leftSpacing, spaceMiddle);

        var frameMod = framePlaying[selectedRow] % 30;
        frameMod = 0;
        noFill();
        beginShape(LINES);
        for (i = totalLength - frameMod; i >= 0; i -= 30) {
          vertex(uiDefinition.leftSpacing + i * waveScale, spaceTop);
          vertex(uiDefinition.leftSpacing + i * waveScale, spaceBottom);
        }
        endShape();

        var fftData = fftResult[j];
        stroke(0xc7);
        var xPos = uiDefinition.leftSpacing;

        var verticalScale = (spaceBottom - spaceTop) * 0.4;
        waveScale = (uiDefinition.fftGraphicLength + 2 * uiDefinition.leftSpacing) / (totalLength - 1);
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
      topPos += uiDefinition.rowSize + tableExpandSize[j];
    }

    pop();
  }

}

function mouseClicked() {
  //console.log(mouseY);

  //check which row is clicked;
  var checkLinePos = uiDefinition.topSpacing + uiDefinition.titleSpaceing;
  var lineClicked = -1;
  if (mouseY > checkLinePos) {
    for (j = 0; j < tableContent.content.length; j++) {
      if ((mouseY <= checkLinePos + uiDefinition.rowSize + tableExpandSize[j])) {
        lineClicked = j;
        break;
      }
      checkLinePos += uiDefinition.rowSize + tableExpandSize[j];
    }
  }
  for (i = 0; i < tableContent.content.length; i++) tableExpandSize[i] = 0;
  if (lineClicked >= 0) {
    if (tableRowAnimationPhase[lineClicked] === 0) tableRowAnimationPhase[lineClicked] = 1;
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

  if (useWebUSB && !webUSBPressed) {
    webUSBPressed = true;
    if (!webUSBPort) {
      serial.requestPort().then(selectedPort => {
        webUSBPort = selectedPort;
        webUSBConnect();
      }).catch(error => {
        console.log(error);
      });
    }
  }
}

function windowResized() {
  //adaptive
  recalulateUI();
  var contentHeight = uiDefinition.topSpacing + uiDefinition.titleSpaceing + uiDefinition.rowSize;
  contentHeight = contentHeight + (tableContent.content.length) * uiDefinition.rowSize + uiDefinition.expandSize;

  var canvasHeight = max(contentHeight, windowHeight);

  resizeCanvas(windowWidth, canvasHeight);
}

function webUSBConnect() {
  webUSBPort.connect().then(() => {
    console.log('WebUSB connected')
    webUSBPort.onReceive = data => {
      let textDecoder = new TextDecoder();
      console.log(textDecoder.decode(data));
    }
    webUSBPort.onReceiveError = error => {
      console.error(error);
    };
  }, error => {
    console.log(error);
  });
}
