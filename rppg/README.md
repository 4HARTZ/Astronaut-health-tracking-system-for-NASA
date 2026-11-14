# HONOR Camera rPPG Prototype — Setup Guide (Ubuntu)

This guide helps teammates reproduce the **local camera → face landmarks → facial RGB extraction** prototype on Ubuntu.

> **Current prototype status:** Face detection and average RGB extraction work. This is not yet a validated heart-rate, SpO₂, or blood-pressure measurement system. RGB values are raw camera intensities and are not medical measurements.

## 1. What this prototype does

Pipeline:

1. A phone camera streams video to Ubuntu using `scrcpy`.
2. `v4l2loopback` exposes that stream as a virtual webcam (`/dev/video10`).
3. OpenCV reads the virtual webcam.
4. MediaPipe Face Landmarker detects facial landmarks.
5. The script samples small patches on the forehead and cheeks and calculates their average RGB values.
6. It displays the camera image, landmarks, sample regions, and live RGB values. When stopped, it plots RGB intensity against time.

## 2. Requirements

- Ubuntu Linux with a graphical desktop session.
- Android phone with a camera (the tested phone was HONOR X8b / Android 14).
- USB cable and USB debugging enabled/authorized.
- Python 3.14 (the tested environment used Python 3.14.4).
- `scrcpy`, `adb`, `v4l2loopback`, and `v4l-utils`.
- Camera permission granted on the phone if prompted.

The steps below are for Ubuntu. Other distributions may need different package commands.

## 3. Install system packages

```bash
sudo apt update
sudo apt install -y python3.14-venv python3-pip adb scrcpy v4l2loopback-dkms v4l-utils
```

If `scrcpy` or `v4l2loopback-dkms` is unavailable in your Ubuntu release, install a compatible package/version using your distribution's instructions.

## 4. Connect and authorize the phone

1. On Android, enable **Developer options → USB debugging**.
2. Connect the phone by USB.
3. Accept the **Allow USB debugging** prompt on the phone.
4. Verify from Ubuntu:

```bash
adb devices
```

The device should show `device`, not `unauthorized`.

If it says `unauthorized`, unlock the phone and accept the prompt. If no device appears, check the USB cable/connection and USB debugging.

## 5. Create the project and Python environment

```bash
mkdir -p ~/projects/astronaut-rppg
cd ~/projects/astronaut-rppg

python3.14 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install opencv-python mediapipe numpy matplotlib
```

> Activate the environment every time you open a new project terminal:
>
> ```bash
> cd ~/projects/astronaut-rppg
> source .venv/bin/activate
> ```

## 6. Download the MediaPipe model

The Tasks API needs a model file separately from the Python package.

```bash
cd ~/projects/astronaut-rppg

wget -O face_landmarker.task \
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

Confirm it exists:

```bash
ls -lh face_landmarker.task
```

It should be approximately 3.6 MB.

## 7. Create the virtual camera

Load `v4l2loopback` as `/dev/video10`:

```bash
sudo modprobe v4l2loopback video_nr=10 card_label="HONOR rPPG" exclusive_caps=1
```

Check:

```bash
ls -l /dev/video10
v4l2-ctl -d /dev/video10 --all | head -20
```

The device should be named `HONOR rPPG`. Depending on whether scrcpy is streaming, `exclusive_caps=1` can make the device appear as Video Output before a producer starts and Video Capture once the producer is active.

If `/dev/video10` already exists, `modprobe` may simply leave the existing device in place.

## 8. Start the phone camera stream (Terminal 1)

Keep this terminal open while using the Python script:

```bash
scrcpy --video-source=camera \
       --camera-id=1 \
       --camera-size=1280x720 \
       --camera-fps=30 \
       --v4l2-sink=/dev/video10 \
       --no-audio \
       --no-playback
```

- `--camera-id=1` selected the **front camera** on the tested HONOR phone. Camera IDs can differ on other phones.
- If scrcpy reports `CAMERA_IN_USE`, close the phone's Camera app and retry.
- If it reports an encoder/camera error, check the phone model, supported camera settings, and scrcpy version.
- Do not close this terminal during RGB extraction.

## 9. Create `rgb_extraction.py`

In the project directory:

```bash
nano rgb_extraction.py
```

Paste the following code:

```python
import cv2
import mediapipe as mp
import numpy as np
import time
import matplotlib.pyplot as plt

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# -----------------------------
# Face Landmarker
# -----------------------------
base_options = python.BaseOptions(
    model_asset_path="face_landmarker.task"
)

options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_faces=1
)

detector = vision.FaceLandmarker.create_from_options(options)

# -----------------------------
# Camera
# -----------------------------
cap = cv2.VideoCapture("/dev/video10", cv2.CAP_V4L2)

if not cap.isOpened():
    detector.close()
    raise RuntimeError(
        "Cannot open HONOR camera (/dev/video10). "
        "Check that scrcpy is streaming and no other Python process "
        "is using the virtual camera."
    )

print("Camera connected!")
print("Keep your face still and press Q when finished.")

# -----------------------------
# RGB data storage
# -----------------------------
times = []
red_values = []
green_values = []
blue_values = []

start_time = time.time()

try:
    while True:
        ret, frame = cap.read()

        if not ret:
            print("Camera frame unavailable")
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame
        )

        timestamp_ms = int((time.time() - start_time) * 1000)

        result = detector.detect_for_video(mp_image, timestamp_ms)

        if result.face_landmarks:
            landmarks = result.face_landmarks[0]
            h, w, _ = frame.shape

            # Approximate sampling centers (MediaPipe landmark indices)
            forehead_x = int(landmarks[10].x * w)
            forehead_y = int(landmarks[10].y * h)

            left_x = int(landmarks[50].x * w)
            left_y = int(landmarks[50].y * h)

            right_x = int(landmarks[280].x * w)
            right_y = int(landmarks[280].y * h)

            # 20 x 20 pixel patches around each center
            centers = [
                (forehead_x, forehead_y),
                (left_x, left_y),
                (right_x, right_y)
            ]

            regions = []
            for x, y in centers:
                x1, x2 = max(0, x - 10), min(w, x + 10)
                y1, y2 = max(0, y - 10), min(h, y + 10)

                region = frame[y1:y2, x1:x2]
                if region.size:
                    regions.append(region)

            if regions:
                skin_pixels = np.concatenate(
                    [region.reshape(-1, 3) for region in regions],
                    axis=0
                )

                # OpenCV stores pixels in BGR order
                b, g, r = np.mean(skin_pixels, axis=0)

                red_values.append(float(r))
                green_values.append(float(g))
                blue_values.append(float(b))
                times.append(time.time() - start_time)

                cv2.putText(
                    frame,
                    f"R: {r:.1f} G: {g:.1f} B: {b:.1f}",
                    (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2
                )

            # Draw all detected face landmarks
            for landmark in landmarks:
                x = int(landmark.x * w)
                y = int(landmark.y * h)
                cv2.circle(frame, (x, y), 1, (0, 255, 0), -1)

            # Draw the three sampling patches
            for x, y in centers:
                cv2.rectangle(
                    frame,
                    (x - 10, y - 10),
                    (x + 10, y + 10),
                    (0, 0, 255),
                    2
                )

        cv2.imshow("HONOR rPPG - RGB Extraction", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

finally:
    cap.release()
    cv2.destroyAllWindows()
    detector.close()

# -----------------------------
# Plot RGB signals
# -----------------------------
if times:
    plt.figure(figsize=(12, 5))
    plt.plot(times, red_values, label="Red")
    plt.plot(times, green_values, label="Green")
    plt.plot(times, blue_values, label="Blue")

    plt.xlabel("Time (seconds)")
    plt.ylabel("Average Pixel Intensity")
    plt.title("Facial RGB Signals")
    plt.legend()
    plt.grid()
    plt.tight_layout()
    plt.show()
else:
    print("No RGB samples collected.")
```

Save in nano: `Ctrl+O`, Enter, then `Ctrl+X`.

## 10. Run the prototype (Terminal 2)

Keep Terminal 1 running scrcpy. In a second terminal:

```bash
cd ~/projects/astronaut-rppg
source .venv/bin/activate
python rgb_extraction.py
```

Expected behavior:

- A window titled **HONOR rPPG - RGB Extraction** opens.
- Green dots show face landmarks.
- Red boxes show the three sampling regions.
- Live average R, G, and B values appear in the upper-left corner.

For a recording:

1. Sit comfortably, approximately 40–60 cm from the camera.
2. Keep your face relatively still.
3. Use steady, even lighting; avoid changing brightness during recording.
4. Record around 60 seconds for an initial experiment.
5. Press `Q` in the video window.
6. A Matplotlib RGB intensity plot should appear.

## 11. Troubleshooting

### `adb devices` shows `unauthorized`
Unlock the phone and accept the USB debugging authorization prompt.

### `Cannot open HONOR camera`
1. Confirm Terminal 1 is still running scrcpy and shows `v4l2 sink started to device: /dev/video10`.
2. Close the phone's Camera app if it is using the front camera.
3. Check the virtual device:

   ```bash
   ls -l /dev/video10
   v4l2-ctl -d /dev/video10 --all | head -20
   ```

4. Check processes using it:

   ```bash
   sudo fuser -v /dev/video10
   ```

5. Close any stale Python camera script before starting another. If necessary, stop the relevant script with `Ctrl+C` in its terminal. Avoid killing unrelated Python processes.
6. Ensure your user has video-device access. If permissions are denied, check:

   ```bash
   groups
   ```

   If `video` is absent, add the user to the group:

   ```bash
   sudo usermod -aG video "$USER"
   ```

   Log out and back in for the group change to take effect.

### `face_landmarker.task` not found
Run the download command in Section 6 from the project directory.

### `AttributeError: module 'mediapipe' has no attribute 'solutions'`
This guide uses the newer MediaPipe **Tasks API**, not the legacy `mp.solutions.face_mesh` API. Make sure you use the script in Section 9.

### Qt font or Wayland warnings
Messages such as `QFontDatabase: Cannot find font directory` or `Ignoring XDG_SESSION_TYPE=wayland` may be harmless if the camera window opens and works. Focus on actual camera/model errors.

## 12. Project structure

After setup, the directory should look like:

```text
astronaut-rppg/
├── .venv/
├── face_landmarker.task
└── rgb_extraction.py
```

Do **not** commit `.venv/` or the model file unless your team explicitly wants to distribute them. The model can be downloaded separately using Section 6.

## 13. What comes next

This is the **RGB extraction stage only**. Future work may include:

- Better skin-region selection and motion rejection.
- Signal detrending and band-pass filtering.
- POS or CHROM pulse extraction.
- Heart-rate estimation and signal-quality checks.
- Integration into the team's application.

Any heart-rate estimate from this prototype must be treated as experimental and not as a medical reading.
