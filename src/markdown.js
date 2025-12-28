window.addEventListener('load', function () {
    // marked.js 라이브러리가 로드되었는지 확인
    if (typeof marked === 'undefined') {
        console.error("marked.js 라이브러리를 찾을 수 없습니다. <script> 태그를 추가했는지 확인해주세요.");
        return;
    }

    const containers = document.getElementsByClassName('markdown-container');

    // 모든 마크다운 컨테이너를 순회
    for (let i = 0; i < containers.length; i++) {
        const container = containers[i];
        const filePath = container.getAttribute('data-markdown-file');

        // 파일 경로가 지정된 경우에만 실행
        if (filePath) {
            fetch(filePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`파일을 불러오는 데 실패했습니다: ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(markdownText => {
                    // marked.js로 마크다운을 HTML로 변환
                    container.innerHTML = marked.parse(markdownText);
                })
                .catch(error => {
                    console.error(`마크다운 파일을 처리하는 중 오류가 발생했습니다: ${error}`);
                    container.innerHTML = `<p style="color:red;">가이드를 불러오지 못했습니다.</p>`;
                });
        }
    }
});