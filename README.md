# Functional hand-gesture based UX

This is a simple Hand Geture demo that slides an effect over the view, controlled by hand gesture and position. 
Use Pinch gesture to control the effect view. 

Working demo is availabe here: https://matanzr.github.io/cognitiv-ex/

![Mar-04-2023 13-28-25](https://user-images.githubusercontent.com/3348951/222897360-6547e27c-2cf4-48b7-8f19-4d8bd1fce92a.gif)

## Options
From the side panel you can:
* **Toggle smoothing** Hands are filtered with [1 Euro Filter](https://gery.casiez.net/1euro/) on each hand landmark to reduce jitter. Euro filter (when set up correctly) is great at smoothing noisy result while using a threshold on speed to reduce latency on fast movments. 
* **Apply effect** the grayscale effect could be optimized can be removed for slower devices
* FPS meter
* Select input camera 

See performance footer the bottom for individual performance breakdown. Showing average runtime of each component (when active) every 10 frames. 

## Further Improvments
Current implementation is very basic and could be improved.
### Smoothing
- Need to reset filter when hand is detected
- Filters out "double" hand detection that sometimes arise from hand detector. Better to choose the hand with higher confidence
- Stabilize hand position while gesture is on. Can use a more stable point of the hand instead of using just the index for example 
- Find a better visualization for the smoothing effect. Changes are very subtle so visualization is not trivial

### Hand Gesture
- Improve gesture stability by using hysteresis for example. 
- Try relaive hand movment. Using 1:1 position is not very confortable. 
- Find a solution for multiple sliders. Right now there's no check since there's only one option.

### Effect
- Current implemetation is naive and not very efficient. It's slowing down the experience
- Can optimize by pausing the effect while pinch is on for smoother experience
- Implement using shader/gpu or with ArrayBuffer for better array performance than js loop 

## Summary
Hand tracking can be useful for many virtual content interaction. It's natural way we interact with many of our day to day interfaces and can feel very natural, but has many downsides as well: 
- Hands have to be in camera view for interacting
- A lot of time not holding the hands in a natural position that can cause fatigue 
- Dependent on camera visibility, for exampe can't detect gestures if some fingers are occluded behind objects
- Intent can be vauge when targeting small objects or cluttered environment. 
- Missing tactile feedback
