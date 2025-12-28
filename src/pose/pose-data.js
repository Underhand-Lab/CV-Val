class ProcessedData {
    constructor() {
        this.rawImgListList = [];
        this.landmarks3dList = [];
        this.landmarks2dListList = [];
        this.visibilityScoreListList = [];
    }

    initialize(videoMetaDataList) {

        this.videoMetaDataList = videoMetaDataList;
        
        this.rawImgListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.landmarks2dListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.visibilityScoreListList = Array.from({ length: videoMetaDataList.length }, () => []);

        // 프레임 수에 맞게 미리 배열 크기를 설정하거나, push()를 사용하여 동적으로 추가할 수 있습니다.
        // 여기서는 동적으로 추가하는 방식으로 구현합니다.
    }

    addDataAt(rawImgList, landmarks3d, landmarks2dList, visibilityScoreList) {
        for (let i = 0; i < rawImgList.length; i++) {
            this.rawImgListList[i].push(rawImgList[i]);
            this.landmarks2dListList[i].push(landmarks2dList[i]);
            this.visibilityScoreListList[i].push(visibilityScoreList[i]);
        }
        this.landmarks3dList.push(landmarks3d);
    }

    getVideoMetadata(idx) {
        return this.videoMetaDataList[idx];
    }

    getFrameCnt() {
        if (this.rawImgListList.length > 0) {
            return this.rawImgListList[0].length;
        }
        return 0;
    }

    getRawImgList(idx) {
        return this.rawImgListList[idx];
    }
    
    getLandmarks3d() {
        return this.landmarks3dList;
    }
    
    getLandmarks2dList(idx) {
        return this.landmarks2dListList[idx];
    }
    
    getVisibilityScoreList(idx) {
        return this.visibilityScoreListList[idx];
    }
}

export { ProcessedData };