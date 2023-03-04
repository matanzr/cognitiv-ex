const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');

var useFilters = true;
var applyEffects = true;
var handGesturePos = 0.5;
var performanceTimers = {smoothing: [], effects: [], drawing: [], updateEvery: 10};
performanceTimers.smoothingElement = document.getElementsByClassName('smoothing')[0];
performanceTimers.effectsElement = document.getElementsByClassName('effects')[0];
performanceTimers.drawingElement = document.getElementsByClassName('drawing')[0];

const HAND_LM_CNT = 21;
// intrest landmarks
const INDEX_FINGER_TIP = 8;
const THUMB_FINGER_TIP = 4;

const controls = window;
const fpsControl = new controls.FPS();
// UI Consts
const SLIDER_ON_STYLE = "rgba(0,150,200,0.5)";
const SLIDER_OFF_STYLE =  "rgba(0,50,100,0.5)";
const SLIDER_HEIGHT = 100;

const EURO_PARAMS = { freq: 30, mincutoff: 2, beta: 100, dcutoff: 1. };

function createHandPoints() {
    var points = []
    for (var i = 0; i < HAND_LM_CNT; i++) {
        points.push({ x: 0, y: 0, z: 0 });
    }
    return points;
}
const filteredLandmarks = { right: createHandPoints(), left: createHandPoints() };

function createHandFilters() {
    var filters = []
    for (var i = 0; i < HAND_LM_CNT; i++) {
        filters.push({
            x: new window.Filters.OneEuroFilter(EURO_PARAMS.freq, EURO_PARAMS.mincutoff, EURO_PARAMS.beta, EURO_PARAMS.dcutoff),
            y: new window.Filters.OneEuroFilter(EURO_PARAMS.freq, EURO_PARAMS.mincutoff, EURO_PARAMS.beta, EURO_PARAMS.dcutoff),
            z: new window.Filters.OneEuroFilter(EURO_PARAMS.freq, EURO_PARAMS.mincutoff, EURO_PARAMS.beta, EURO_PARAMS.dcutoff)
        })
    }
    return filters;
}
const euroFilters = { right: createHandFilters(), left: createHandFilters() };


function filterHandLandmarks(landmarks, filters, filteredLandmarks) {
    for (var i = 0; i < landmarks.length; i++) {
        filteredLandmarks[i].x = filters[i].x.filter(landmarks[i].x, new Date().getTime() * 0.001);
        filteredLandmarks[i].y = filters[i].y.filter(landmarks[i].y, new Date().getTime() * 0.001);
        filteredLandmarks[i].z = filters[i].z.filter(landmarks[i].z, new Date().getTime() * 0.001);
    }
}

function squareDist(p1, p2) {
    return ((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y) + (p1.z - p2.z) * (p1.z - p2.z))
}

function detectPinchGesture(landmarks) {
    var indexPos = landmarks[INDEX_FINGER_TIP];
    var thumbPos = landmarks[THUMB_FINGER_TIP];
    if (squareDist(indexPos, thumbPos) < 0.004) {            
        return indexPos;
    }

    return false;
}

function applyLumEffect(canvasCtx, w, h) {
    const frame = canvasCtx.getImageData(0, 0, w, h);
        const data = frame.data;

        for (let i = 0; i < data.length; i += 4) {
            const red = data[i + 0];
            const green = data[i + 1];
            const blue = data[i + 2];
            const lum = Math.max(red, green, blue);

            data[i + 0] = lum;
            data[i + 1] = lum;
            data[i + 2] = lum;
        }
        canvasCtx.putImageData(frame, 0, 0);
}

function drawUI(canvasCtx, canvasW, canvasH, isPinch) {
    canvasCtx.beginPath();
    canvasCtx.rect(0, canvasH / 2 - SLIDER_HEIGHT/2, canvasW, SLIDER_HEIGHT);
    if (isPinch) {
        canvasCtx.fillStyle = SLIDER_ON_STYLE
    } else {
        canvasCtx.fillStyle = SLIDER_OFF_STYLE
    }

    canvasCtx.fill();
}

// frame loop
function onResults(results) {
    var isPinch = false;

    fpsControl.tick();

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandedness) {
        var curHandGesturePos = handGesturePos;

        // Avoid issue with fast movements the system detects two hands in the same place 
        var isHandDrawn = { Left: false, Right: false }

        for (var i = 0; i < results.multiHandLandmarks.length; i++) {
            // Handle hand tracking
            const classification = results.multiHandedness[i];
            const isRightHand = classification.label === 'Right';
            if (isHandDrawn[classification.label]) {
                console.log("skipped drawing same hand twice");
                continue;
            }
            isHandDrawn[classification.label] = true;

            var landmarks = results.multiHandLandmarks[i];
            var curFilteredLandmarks = isRightHand ? filteredLandmarks.right : filteredLandmarks.left;
            var curFilters = isRightHand ? euroFilters.right : euroFilters.left;
            
            var smoothTimer = performance.now();
            if (useFilters) {
                filterHandLandmarks(landmarks, curFilters, curFilteredLandmarks);
            } else {
                curFilteredLandmarks = landmarks;
            }
            performanceTimers.smoothing.push(performance.now() - smoothTimer);                

            var drawingTimer = performance.now();
            drawLandmarks(canvasCtx, curFilteredLandmarks, { color: '#FF0000', lineWidth: 2 });
            performanceTimers.drawing.push(performance.now() - drawingTimer);                
                            
            isPinch = detectPinchGesture(curFilteredLandmarks);
            if (isPinch) {            
                curHandGesturePos = isPinch.x;
            }
        }
        handGesturePos = curHandGesturePos;
    }

    const canvasW = canvasElement.width;
    const canvasH = canvasElement.height;

    var effectsTimer = performance.now();
    if (applyEffects) {
        applyLumEffect(canvasCtx, canvasW * handGesturePos, canvasH);
    }
    performanceTimers.effects.push(performance.now() - effectsTimer);
    
    drawUI(canvasCtx, canvasW * handGesturePos, canvasH, isPinch);

    canvasCtx.restore();

    if (performanceTimers.effects.length >= performanceTimers.updateEvery) {
        updatePerformanceResults();
    }
}

function updatePerformanceResults() {        
    var avgAndReset = function(field) {
        var arr = performanceTimers[field];
        var avg = 0;
        arr.forEach(function(a) {avg += a});
        avg /= arr.length;
        performanceTimers[field] = [];
        avg = isNaN(avg) ? "?" : avg;
        return avg;
    }
    performanceTimers.smoothingElement.innerHTML = `Smoothing: ${avgAndReset("smoothing")}ms`
    performanceTimers.effectsElement.innerHTML = ` | Effects: ${avgAndReset("effects")}ms`
    performanceTimers.drawingElement.innerHTML = ` | Drawing: ${avgAndReset("drawing")}ms`
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});
hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720
});

function initialize() {
    
    new controls
        .ControlPanel(controlsElement, {
            useFilters: true,
            applyEffects: true,
            selfieMode: true,
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        }).add([
            new controls.StaticText({ title: 'MediaPipe Hands' }),
            new controls.Toggle({ title: 'Apply Smoothing', field: 'useFilters' }),
            new controls.Toggle({ title: 'Apply Effect', field: 'applyEffects' }),
            fpsControl,
            new controls.SourcePicker({
                onFrame:
                    async function (input, size) {
                        const aspect = size.height / size.width;
                        let width, height;
                        if (window.innerWidth > window.innerHeight) {
                            height = window.innerHeight;
                            width = height / aspect;
                        } else {
                            width = window.innerWidth;
                            height = width * aspect;
                        }
                        canvasElement.width = width;
                        canvasElement.height = height;
                        await hands.send({ image: input });
                    }
            })
        ]).on(x => {
            const options = x;
            useFilters = options.useFilters;
            applyEffects = options.applyEffects;
            videoElement.classList.toggle('selfie', options.selfieMode);
            hands.setOptions(options);
        })    
}
initialize();
