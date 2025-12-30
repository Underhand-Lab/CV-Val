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
        if (!file) throw new Error('비디오 파일이 없습니다.');
        if (!this.isLoaded) await this.load();

        const outputFileName = 'output_%d.png';
        const inputFileName = file.name;

        this.ffmpeg.FS('writeFile', inputFileName, await fetchFile(file));
        try {
            await this.ffmpeg.run('-i', inputFileName, outputFileName);
        } catch (error) {
            // status가 0이면 정상 종료이므로 에러 로그를 찍지 않고 넘어감
            if (error.status !== 0) {
                console.error("FFmpeg 실제 에러 발생:", error);
                throw error;
            }
        }

        const fileNames = this.ffmpeg.FS('readdir', '/')
            .filter((f) => f.startsWith('output_'))
            .sort((a, b) => { // 파일명 정렬 (output_1, output_2...)
                const numA = parseInt(a.match(/\d+/)[0]);
                const numB = parseInt(b.match(/\d+/)[0]);
                return numA - numB;
            });

        const bitmapList = [];
        for (const fileName of fileNames) {
            const data = this.ffmpeg.FS('readFile', fileName);
            const blob = new Blob([data.buffer], { type: 'image/png' });

            // Canvas를 생성하지 않고 ImageBitmap을 바로 생성 (메인 스레드 부하 최소화)
            const bitmap = await createImageBitmap(blob);
            bitmapList.push(bitmap);
        }


        // 정리
        this.ffmpeg.FS('unlink', inputFileName);
        fileNames.forEach(f => this.ffmpeg.FS('unlink', f));

        return bitmapList; // ImageBitmap 배열 반환

    }

}