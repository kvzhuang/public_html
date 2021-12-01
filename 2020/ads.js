// Re-use this AdsLoader instance for the entire lifecycle of your page.
var adsLoader = new google.ima.AdsLoader(adDisplayContainer);

// Add event listeners
adsLoader.addEventListener(
    google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
    onAdsManagerLoaded,
    false);
adsLoader.addEventListener(
    google.ima.AdErrorEvent.Type.AD_ERROR,
    onAdError,
    false);

function onAdError(adErrorEvent) {
  // Handle the error logging and destroy the AdsManager
  console.log(adErrorEvent.getError());
  adsManager.destroy();
}

// An event listener to tell the SDK that our content video
// is completed so the SDK can play any post-roll ads.
var contentEndedListener = function() {adsLoader.contentComplete();};
videoContent.onended = contentEndedListener;

// Request video ads.
var adsRequest = new google.ima.AdsRequest();
adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?' +
    'sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&' +
    'impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&' +
    'cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator=';

// Specify the linear and nonlinear slot sizes. This helps the SDK to
// select the correct creative if multiple are returned.
adsRequest.linearAdSlotWidth = 640;
adsRequest.linearAdSlotHeight = 400;
adsRequest.nonLinearAdSlotWidth = 640;
adsRequest.nonLinearAdSlotHeight = 150;

var playButton = document.getElementById('playButton');
playButton.addEventListener('click', requestAds);

function requestAds() {
  adsLoader.requestAds(adsRequest);
}
