function testSpeed() {
  // URL of the video stream or video file for testing
  const inputUrl = document.getElementById('url').value;
  const videoUrl = inputUrl;
  const video = document.getElementById('videoPlayer');
  const log = document.getElementById('log');

  let start = performance.now();
  if(Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, function() {
          start = performance.now();
          video.play();
      });

      hls.on(Hls.Events.FRAG_BUFFERED, function(event, data) {
          console.log('FRAG_BUFFERED');
          const end = performance.now();
          const timeTaken = (end - start) / 1000; // time in seconds

          // Get size of the fragment loaded
          const sizeInBytes = data.stats.loaded;
          const speed = (sizeInBytes / timeTaken) / (1024 * 1024); // speed in Mbps

          document.getElementById('result').innerText = `Download speed: ${speed.toFixed(4)} Mbps`;
          log.innerText += `Fragment loaded: ${data.frag.url} ${speed.toFixed(4)} Mbps\n`;

          // Optionally, you can stop listening to further fragment loads after the first measurement.
          // hls.off(Hls.Events.FRAG_BUFFERED);
      });

  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoUrl;
      video.addEventListener('loadedmetadata', function() {
          // The native video tag doesn't give the same granularity of events as hls.js.
          // Estimating speed directly from native events can be a bit more challenging.
          video.play();
      });
      video.addEventListener('playing', function() {
        console.log('Video is playing (片段載入完畢並開始播放)...');

      });
  }

  fetch(videoUrl).then(response => response.blob())
      .then(blob => {
          const end = performance.now();
          const timeTaken = (end - start) / 1000; // time in seconds

          // Assuming the video file is large enough that it hasn't been cached.
          const fileSizeInBytes = blob.size;
          const speed = (fileSizeInBytes / timeTaken) / (1024 * 1024); // speed in Mbps

          document.getElementById('result').innerText = `Download speed: ${speed.toFixed(2)} Mbps`;




      })
      .catch(error => {
          console.error("Error fetching the video:", error);
          document.getElementById('result').innerText = "Error occurred. Please try again.";
      });
}


