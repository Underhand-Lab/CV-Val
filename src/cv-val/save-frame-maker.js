export class SaveFrameMaker {
    constructor(frameMaker) {
        this.frameMaker = frameMaker;
    }

    /**
     * @param {TrackBatData} trackData
     */
    async export(trackData) {
        const frameCount = trackData.getFrameCnt();
        if (frameCount === 0) return;

        const metadata = trackData.getVideoMetadata(0);
        const fps = metadata.fps || 24;
        
        // 중요: 한 프레임이 비디오 상에서 차지해야 할 시간 계산
        const frameDuration = 1000 / fps; 

        const canvas = this.frameMaker.renderer.canvas;
        
        // captureStream에 FPS를 전달하여 스트림 생성
        const stream = canvas.captureStream(fps);
        
        // 사용자님이 지정하신 mp4 포맷 유지
        const mimeType = 'video/mp4';
        
        const recordedChunks = [];
        const recorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 10000000 // 10Mbps (고화질)
        });

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };

        return new Promise(async (resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: mimeType });
                // mp4 확장자로 다운로드
                this._download(blob, `bat_tracking_${Date.now()}.mp4`);
                resolve();
            };

            recorder.start();

            for (let i = 0; i < frameCount; i++) {
                // 1. 해당 인덱스의 프레임 렌더링
                this.frameMaker.drawImageAt(i);

                // 2. 렌더링 업데이트 동기화
                await new Promise(r => requestAnimationFrame(r));

                // 3. 핵심: MediaRecorder가 현재 캔버스를 1프레임 분량만큼 기록할 시간을 줌
                // 이 대기 시간이 없으면 루프가 너무 빨리 돌아 영상이 짧아집니다.
                await new Promise(r => setTimeout(r, frameDuration));
            }

            // 마지막 프레임이 기록될 수 있도록 여유를 준 뒤 종료
            setTimeout(() => {
                recorder.stop();
            }, 500); // 0.5초 정도 충분히 마무리를 기다림
        });
    }

    _download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}