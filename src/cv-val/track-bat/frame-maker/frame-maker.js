export class TrackFrameMaker {
    constructor() {
        this.conf = 0.5;
        this.trail = 15;
        this.instance = null; // targetCanvas
        this.trackData = null; // processedData
    }

    setInstance(instance) { this.instance = instance; }
    setData(trackData) { this.trackData = trackData; }
    setConf(conf) { this.conf = conf; }
    setTrail(trail) { this.trail = trail; }

    // --- 마스크 처리 유틸리티 함수들 ---

    isPointInPolygon(poly, x, y) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    fillQuadrilateral(pixelData, points, color, canvasW, canvasH) {
        let minX = Math.max(0, Math.floor(Math.min(...points.map(p => p.x))));
        let maxX = Math.min(canvasW - 1, Math.ceil(Math.max(...points.map(p => p.x))));
        let minY = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
        let maxY = Math.min(canvasH - 1, Math.ceil(Math.max(...points.map(p => p.y))));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.isPointInPolygon(points, x, y)) {
                    const idx = (y * canvasW + x) * 4;
                    pixelData[idx] = color[0];
                    pixelData[idx + 1] = color[1];
                    pixelData[idx + 2] = color[2];
                    pixelData[idx + 3] = color[3];
                }
            }
        }
    }

    applyMaskToBuffer(pixelData, maskMap, threshold, color, maskW, maskH) {
        if (!maskMap) return;
        for (let y = 0; y < maskH; y++) {
            const row = maskMap[y];
            for (let x = 0; x < maskW; x++) {
                if (row[x] >= threshold) {
                    const idx = (y * maskW + x) * 4;
                    pixelData[idx] = color[0];
                    pixelData[idx + 1] = color[1];
                    pixelData[idx + 2] = color[2];
                    pixelData[idx + 3] = color[3];
                }
            }
        }
    }

    getMaskMinMaxY(maskMap, threshold) {
        if (!maskMap || maskMap.length === 0) return null;
        const rows = maskMap.length;
        const cols = maskMap[0].length;
        let top = null, bottom = null;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (maskMap[y][x] >= threshold) { top = { x, y }; break; }
            }
            if (top) break;
        }
        for (let y = rows - 1; y >= 0; y--) {
            for (let x = 0; x < cols; x++) {
                if (maskMap[y][x] >= threshold) { bottom = { x, y }; break; }
            }
            if (bottom) break;
        }
        return (top && bottom) ? { top, bottom } : null;
    }
    masking(pixelData, prevMask, currMask, threshold, color, maskW, maskH) {
        this.applyMaskToBuffer(pixelData, prevMask, threshold, color, maskW, maskH);
        this.applyMaskToBuffer(pixelData, currMask, threshold, color, maskW, maskH);

        const ptsA = this.getMaskMinMaxY(prevMask, threshold);
        const ptsB = this.getMaskMinMaxY(currMask, threshold);

        if (ptsA && ptsB) {
            // 1. 네 개의 점을 하나의 배열로 모읍니다.
            const points = [ptsA.top, ptsA.bottom, ptsB.top, ptsB.bottom];

            // 2. 무게 중심(Centroid) 계산
            const center = {
                x: points.reduce((p, c) => p + c.x, 0) / 4,
                y: points.reduce((p, c) => p + c.y, 0) / 4
            };

            // 3. 무게 중심 기준 각도(Math.atan2)로 정렬하여 꼬임 방지
            const sortedPoints = points.sort((a, b) => {
                return Math.atan2(a.y - center.y, a.x - center.x) -
                    Math.atan2(b.y - center.y, b.x - center.x);
            });

            // 4. 정렬된 순서로 다각형 그리기
            this.fillQuadrilateral(pixelData, sortedPoints, color, maskW, maskH);
        }
    }
    drawImageAt(idx) {
        if (!this.trackData || !this.instance || idx < 0) return;

        const ctx = this.instance.getContext('2d');
        const image = this.trackData.getRawImgList(0)[idx];
        if (!image) return;

        // 1. 캔버스 크기 결정 및 초기화 (비율 2:1 가정 - clientWidth * 0.5)
        this.instance.width = this.instance.clientWidth;
        this.instance.height = this.instance.clientWidth * 0.5;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.instance.width, this.instance.height);

        // 2. 레터박스 계산
        const imageAspectRatio = image.width / image.height;
        const canvasAspectRatio = this.instance.width / this.instance.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imageAspectRatio > canvasAspectRatio) {
            drawWidth = this.instance.width;
            drawHeight = this.instance.width / imageAspectRatio;
            offsetX = 0;
            offsetY = (this.instance.height - drawHeight) / 2;
        } else {
            drawHeight = this.instance.height;
            drawWidth = this.instance.height * imageAspectRatio;
            offsetX = (this.instance.width - drawWidth) / 2;
            offsetY = 0;
        }

        // 3. 원본 이미지 그리기
        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

        // 4. 마스크 및 궤적 생성 (저해상도 버퍼)
        const batList = this.trackData.getBatList();
        const firstBat = batList.find(b => b && b.maskConfidenceMap);
        if (firstBat) {
            const maskW = firstBat.maskConfidenceMap[0].length;
            const maskH = firstBat.maskConfidenceMap.length;

            const maskImageData = new ImageData(maskW, maskH);
            const pixelBuffer = maskImageData.data;
            const startIdx = Math.max(1, idx - this.trail + 1);

            // 잔상 루프
            for (let i = startIdx; i <= idx; i++) {
                const prev = batList[i - 1];
                const curr = batList[i];
                if (prev?.maskConfidenceMap && curr?.maskConfidenceMap) {
                    this.masking(pixelBuffer, prev.maskConfidenceMap, curr.maskConfidenceMap,
                        this.conf, [0, 255, 0, 100], maskW, maskH);
                }
            }

            // 현재 프레임 강조
            const nowBat = batList[idx];
            if (nowBat?.maskConfidenceMap) {
                this.applyMaskToBuffer(pixelBuffer, nowBat.maskConfidenceMap, this.conf, [255, 128, 0, 180], maskW, maskH);
            }

            // 5. 마스크 오프스크린 -> 메인 캔버스 투영
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = maskW;
            tempCanvas.height = maskH;
            tempCanvas.getContext('2d').putImageData(maskImageData, 0, 0);

            // 중요: 이미지 영역(drawWidth, drawHeight)과 시작점(offsetX, offsetY)에 맞춰서 확대 출력
            ctx.drawImage(tempCanvas, offsetX, offsetY, drawWidth, drawHeight);
        }
    }
}