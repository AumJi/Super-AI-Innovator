document.addEventListener("DOMContentLoaded", function () {
  // ตัวแปรเก็บข้อมูล
  let selectedFile = null;
  let webSocket = null;
  let detectionStartTime = null;
  let maxDensity = 0;
  let canvas, ctx;

  // อ้างอิงถึง DOM elements จาก main.html
  const uploadArea = document.getElementById("uploadArea");
  const videoUpload = document.getElementById("videoUpload");
  const fileInfo = document.getElementById("fileInfo");
  const fileName = document.getElementById("fileName");
  const fileSize = document.getElementById("fileSize");
  const progressBar = document.getElementById("progressBar");
  const removeFile = document.getElementById("removeFile");
  const analysisOptions = document.getElementById("analysisOptions");
  const submitBtn = document.getElementById("submitBtn");
  const resultsModal = document.getElementById("resultsModal");
  const closeModal = document.getElementById("closeModal");
  const videoLoading = document.getElementById("videoLoading");
  const loadingText = document.getElementById("loadingText");
  const totalPigeons = document.getElementById("totalPigeons");
  const maxDensityEl = document.getElementById("maxDensity");
  const durationEl = document.getElementById("detectionDuration");
  const riskAreasList = document.getElementById("riskAreasList");

  // กำหนด Canvas สำหรับแสดงผลวิดีโอ
  function initCanvas() {
    canvas = document.getElementById("videoCanvas");
    ctx = canvas.getContext("2d");
    const container = document.getElementById("videoContainer");

    // ตรวจสอบว่า container มีขนาดแล้วหรือไม่
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    } else {
      // ถ้ายังไม่มีขนาด ให้กำหนดขนาดเริ่มต้นหรือรอจนกว่า container จะพร้อม
      canvas.width = 800; // ค่าเริ่มต้นชั่วคราว
      canvas.height = 450;

      // รอจนกว่า container จะมีขนาดจริง
      const resizeObserver = new ResizeObserver(() => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        resizeObserver.disconnect(); // หยุดสังเกตหลังจากได้ขนาดแล้ว
      });
      resizeObserver.observe(container);
    }
  }
  // กำหนด Event Listeners
  function setupEventListeners() {
    uploadArea.addEventListener("dragover", handleDragOver);
    uploadArea.addEventListener("dragleave", handleDragLeave);
    uploadArea.addEventListener("drop", handleDrop);
    uploadArea.addEventListener("click", () => videoUpload.click());
    videoUpload.addEventListener("change", handleFileSelect);
    removeFile.addEventListener("click", handleRemoveFile);
    submitBtn.addEventListener("click", handleSubmit);
    closeModal.addEventListener("click", closeResultsModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeResultsModal);
    window.addEventListener("resize", initCanvas);

    const videoContainer = document.getElementById("videoContainer");
    async function drawVideoFrame(frameData) {
      return new Promise((resolve) => {
        const blob = new Blob([frameData], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
          // ตรวจสอบขนาด Canvas อีกครั้งก่อนวาด
          const container = document.getElementById("videoContainer");
          if (
            canvas.width !== container.clientWidth ||
            canvas.height !== container.clientHeight
          ) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          videoLoading.classList.add("hidden");
          videoLoading.style.display = "none"; // เพิ่มนี้เพื่อความแน่นอน
          videoLoading.style.backgroundColor = "transparent"; // ลบพื้นหลัง
          loadingText.classList.add("hidden");
          resolve();
        };

        img.onerror = () => {
          console.error("Failed to load image");
          URL.revokeObjectURL(url);
          resolve();
        };

        img.src = url;
      });
    }
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        canvas.width = videoContainer.clientWidth;
        canvas.height = videoContainer.clientHeight;
      }
    });
    resizeObserver.observe(videoContainer);
  }

  // Drag and Drop Handlers
  function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
  }

  function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  // File Selection Handler
  function handleFileSelect(e) {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  }

  // File Handling
  function handleFile(file) {
    const validTypes = ["video/mp4", "video/quicktime", "video/x-msvideo"];
    const validExtensions = [".mp4", ".mov", ".avi"];
    if (
      !validTypes.includes(file.type) &&
      !validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    ) {
      showAlert("กรุณาเลือกไฟล์วิดีโอเท่านั้น (MP4, MOV, AVI)", "error");
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      showAlert("ขนาดไฟล์ต้องไม่เกิน 1GB", "error");
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove("hidden");
    analysisOptions.classList.remove("hidden");
    submitBtn.disabled = false;
    simulateUploadProgress();
  }

  // Format File Size
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
  function handleRemoveFile() {
    selectedFile = null;
    fileInfo.classList.add("hidden");
    analysisOptions.classList.add("hidden");
    submitBtn.disabled = true;
    videoUpload.value = "";
    progressBar.style.width = "0%";
  }

  // Simulate Upload Progress
  function simulateUploadProgress() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress > 100) {
        progress = 100;
        clearInterval(interval);
      }
      progressBar.style.width = `${progress}%`;
    }, 200);
  }

  // Show Alert
  function showAlert(message, type = "error") {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} fixed top-4 right-4 max-w-md z-50 p-4 rounded-lg shadow-md`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
  }

  // Handle Submit
  async function handleSubmit() {
    if (!selectedFile) {
      showAlert("กรุณาเลือกไฟล์วิดีโอก่อน", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
            <span class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังวิเคราะห์วิดีโอ...
            </span>
        `;

    await uploadFile(selectedFile);
  }

  // Upload File
  async function uploadFile(file) {
    const formData = new FormData();
    formData.append("video", file);
    const analysisOptions = {
      detectPigeons: document.getElementById("detectPigeons").checked,
      soundSignal: document.getElementById("soundSignal").checked,
      identifyRiskAreas: document.getElementById("identifyRiskAreas").checked,
      analyzeFlightPatterns: document.getElementById("analyzeFlightPatterns")
        .checked,
    };
    formData.append("options", JSON.stringify(analysisOptions));

    try {
      const response = await fetch("http://localhost:8000/process_video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.video_path) {
        initWebSocket(result.video_path);
        showAlert("เริ่มการวิเคราะห์วิดีโอ!", "success");
      } else {
        throw new Error("No video_path received");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showAlert("เกิดข้อผิดพลาดในการอัปโหลดวิดีโอ: " + error.message, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = "เริ่มการวิเคราะห์";
    }
  }

  // Initialize WebSocket
  function initWebSocket(videoPath) {
    if (webSocket) {
      webSocket.close();
    }

    initCanvas();
    resultsModal.classList.remove("hidden");
    videoLoading.classList.remove("hidden");
    loadingText.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    detectionStartTime = new Date();

    const wsProtocol =
      window.location.protocol === "https:" ? "wss://" : "ws://";
    webSocket = new WebSocket(`${wsProtocol}${window.location.host}/ws`);

    webSocket.onopen = () => {
      console.log("WebSocket connected");
      webSocket.send(JSON.stringify({ video_path: videoPath }));
    };

    webSocket.onmessage = async (event) => {
      if (typeof event.data === "string") {
        const data = JSON.parse(event.data);
        updateAnalysisResults(data);
      } else {
        await drawVideoFrame(event.data);
      }
    };

    webSocket.onclose = (event) => {
      console.log(
        `WebSocket closed, code=${event.code}, reason=${event.reason}`
      );
      videoLoading.classList.add("hidden");
      videoLoading.style.display = "none"; // เพิ่มนี้เพื่อความแน่นอน
      videoLoading.style.backgroundColor = "transparent"; // ลบพื้นหลัง
      loadingText.classList.add("hidden");
      submitBtn.disabled = false;
      submitBtn.innerHTML = "เริ่มการวิเคราะห์";
      if (!event.wasClean) {
        showAlert("การเชื่อมต่อ WebSocket ขาดหาย ลองใหม่ใน 3 วินาที", "error");
        setTimeout(() => initWebSocket(videoPath), 3000);
      }
    };

    webSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      showAlert("เกิดข้อผิดพลาดในการเชื่อมต่อ WebSocket", "error");
      videoLoading.classList.add("hidden");
      videoLoading.style.display = "none"; // เพิ่มนี้เพื่อความแน่นอน
      videoLoading.style.backgroundColor = "transparent"; // ลบพื้นหลัง
      loadingText.classList.add("hidden");
    };
  }

  // Draw Video Frame
  async function drawVideoFrame(frameData) {
    return new Promise((resolve) => {
      const blob = new Blob([frameData], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        // ตรวจสอบขนาด Canvas ก่อนวาด
        const container = document.getElementById("videoContainer");
        if (
          canvas.width !== container.clientWidth ||
          canvas.height !== container.clientHeight
        ) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        // ซ่อน loading indicator เมื่อวิดีโอเริ่มแสดงผล
        videoLoading.classList.add("hidden");
        videoLoading.style.display = "none"; // เพิ่มนี้เพื่อความแน่นอน
        videoLoading.style.backgroundColor = "transparent"; // ลบพื้นหลัง
        loadingText.classList.add("hidden");
        resolve();
      };

      img.onerror = () => {
        console.error("Failed to load image");
        URL.revokeObjectURL(url);
        videoLoading.classList.remove("hidden"); // แสดง loading ใหม่หากโหลดภาพล้มเหลว
        loadingText.classList.remove("hidden");
        resolve();
      };

      img.src = url;
    });
  }

  // Update Analysis Results
  function updateAnalysisResults(data) {
    if (!totalPigeons || !maxDensityEl || !durationEl || !riskAreasList) {
      console.error("One or more result elements not found in DOM");
      return;
    }

    if (data.current_objects !== undefined) {
      totalPigeons.textContent = `${data.current_objects} ตัว`;
      if (data.current_objects > maxDensity) {
        maxDensity = data.current_objects;
        maxDensityEl.textContent = `${maxDensity} ตัว/ตร.ม.`;
      }
    }
    if (data.unique_objects !== undefined) {
      totalPigeons.textContent = `${data.unique_objects} ตัว`;
    }
    if (detectionStartTime && durationEl) {
      // ตรวจสอบ durationEl ด้วย
      const duration = Math.floor((new Date() - detectionStartTime) / 1000);
      durationEl.textContent = `${duration} วินาที`;
    }

    // จัดการ riskAreasList
    riskAreasList.innerHTML =
      '<li class="flex items-start"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400 mr-2 mt-0.5"viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd"d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"clip-rule="evenodd" /></svg><span>ยังไม่พบพื้นที่เสี่ยง</span></li>';

    if (data.status === "success") {
      showAlert(data.message, "success");
      closeResultsModal();
    } else if (data.status === "error") {
      showAlert(data.message, "error");
      closeResultsModal();
    }
  }

  // Close Results Modal
  function closeResultsModal() {
    resultsModal.classList.add("hidden");
    document.body.style.overflow = "auto";
    if (webSocket) {
      webSocket.close();
      webSocket = null;
    }
    submitBtn.disabled = false;
    submitBtn.innerHTML = "เริ่มการวิเคราะห์";
  }
  // Initialize
  initCanvas();
  setupEventListeners();
});
