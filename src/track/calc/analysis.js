
import * as Calc from "./velocity.js"

class BallAnalysisTool {
    calc(data) {

        let tableData = {
            "속도(km/h)": [ null ],
            "각도(도)": [ null ],
            "confidence": [ null ]
        }

        for (let i = 1; i < data["rawImage"].length; i++) {
            tableData["속도(km/h)"].push(Calc.calcVelocity(
                data["ballData"][i - 1],
                data["ballData"][i],
                data["metaData"]["fps"]));

            tableData["각도(도)"].push(Calc.calcAngle(
                data["ballData"][i - 1],
                data["ballData"][i]));
            
            const conf1 = data["ballData"][i - 1]["confidence"];
            const conf2 = data["ballData"][i]["confidence"];

            tableData["confidence"].push(conf1 > conf2 ? conf2 : conf1);
        }
        
        return tableData

    }
}

export { BallAnalysisTool }