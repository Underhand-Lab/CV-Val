import * as webcam from "./web-cam.js";
import * as BallDetector from '../src/track/ball-detector/index.js';

const detectorSelect = document.getElementById("model");
const detectors = {
    "yolo11x": new BallDetector.YOLOLiveBallDetector(
        "../external/models/yolo11/yolo11x_web_model/model.json"),
    "yolo11l": new BallDetector.YOLOLiveBallDetector(
        "../external/models/yolo11/yolo11l_web_model/model.json"),
    "yolo11m": new BallDetector.YOLOLiveBallDetector(
        "../external/models/yolo11/yolo11m_web_model/model.json"),
    "yolo11s": new BallDetector.YOLOLiveBallDetector(
        "../external/models/yolo11/yolo11s_web_model/model.json"),
    "yolo11n": new BallDetector.YOLOLiveBallDetector(
        "../external/models/yolo11/yolo11n_web_model/model.json")
}

let detector;

let isPlay = false;
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const retCanvas = document.querySelector('canvas');
const retCtx = retCanvas.getContext('2d');
const conf = document.querySelector('#confInput');
let confValue = 0.5;

// 2. 루프 함수
let currentResult = null; // 가장 최신의 분석 결과를 저장할 변수
let isAnalyzing = false;

// 결과 시각화 함수
function drawBBox(bbox, conf) {
    if (conf < confValue) return;
    const [x, y, w, h] = bbox;
    retCtx.strokeStyle = "#00FF00";
    retCtx.lineWidth = 3;
    retCtx.strokeRect(x, y, w, h);
    retCtx.fillStyle = "#00FF00";
    retCtx.fillText(`Ball: ${Math.round(conf * 100)}%`, x, y > 10 ? y - 5 : 10);
}

async function processLoop() {
    if (!isPlay) return;

    if (webcam.video.videoWidth > 0) {
        // 캔버스 크기 맞춤
        if (retCanvas.width !== webcam.video.videoWidth) {
            retCanvas.width = webcam.video.videoWidth;
            retCanvas.height = webcam.video.videoHeight;
        }

        /**
         * 핵심 순서:
         * 1. 이전 화면을 싹 지우고 새 영상을 그린다.
         * 2. 그 "직후"에 (있다면) 최신 분석 결과 박스를 그린다.
         * 이렇게 하면 영상이 박스를 덮어씌울 틈이 없습니다.
         */
        
        // 1. 배경 영상 그리기
        retCtx.drawImage(webcam.video, 0, 0, retCanvas.width, retCanvas.height);

        console.log(currentResult);
        // 2. 저장된 최신 결과 박스 그리기
        if (currentResult) {
            drawBBox(currentResult.bbox, currentResult.confidence);
        }

        // 3. 분석 요청 (이미 분석 중이면 건너뜀 -> 성능 확보)
        if (!isAnalyzing) {
            // await를 하지 않고 별도로 실행해서 루프(영상)가 멈추지 않게 합니다.
            runAnalysis(webcam.video); 
        }
    }

    requestAnimationFrame(processLoop);
}

async function runAnalysis(videoElement) {
    isAnalyzing = true;
    try {
        // 분석 전용 오프스크린 캔버스에 복사해서 분석하는 것이 가장 안전합니다.
        // 혹은 직접 videoElement를 넣어도 detector가 지원한다면 괜찮습니다.
        const result = await detector.process(videoElement);
        
        // 분석 결과를 전역 변수에 저장 (다음 processLoop 프레임에서 그려짐)
        currentResult = result; 
    } catch (err) {
        console.error("분석 중 에러:", err);
    }
    isAnalyzing = false;
}
// 3. 클릭 이벤트
retCanvas.addEventListener('click', async () => {
    if (isPlay) {
        isPlay = false;
        document.querySelector('nav').classList.remove("hidden");
        document.querySelector('.slider').style.display = "block";
        webcam.stopCamera();
    } else {
        isPlay = true;
        document.querySelector('nav').classList.add("hidden");
        document.querySelector('.slider').style.display = "none";
        confValue = parseFloat(conf.value);
        
        detector = detectors[detectorSelect.value];
        await detector.initialize();
        await webcam.startCamera();
        processLoop(); // 루프 시작
    }
});