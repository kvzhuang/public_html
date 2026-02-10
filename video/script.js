function testSpeed() {
  // URL of the video stream or video file for testing
  const inputUrl = document.getElementById('url').value;
  const videoUrl = inputUrl;
  const video = document.getElementById('videoPlayer');
  const log = document.getElementById('log');
  video.src =inputUrl;
  video.play();
}


