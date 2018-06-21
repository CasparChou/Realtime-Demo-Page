(function () {

  var time = Date.now()
  var endpoint = "/api/realtime"
  function apiCall(data, callback) {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: data
    })
    .then(function (r) { return r.json(); })
    .then(function (response) {
      if( sendTime < time ){
        console.log("Obsolete data ", sendTime, time)
        return
      }
      time = sendTime
      callback(response.results)
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

        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

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
    
    setInterval(() => {
      data = takepicture(2)
      analyzePicture(data)
    }, 1000);

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

  function takepicture(endpoint) {
    if (width && height) {
      canvas2.width = width;
      canvas2.height = height;
      ctx = canvas2.getContext('2d');
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      return canvas2.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, '')

    } else {
      clearphoto();
    }
  }

  function renaderResults(results) {

    drawBoundingBox = (ctx, box) => {
      // Draw Bounding Box
      ctx.beginPath();
      ctx.lineWidth = box.borderWidth;
      ctx.strokeStyle = box.borderColor;
      ctx.rect(box.left, box.top, box.width, box.height);
      ctx.stroke();
      ctx.closePath();
    }
    drawLabel = (ctx, label) => {
      // Draw Label
      ctx.beginPath();
      ctx.font = label.textFontStyle
      ctx.fillStyle = label.textColor
      ctx.fillText(label.text, label.textLeft, label.textTop)
      ctx.closePath();
    }

    drawLabelRect = (ctx, labe) => {
      // Draw Label Rect
      ctx.beginPath()
      ctx.fillStyle = label.rectColor
      ctx.rect(label.rectLeft, label.rectTop, label.rectWidth, label.rectHeight)
      ctx.fill()
      ctx.closePath()
    }

    ctx = canvas.getContext('2d')
    results.forEach(each => {
      console.log(each.name, each.box, each.score)
      each.box.top -= 150;
      each.box.bottom -= 150;

      var boundingBox = {
        left: each.box.left, 
        top: each.box.top, 
        width: each.box.right - each.box.left, 
        height: each.box.bottom - each.box.top,
        borderColor: "rgba(230, 196, 34, 0.8)",
        borderWidth: "2"
      }

      var label = {
        text: each.name + " (" + Math.round(each.score * 100) + "%)",
        textLeft: each.box.left + 5,
        textTop: each.box.top -6,
        textColor: "white",
        textFontStyle: "16px Microsoft JhengHei UI",
        rectLeft: each.box.left - 1,
        rectTop: each.box.top - 22,
        rectWidth: (each.name + " (" + Math.round(each.score * 100) + "%)").length * 8 + 15,
        rectHeight: 22,
        rectColor: "rgba(230, 196, 34, 0.8)"
      }

      drawBoundingBox(ctx, boundingBox)
      drawLabelRect(ctx, label)
      drawLabel(ctx, label)

    })
  }

  function analyzePicture(data) {
    const sendTime = Date.now();
    apiCall(data, (results) => {
      clearRect(canvas)
      renaderResults(results)
    });
  }

  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener('load', startup, false);
})();
