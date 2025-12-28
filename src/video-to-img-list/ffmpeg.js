const { createFFmpeg, fetchFile } = FFmpeg;

export class FFMPEGVideoConverter {

    constructor() {
        this.ffmpeg = createFFmpeg({
            mainName: 'main', // 싱글 스레드 버전의 엔트리포인트 이름
            corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
        });
        this.isLoaded = false;
    }

    async load() {

        if (this.isLoaded) return;

        await this.ffmpeg.load();
        this.isLoaded = true;
        console.log('FFmpeg 로드 완료.');

    }

    async getVideoMetadata(file) {

        if (!file) {
            throw new Error('비디오 파일이 없습니다.');
        }

        if (!this.isLoaded) {
            await this.load();
        }

        const inputFileName = file.name;
        let ffmpegLogs = '';

        this.ffmpeg.FS('writeFile', inputFileName, await fetchFile(file));

        this.ffmpeg.setLogger(({ type, message }) => {
            if (type === 'fferr') {
                ffmpegLogs += message + '\n';
            }
        });

        try {
            // 메타데이터를 분석하는 명령어 실행
            await this.ffmpeg.run(
                '-i', inputFileName
            );
        }
        catch (error) {

        } finally {
            this.ffmpeg.setLogger(() => { });
            this.ffmpeg.FS('unlink', inputFileName);
        }

        const match = ffmpegLogs.match(/(\d{2,5})x(\d{2,5}).+?(\d+(?:\.\d+)?)\s+fps/);

        if (match) {
            return {
                width: parseInt(match[1], 10),
                height: parseInt(match[2], 10),
                fps: parseFloat(match[3]),
            };

        }

        throw new Error('메타데이터를 파싱할 수 없습니다.');
    }

    async convert(file) {

        if (!file) {
            throw new Error('비디오 파일이 없습니다.');
        }

        if (!this.isLoaded) {
            await this.load();
        }

        const outputFileName = 'output_%d.png';
        const inputFileName = file.name;

        // 1. FFmpeg 가상 파일 시스템에 파일 쓰기
        this.ffmpeg.FS('writeFile', inputFileName,
            await fetchFile(file));

        try {
            // 2. FFmpeg 명령 실행
            await this.ffmpeg.run(
                '-i', inputFileName,
                outputFileName
            );

        } catch (error) {

        }

        // 3. 추출된 이미지 파일 목록 가져오기
        const fileNames = this.ffmpeg.FS('readdir', '/').filter((f) => f.startsWith('output_'));

        const imageList = [];

        for (const fileName of fileNames) {
            const data = this.ffmpeg.FS('readFile', fileName);
            const blob = new Blob([data.buffer],
                { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            const img = new Image();

            img.src = url;
            await new Promise(resolve => img.onload = resolve);
            imageList.push(img);
            
            URL.revokeObjectURL(url);
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // 4. 가상 파일 시스템 정리
        this.ffmpeg.FS('unlink', inputFileName);
        fileNames.forEach(f => this.ffmpeg.FS('unlink', f));

        return imageList;

    }

}