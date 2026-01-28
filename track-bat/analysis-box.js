import { BoxList } from "../src/easy-h/ui/box-list.js";
import { TrackFrameMaker } from "../src/cv-val/track-bat/frame-maker/frame-maker.js";
import { SaveFrameMaker } from "../src/cv-val/save-frame-maker.js";

let frameMakers = [];
let processedData = null;

const confInput = document.getElementById('confInput');
confInput.addEventListener('change', () => {
    updateImage();
});

const frameMaker = new TrackFrameMaker();

const trailInput = document.getElementById('trailInput');
trailInput.addEventListener('change', () => {
    updateImage();
});

// --- candidateSelect 이벤트 리스너 ---
const candidateSelect = document.getElementById('candidateSelect');
candidateSelect.addEventListener('change', () => {
    if (!processedData) return;
    const idx = nowIdx();

    // 사용자가 '선택 안 함'을 고르면 -1이 전달됩니다.
    const selectedValue = parseInt(candidateSelect.value, 10);
    processedData.setSelectedIdx(idx, selectedValue);

    updateImage();
});

const slider = document.getElementById('frameSlider');
slider.max = 0;

function nowIdx() {
    return parseInt(slider.value, 10);
}

function updateImage() {
    if (!processedData) return;

    const idx = nowIdx();

    // --- 후보군 Select 박스 갱신 로직 (선택 안 함 추가) ---
    const candidates = processedData.getCandidatesAt(idx);
    const frameData = processedData.getBatList()[idx];
    const currentSelected = frameData ? frameData.selectedIdx : -1;

    candidateSelect.innerHTML = ''; // 초기화

    // 1. 항상 '선택 안 함' 옵션을 맨 위에 추가
    const noneOpt = document.createElement('option');
    noneOpt.value = "-1";
    noneOpt.text = "선택 안 함 (None)";
    if (currentSelected === -1) noneOpt.selected = true;
    candidateSelect.appendChild(noneOpt);

    // 2. 검출된 후보들이 있다면 리스트업
    if (candidates && candidates.length > 0) {
        candidates.forEach((cand, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.text = `후보 ${i + 1} (${(cand.confidence * 100).toFixed(0)}%)`;
            if (i === currentSelected) opt.selected = true;
            candidateSelect.appendChild(opt);
        });
    }
    // ------------------------------------------

    frameMaker.setConf(parseFloat(confInput.value));
    frameMaker.setTrail(parseInt(trailInput.value));
    frameMaker.drawImageAt(idx);
}

// --- 나머지 UI 및 데이터 설정 로직 ---

slider.addEventListener('input', updateImage);

function setData(data) {
    if (data == null) return;
    processedData = data;

    frameMaker.setData(data);
    const frameCount = processedData.getFrameCnt();
    const maxValue = frameCount > 0 ? frameCount - 1 : 0;

    slider.max = maxValue;
    trailInput.max = maxValue;
    updateImage();
}

const analysisSelect = document.getElementById('analysis');
const addVideoBoxBtn = document.getElementById('add-video-box-button');
const boxList = new BoxList(document.getElementById("boxes"));

function addToolDefault(src, frameMaker, func) {
    return new Promise((resolve) => {
        boxList.addBoxTemplate(src, () => { }, (box) => {
            box.className = 'container neumorphism';
            func(box);
            resolve();
        });
    });
}

addVideoBoxBtn.addEventListener('click', () => {
    addToolDefault("../template/video-with-save.html", null, (box) => {
        const newCanvas = box.querySelectorAll("canvas")[0];
        const saveBtn = box.querySelectorAll(".save")[0];

        const exporter = new SaveFrameMaker(frameMaker);
        saveBtn.addEventListener('click', () => {
            exporter.export();
        });

        frameMaker.setInstance(newCanvas);
    }).then(() => {
        let bottom = document.body.scrollHeight;
        window.scrollTo({ top: bottom, behavior: 'smooth' });
    });
});

// 초기 실행
addToolDefault("../template/video-with-save.html", null, (box) => {
    const newCanvas = box.querySelectorAll("canvas")[0];
    const saveBtn = box.querySelectorAll(".save")[0];

    const exporter = new SaveFrameMaker(frameMaker);
    saveBtn.addEventListener('click', () => {
        if (processedData == null) return;
        exporter.export(processedData);
    });

    frameMaker.setInstance(newCanvas);
});

export { setData };