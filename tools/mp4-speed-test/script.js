function testSpeed() {
    // 清空 log 和 result 內的值
    const log = document.getElementById('log');
    const result = document.getElementById('result');
    log.innerText = '';
    result.innerText = '';

    // URL of the video stream or video file for testing
    const inputUrl = document.getElementById('url').value;
    const videoUrl = inputUrl;
    const video = document.getElementById('videoPlayer');

    let startTime = performance.now();
    let bytesReceived = 0;
    let lastTime = startTime;

    fetch(videoUrl).then(response => {
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        const stream = new ReadableStream({
            start(controller) {
                function push() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            controller.close();
                            const totalTime = (performance.now() - startTime) / 1000; // total time in seconds
                            result.innerText = `Speed measurement completed. Check the log for details. Total time: ${totalTime.toFixed(2)} seconds`;
                            return;
                        }
                        bytesReceived += value.length;
                        controller.enqueue(value);
                        const currentTime = performance.now();
                        const elapsedTime = (currentTime - lastTime) / 1000; // time in seconds

                        if (elapsedTime >= 0.1) { // every 100ms
                            const speed = (bytesReceived / elapsedTime) / (1024 * 1024); // speed in Mbps
                            log.innerText += `Time: ${((currentTime - startTime) / 1000).toFixed(2)} s, Speed: ${speed.toFixed(2)} Mbps\n`;
                            lastTime = currentTime; // reset last time
                            bytesReceived = 0; // reset bytes received
                        }
                        push();
                    }).catch(error => {
                        console.error("Error reading stream:", error);
                        result.innerText = "Error occurred. Please try again.";
                    });
                }
                push();
            }
        });

        return new Response(stream);
    }).then(response => response.blob())
      .then(blob => {
          // Create a URL for the blob and set it as the video source
          const videoURL = URL.createObjectURL(blob);
          video.src = videoURL;
          video.play();
      })
      .catch(error => {
          console.error("Error fetching the video:", error);
          result.innerText = "Error occurred. Please try again.";
      });
}

