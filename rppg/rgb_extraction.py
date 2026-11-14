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
    print("Cannot open HONOR camera")
    exit()

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

# -----------------------------
# Main loop
# -----------------------------

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

    result = detector.detect_for_video(
        mp_image,
        timestamp_ms
    )

    if result.face_landmarks:

        landmarks = result.face_landmarks[0]

        h, w, _ = frame.shape

        # Forehead region center
        forehead_x = int(landmarks[10].x * w)
        forehead_y = int(landmarks[10].y * h)

        # Left cheek
        left_x = int(landmarks[50].x * w)
        left_y = int(landmarks[50].y * h)

        # Right cheek
        right_x = int(landmarks[280].x * w)
        right_y = int(landmarks[280].y * h)

        # Extract small skin patches
        regions = [
            frame[forehead_y-10:forehead_y+10,
                  forehead_x-10:forehead_x+10],

            frame[left_y-10:left_y+10,
                  left_x-10:left_x+10],

            frame[right_y-10:right_y+10,
                  right_x-10:right_x+10]
        ]

        valid_regions = [
            region for region in regions
            if region.size > 0
        ]

        if valid_regions:

            # Combine all skin regions
            skin = np.concatenate(
                [region.reshape(-1, 3)
                 for region in valid_regions],
                axis=0
            )

            # OpenCV frame is BGR
            b, g, r = np.mean(skin, axis=0)

            red_values.append(r)
            green_values.append(g)
            blue_values.append(b)

            times.append(time.time() - start_time)

            # Display RGB values
            cv2.putText(
                frame,
                f"R: {r:.1f} G: {g:.1f} B: {b:.1f}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

        # Display landmarks
        for landmark in landmarks:

            x = int(landmark.x * w)
            y = int(landmark.y * h)

            cv2.circle(
                frame,
                (x, y),
                1,
                (0, 255, 0),
                -1
            )

        # Display skin sampling regions
        for x, y in [
            (forehead_x, forehead_y),
            (left_x, left_y),
            (right_x, right_y)
        ]:

            cv2.rectangle(
                frame,
                (x-10, y-10),
                (x+10, y+10),
                (0, 0, 255),
                2
            )

    cv2.imshow("SpaceView rPPG - RGB Extraction", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

# -----------------------------
# Cleanup
# -----------------------------

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

    plt.show()