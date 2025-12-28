import { IVisualizer } from "./visualizer.interface.js"

const hideAfterIndexPlugin = {
    id: 'hideAfterIndex',
    beforeDatasetDraw(chart, args, options) {
        const { idx } = options;
        const datasetIndex = args.index;
        const dataArr = chart.data.datasets[datasetIndex].data;

        args.meta.data.forEach((point, i) => {
            const rawVal = dataArr[i]; // 원본 데이터에서 직접 읽기
            const isNull = rawVal === null || rawVal === undefined;
            if (i > idx || isNull) {
                point.skip = true;
            } else {
                point.skip = false;
            }
        });
    }
};

export class GraphVisualizer extends IVisualizer {

    constructor(canvas) {
        super();
        this.targetIdx = 0;
        this.canvas = canvas;
        Chart.defaults.font.family = 'KBO-Dia-Gothic_medium', 'Arial', 'sans-serif';
    }

    getDataSet() {

        if (this.data == null) return null;

        let len = 0;
        let ret = [];

        for (let key in this.data) {
            ret.push({
                "label": key,
                "data": this.data[key],
                "borderColor": getRandomColor(),
                "borderWidth": 4,
                "pointRadius": 0
            });
            if (len < this.data[key].length)
                len = this.data[key].length;
        }

        const labels = Array.from({ length: len },
            (_, index) => index);

        return [ret, labels];
    }

    setData(data) {

        this.data = data;

        if (this.chart != null) {
            let [dataset, labels] = this.getDataSet();

            this.chart.data["labels"] = labels;
            this.chart.data.datasets = dataset;
        }


    }

    setDefault() {
        const ctx = this.canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                "labels": ["0"],
                datasets: [{
                    "label": "처리전",
                    "data": [0]
                }]
            },
            options: {
                animation: false,
                plugins: {
                    hideAfterIndex: { idx: 0 }
                }
            },
            plugins: [hideAfterIndexPlugin]
        });
    }

    drawImageAt(idx) {

        if (this.data == null) return;

        if (this.chart == null) {
            let [dataset, labels] = this.getDataSet();

            const ctx = this.canvas.getContext('2d');
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    "labels": labels,
                    datasets: dataset
                },
                options: {
                    animation: false,
                    plugins: {
                        hideAfterIndex: { idx: idx }
                    }
                },
                plugins: [hideAfterIndexPlugin]
            });

        } else {
            this.chart.options.plugins.hideAfterIndex.idx = idx;
            this.chart.update();

        }
    }

}

function getRandomColor() {
    let red = Math.floor(Math.random() * 256);
    let green = Math.floor(Math.random() * 256);
    let blue = Math.floor(Math.random() * 256);
    return `rgb(${red}, ${green}, ${blue})`;
}