const yolo11x_weight = "/external/yolo11x_web_model/model.json";

async function createDetector() {
    return tf.loadGraphModel(yolo11x_weight);
}

export class YOLO11BallDetector {
    constructor() {
        this.canvas = document.createElement('canvas');
    }

    async initialize() {
        this.detector = await createDetector();
    }

    async process(image) {

        const inputTensor = await this.preProcess(image);

        // 모델이 요구하는 입력 크기로 이미지 크기 조정 및 정규화
        const resizedTensor = tf.image.resizeBilinear(inputTensor, [640, 640])
            .div(255.0)
            .expandDims(0); // 배치 차원 추가

        // Execute inference asynchronously
        const predictions = await this.detector.execute(resizedTensor);
        const detectedObjects = await this.postProcess(
            predictions, image.width, image.height);

        // 메모리 관리를 위해 텐서들을 해제
        inputTensor.dispose();
        resizedTensor.dispose();

        return detectedObjects;

    }

    async preProcess(image) {
        
        const ctx = this.canvas.getContext('2d');

        let size = image.width;

        if (image.height > size) {
            size = image.height;
        }

        this.canvas.width = size;
        this.canvas.height = size;
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(image, 0, 0, image.width, image.height);
        
        return tf.browser.fromPixels(this.canvas);
    }

    async postProcess(predictions, originalWidth, originalHeight) {

        const outputTensor = predictions;

        let originalSize = originalWidth;

        if (originalSize < originalHeight) {
            originalSize = originalHeight;
        }
        
        const scale = originalSize / 640;

        // 텐서의 형태가 [1, 84, 8400]이므로, [1, 8400, 84]로 전치합니다.
        const transposedTensor = tf.transpose(outputTensor, [0, 2, 1]);
        const detections = await transposedTensor.array();

        let bestBallInfo = null;
        let highestConf = -1;

        const classIdToFilter = 32; // 야구공 클래스 ID

        const [allDetections] = detections;

        for (const detection of allDetections) {
            const [x, y, width, height, ...classProbs] = detection;

            const maxProb = Math.max(...classProbs);
            const classId = classProbs.indexOf(maxProb);

            if (classId !== classIdToFilter) continue;
            if (maxProb < highestConf) continue;

            highestConf = maxProb;

            // YOLO 좌표는 중심점과 너비, 높이로 구성되어 있습니다.
            // 먼저 640x640 기준의 좌상단 좌표와 너비, 높이로 변환합니다.
            const x1 = x - width / 2;
            const y1 = y - height / 2;
            const x2 = x + width / 2;
            const y2 = y + height / 2;

            // 원본 이미지 크기에 맞는 최종 좌표를 계산합니다.
            const scaledX1 = x1 * scale;
            const scaledY1 = y1 * scale;
            const scaledX2 = x2 * scale;
            const scaledY2 = y2 * scale;

            // 최종적으로 바운딩 박스 정보는 [x, y, width, height] 형식으로 저장합니다.
            const scaledWidth = scaledX2 - scaledX1;
            const scaledHeight = scaledY2 - scaledY1;

            bestBallInfo = {
                bbox: [scaledX1, scaledY1, scaledWidth, scaledHeight],
                confidence: highestConf,
                classId: classId
            };

        }

        transposedTensor.dispose(); // 메모리 해제

        return bestBallInfo; // 가장 신뢰도 높은 객체 하나만 반환
    }
}