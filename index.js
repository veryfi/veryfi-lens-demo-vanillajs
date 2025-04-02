import VeryfiLens from "./lens-sdk-wasm/veryfi-lens.js";
const PROCESS_DOCUMENT_URL = "https://lens-dev.veryfi.com/rest/process";
const CLIENT_ID = "YOUR_CLIENT_ID";
const API_KEY = "YOUR_API_KEY";
const USERNAME = "your.username";


let isSocket = false;
let isWasm = false;
let isLong = false;
let isStitching = false;
let isUpload = false;
let image = "";
let base64Image = "";
let imageFile = null;

function toggleVisibility(elementId, isVisible) {
  document.getElementById(elementId).style.display = isVisible
    ? "flex"
    : "none";
}

function handleButtonsOn() {
  if (isLong) {
    toggleVisibility("stitch-button", true);
    toggleVisibility("preview-container", true);
    toggleVisibility("veryfi-container", true);
    toggleVisibility("lens-image-preview", true);
  } else if (isUpload) {
    toggleVisibility("upload-area", true);
    toggleVisibility("upload-image-preview", true);
  } else {
    isWasm && toggleVisibility("capture-wasm-button", true)
    isSocket && toggleVisibility("capture-socket-button", true);
    toggleVisibility("veryfi-container", true);
    toggleVisibility("lens-image-preview", true);
  }
  toggleVisibility("buttons-container", false);
  document.getElementById("stop-button").style.display = "block";
}

function handleButtonsOff() {
  const elementsToHide = [
    "preview-container",
    "stitch-button",
    "stop-stitch-button",
    "upload-area",
    "upload-image-preview",
    "upload-crop-button",
    "submit-upload",
    "submit-lens",
    "capture-socket-button",
    "capture-wasm-button",
    "lens-image-preview",
    "veryfi-container",
    "stop-button",
  ];
  elementsToHide.forEach((element) => toggleVisibility(element, false));
  toggleVisibility("buttons-container", true);
}

async function validatePartner(clientId) {
  const validateUrl = "https://lens.veryfi.com/rest/validate_partner";
  try {
    const requestOptions = {
      method: "POST",
      headers: { "CLIENT-ID": clientId },
    };
    const response = await fetch(validateUrl, requestOptions);
    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error("Error validating partner:", error);
    return null;
  }
}

async function processImage(image, clientId, username, apiKey, deviceData) {
  try {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: image,
        username: username,
        api_key: apiKey,
        client_id: clientId,
        device_data: deviceData,
      }),
    };
    const response = await fetch(PROCESS_DOCUMENT_URL, requestOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error processing the image:", error);
    throw error; // Re-throw the error for further handling if needed
  }
}

function processFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const imgData = e.target.result;
    base64Image = imgData;
    document.getElementById("upload-image").src = base64Image;
    document.getElementById("upload-crop-button").style.display = "block";
  };
  reader.onerror = (error) => {
    console.error("Error reading file:", error);
  };
  reader.readAsDataURL(file);
  toggleVisibility("upload-area", false);
}

function base64ToBlob(base64) {
  let base64Data = base64;
  let mimeString = "image/jpeg";
  if (base64.includes(",")) {
    base64Data = base64.split(",")[1];
    mimeString = base64.split(",")[0].split(":")[1].split(";")[0];
  }

  if (!base64Data) {
    throw new Error("Invalid base64 string");
  }

  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

window.startSocketLens = async () => {
  try {
    await VeryfiLens.init(sessionToken, CLIENT_ID);
    isSocket = true;
    handleButtonsOn();
  } catch (error) {
    console.error("Error starting Socket Lens:", error);
  }
};

window.startWasmLens = async () => {
  try {
    await VeryfiLens.initWasm(sessionToken, CLIENT_ID);
    isWasm = true;
    handleButtonsOn();
  } catch (error) {
    console.error("Error starting Wasm Lens:", error);
  }
};

window.dragOver = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

window.dragLeave = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

window.drop = (event) => {
  event.preventDefault();
  event.stopPropagation();
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
};

window.triggerInput = () => {
  document.getElementById("file-input").click();
};

window.handleImageChange = (event) => {
  const file = event.target.files[0];
  imageFile = file;
  if (file) {
    processFile(file);
  }
};

window.submitImage = async () => {
  console.log('Submitting')
  try {
    const receiptData = await processImage(
      image,
      CLIENT_ID,
      USERNAME,
      API_KEY,
      deviceData
    );
    console.log(receiptData);
  } catch (error) {
    console.error("Error processing the image:", error);
  } finally {
    document.getElementById("submit-lens").disabled = true;
  }
};

window.handleCrop = async () => {
  try {
    const data = await VeryfiLens.captureUploaded(imageFile);
    base64Image = data;
    image = data;
    const img = document.getElementById("upload-cropped-image");
    const img2 = document.getElementById("upload-image");
    // Convert base64 to Blob and use Object URL
    const blob = base64ToBlob(data);
    const objectURL = URL.createObjectURL(blob);

    img.src = objectURL;
    img2.src = "";
    document.getElementById("submit-upload").style.display = "block";
    toggleVisibility("upload-crop-button", false);
  } catch (error) {
    console.error("Error handling crop:", error);
  }
};

window.exit = () => {
  VeryfiLens.cleanCanvases();
  handleButtonsOff();
  document.getElementById("upload-image").src = "";
  document.getElementById("lens-image").src = "";
  document.getElementById("upload-image").src = "";
  document.getElementById("upload-cropped-image").src = "";
  document.getElementById('file-input').value = "";
  document.getElementById("submit-lens").disabled = false;
  isWasm && VeryfiLens.stopCameraWasm();
  isSocket && VeryfiLens.stopCamera();
  isSocket = false;
  isWasm = false;
  isLong = false;
  isStitching = false;
  isUpload = false;
  image = "";
  base64Image = "";
  imageFile = null;
  const script = document.querySelector('script[src="/wasm/tfsimd/veryfi-wasm.js"]'); // Use only if you are getting several scripts attached to the DOM, also check for the correct path
    if (script) {
        script.remove();
    }
  window.location.reload(); // NOT RECOMMENDED, used here to overcome a bug when WASM is used right after Socket
};

window.captureSocket = async () => {
  const croppedImage = document.getElementById("lens-image");
  image = await VeryfiLens.capture();
  croppedImage.src = `data:image/jpeg;base64,${image}`;

  const container = document.getElementById("lens-image-preview");
  container.appendChild(croppedImage);

  document.getElementById("veryfi-container").style.display = "none";
  document.getElementById("capture-socket-button").style.display = "none";
  document.getElementById("submit-lens").style.display = "block";
};

window.captureWasm = async () => {
  const croppedImage = document.getElementById("lens-image");
  image = await VeryfiLens.captureWasm();
  croppedImage.src = `data:image/jpeg;base64,${image}`;

  const container = document.getElementById("lens-image-preview");
  container.appendChild(croppedImage);

  document.getElementById("veryfi-container").style.display = "none";
  document.getElementById("capture-wasm-button").style.display = "none";
  document.getElementById("submit-lens").style.display = "block";
};

window.startStitching = async () => {
  await VeryfiLens.startStitching();
  document.getElementById("stitch-button").style.display = "none";
  document.getElementById("stop-stitch-button").style.display = "flex";
};

window.captureLong = async () => {
  const croppedImage = document.getElementById("lens-image");
  image = await VeryfiLens.captureLong();
  croppedImage.src = `data:image/jpeg;base64,${image}`;

  document.getElementById("veryfi-container").style.display = "none";

  const container = document.getElementById("lens-image-preview");
  container.appendChild(croppedImage);

  document.getElementById("stop-stitch-button").style.display = "none";
  document.getElementById("submit-lens").style.display = "block";
};

window.startWasmLong = async () => {
  isWasm = true;
  isLong = true;
  await VeryfiLens.initWasmLong(sessionToken, CLIENT_ID);
  handleButtonsOn();
};

window.startUploadWasm = async () => {
  isUpload = true;
  await VeryfiLens.initUploadWasm(sessionToken, CLIENT_ID);
  handleButtonsOn();
};

const sessionToken = await validatePartner(CLIENT_ID);
const deviceData = await VeryfiLens.getDeviceData();
console.log(deviceData);
