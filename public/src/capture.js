(function () {

  const CONFIDENCE = 40
  const SNATSHOT_MS = 800
  const ENDPOINT = "CUSTOM VISION ENDPOINT"
  const HEADER = { 
    "Content-Type": "application/octet-stream",
    "Prediction-Key": "PREDICTION KEY"
  }
  const ABNORMAL_TEXT = "Something is falling, please check!"
  const ABNORMAL_TITLE = "DANGER!"

  var time = Date.now()
  function apiCall(data, callback) {
    const sendTime = Date.now();
    fetch(ENDPOINT, {
      method: "POST",
      headers: HEADER,
      body: data
    })
    .then(function (r) { return r.json(); })
    .then(function (response) {
      if( sendTime < time ){
        // console.log("Obsolete data ", sendTime, time)
        return
      }
      time = sendTime
      callback(response)
    }).catch(e => {
      console.log("Error", e)
    })
  }








  // The width and height of the captured photo. We will set the
  // width to the value defined here, but the height will be
  // calculated based on the aspect ratio of the input stream.

  var width = 800;    // We will scale the photo width to this
  var height = 500;     // This will be computed based on the input stream

  // |streaming| indicates whether or not we're currently streaming
  // video from the camera. Obviously, we start at false.

  var streaming = false;

  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.

  var video = null;
  var canvas = null;
  var canvas2 = null;
  var photo = null;

  function startup() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    canvas2 = document.getElementById('canvas2');
    photo = document.getElementById('photo');

    navigator.getMedia = (navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia);

    navigator.getMedia(
      {
        video: { width: 1280, height: 720, mirror: false },
        audio: false
      },
      function (stream) {
        if (navigator.mozGetUserMedia) {
          video.mozSrcObject = stream;
        } else {
          var vendorURL = window.URL || window.webkitURL;
          video.src = vendorURL.createObjectURL(stream);
        }
        video.play();
      },
      function (err) {
        console.log("An error occured! " + err);
      }
    );

    video.addEventListener('canplay', function (ev) {
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth / width);

        if (isNaN(height)) {
          height = width / (4 / 3);
        }
        height = 500;

        video.setAttribute('width', width);
        video.setAttribute('height', height);
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        canvas2.setAttribute('width', width);
        canvas2.setAttribute('height', height);

        streaming = true;
      }
    }, false);
    
    takepicture(analyzePicture)
    setInterval(() => {
      takepicture(analyzePicture)
    }, SNATSHOT_MS);

    clearphoto();
  }
  
  function clearphoto() {
    var context = canvas.getContext('2d');
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function clearRect(canvas) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  function takepicture(callback) {
    if (width && height) {
      canvas2.width = width;
      canvas2.height = height;
      ctx = canvas2.getContext('2d');
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      return canvas2.toBlob(callback, 'image/png')

    } else {
      clearphoto();
    }
  }

  function renaderResults(results) {

    // Draw Bounding Box
    drawBoundingBox = (ctx, box) => {
      ctx.beginPath();
      ctx.lineWidth = box.borderWidth;
      ctx.strokeStyle = box.borderColor;
      ctx.rect(box.left, box.top, box.width, box.height);
      ctx.stroke();
      ctx.closePath();
    }

    // Draw Label
    drawLabel = (ctx, label) => {
      ctx.beginPath();
      ctx.font = label.textFontStyle
      ctx.fillStyle = label.textColor
      ctx.fillText(label.text, label.textLeft, label.textTop)
      ctx.closePath();
    }

    // Draw Label Rect
    drawLabelRect = (ctx, label) => {
      ctx.beginPath()
      ctx.fillStyle = label.rectColor
      ctx.rect(label.rectLeft, label.rectTop, label.rectWidth, label.rectHeight)
      ctx.fill()
      ctx.closePath()
    }

    // Convert data struct
    conversion = (origin) => {
      return {
        left: origin.boundingBox.left * width,
        top: origin.boundingBox.top * height + 50,
        width: origin.boundingBox.width * width,
        height: origin.boundingBox.height * height - 100,
        name: origin.tagName,
        score: Math.round(origin.probability * 100)
      }
    }

    // Abnormality Detect
    abnormalCheck = (bound) => {
      return (bound.height/bound.width) < 0.55
    }

    results.predictions.forEach(each => {
      each['box'] = conversion(each)
      
      if (each.box.score < CONFIDENCE) return
      console.log(each.box)

      if (abnormalCheck(each.box)) {
        toastr.error(ABNORMAL_TEXT, ABNORMAL_TITLE)        
      }

      const theata = Math.floor((bound.height/bound.width) * 100) / 100
      
      const ctx = canvas.getContext('2d')
      const labelText = `${each.box.name} (${each.box.score}%), tanθ=(${theata})`
      const label = {
        text: labelText,
        textLeft: each.box.left + 5,
        textTop: each.box.top -6,
        textColor: "white",
        textFontStyle: "16px Microsoft JhengHei UI",
        rectLeft: each.box.left - 1,
        rectTop: each.box.top - 22,
        rectWidth: labelText.length * 8 + 15, // [JhengHei Font] Each font size = 8
        rectHeight: 22,
        rectColor: !abnormalCheck(each.box) ? "rgba(161, 230, 34, 0.8)" : "rgba(230, 92, 34, 0.8)",
      }
      const boundingBox = {
        left: each.box.left, 
        top: each.box.top, 
        width: each.box.width, 
        height: each.box.height,
        borderColor: !abnormalCheck(each.box) ? "rgba(161, 230, 34, 0.8)" : "rgba(230, 92, 34, 0.8)", //"rgba(230, 196, 34, 0.8)",
        borderWidth: "2"
      }

      drawBoundingBox(ctx, boundingBox)
      drawLabelRect(ctx, label)
      drawLabel(ctx, label)

    })
  }

  function analyzePicture(data) {
    apiCall(data, (results) => {
      clearRect(canvas)
      renaderResults(results)
    });
  }

  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener('load', startup, false);
})();
