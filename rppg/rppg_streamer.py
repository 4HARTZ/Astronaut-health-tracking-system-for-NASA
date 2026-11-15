#!/usr/bin/env python3
"""
NASA ORBIT - Real-time Contactless Photoplethysmography (rPPG) Bridge
Extracts facial capillary RGB pulsations using MediaPipe Face Landmarker
and streams real-time biometric telemetry via stdout JSON lines.
"""

import sys
import os
import tempfile

os.environ["MPLCONFIGDIR"] = tempfile.gettempdir()

import time
import json
import argparse
import base64

# Set stdout to unbuffered utf-8
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

def emit(data):
    """Emit structured JSON telemetry to stdout for Tauri IPC"""
    print(json.dumps(data), flush=True)

def emit_face_preview(cv2, frame, landmarks=None):
    """Send a compact, locally processed preview with visible landmark tracking."""
    height, width = frame.shape[:2]
    preview = frame.copy()
    if landmarks:
        points = [(int(point.x * width), int(point.y * height)) for point in landmarks]
        xs, ys = zip(*points)
        x0, x1 = max(0, min(xs)), min(width - 1, max(xs))
        y0, y1 = max(0, min(ys)), min(height - 1, max(ys))
        cv2.rectangle(preview, (x0, y0), (x1, y1), (80, 255, 190), 2)
        # Sparse neon landmark points make tracking visible without obscuring the face.
        for x, y in points[::8]:
            cv2.circle(preview, (x, y), 2, (255, 220, 70), -1, cv2.LINE_AA)
        for index in (10, 50, 280):
            x, y = points[index]
            cv2.rectangle(preview, (x - 14, y - 14), (x + 14, y + 14), (255, 170, 40), 1)
        label = "FACE TRACKING  ·  478 LANDMARKS"
        color = (80, 255, 190)
    else:
        label = "SEARCHING FOR FACE"
        color = (255, 190, 70)
    cv2.rectangle(preview, (0, 0), (width, 30), (18, 24, 34), -1)
    cv2.putText(preview, label, (10, 21), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1, cv2.LINE_AA)
    preview_width = min(480, width)
    preview_height = max(1, int(height * preview_width / width))
    preview = cv2.resize(preview, (preview_width, preview_height), interpolation=cv2.INTER_AREA)
    ok, encoded = cv2.imencode(".jpg", preview, [cv2.IMWRITE_JPEG_QUALITY, 68])
    if ok:
        emit({"type": "preview", "jpeg": base64.b64encode(encoded).decode("ascii"), "faceDetected": landmarks is not None})

def main():
    parser = argparse.ArgumentParser(description="NASA ORBIT rPPG Streamer")
    parser.add_argument("--camera", type=str, default="0", help="Camera index or path (e.g. 0, 1, or /dev/video10)")
    parser.add_argument("--simulate", action="store_true", help="Force synthetic physiological simulation mode")
    parser.add_argument("--model", type=str, default="face_landmarker.task", help="Path to face_landmarker.task model")
    args = parser.parse_args()

    emit({
        "type": "status",
        "state": "initializing",
        "camera": args.camera,
        "message": "Initializing rPPG optical telemetry engine..."
    })

    try:
        import numpy as np
    except ImportError as e:
        emit({"type": "error", "state": "error", "message": f"Missing NumPy: {e}. Install rppg/requirements.txt in the selected Python environment."})
        return 1

    # Camera errors never silently select synthetic data.
    try:
        if args.simulate:
            raise RuntimeError("Explicit demonstration mode")
        import cv2
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        has_cv = True
    except Exception as e:
        if not args.simulate:
            emit({"type": "error", "state": "error", "message": f"Camera libraries unavailable: {e}. Install rppg/requirements.txt in the selected Python environment."})
            return 1
        has_cv = False

    # Check for model file
    model_path = args.model
    if not os.path.exists(model_path):
        # Look in script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        alt_path = os.path.join(script_dir, "face_landmarker.task")
        if os.path.exists(alt_path):
            model_path = alt_path

    cap = None
    detector = None

    if not args.simulate and not os.path.isfile(model_path):
        emit({"type": "error", "state": "error", "message": f"Face model file is missing: {model_path}. Reinstall the updated Orbit app."})
        return 1

    if has_cv and not args.simulate:
        try:
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.VIDEO,
                num_faces=1
            )
            detector = vision.FaceLandmarker.create_from_options(options)
        except Exception as e:
            emit({"type": "error", "state": "error", "message": f"Face model initialization failed: {e}. Camera was not opened."})
            return 1

        cam_id = int(args.camera) if args.camera.isdigit() else args.camera
        try:
            cap = cv2.VideoCapture(cam_id)
            if not cap.isOpened():
                cap.release()
                detector.close()
                emit({"type": "error", "state": "error", "message": f"Could not open camera {cam_id}. Enable camera access for Orbit (or its Python process) in System Settings > Privacy & Security > Camera, close other camera apps, then quit and reopen Orbit. No measurements were generated."})
                return 1
        except Exception as e:
            if cap is not None:
                cap.release()
            detector.close()
            emit({"type": "error", "state": "error", "message": f"Could not initialize camera {cam_id}: {e}. Check camera access in macOS settings."})
            return 1

    emit({
        "type": "status", "state": "active", "simulated": args.simulate,
        "source": "Simulation" if args.simulate else "Experimental camera",
        "message": "DEMO: synthetic values, not measurements." if args.simulate else "Camera opened. Pulse estimates are experimental and unvalidated."
    })

    # Signal processing buffers
    buffer_len = 120  # ~4 seconds of 30 fps
    green_buffer = []
    rgb_buffer = []
    respiration_buffer = []
    time_buffer = []
    start_time = time.time()
    last_emit = 0
    frame_count = 0
    fps_timer = time.time()
    current_fps = 30.0
    last_preview = 0.0

    target_bpm = 71.0 if args.simulate else None

    try:
        while True:
            now = time.time()
            elapsed = now - start_time
            frame_count += 1

            if frame_count % 30 == 0:
                current_fps = round(30.0 / max(0.001, (now - fps_timer)), 1)
                fps_timer = now

            if cap is not None and cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    emit({"type": "error", "state": "error", "message": "Camera stopped delivering frames. No new measurement is available."})
                    return 1

                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                timestamp_ms = int(elapsed * 1000)

                result = detector.detect_for_video(mp_image, timestamp_ms)

                if now - last_preview >= 0.25:
                    last_preview = now
                    face = result.face_landmarks[0] if result.face_landmarks else None
                    emit_face_preview(cv2, frame, face)

                if result.face_landmarks:
                    landmarks = result.face_landmarks[0]
                    h, w, _ = frame.shape

                    forehead_x = int(landmarks[10].x * w)
                    forehead_y = int(landmarks[10].y * h)
                    left_x = int(landmarks[50].x * w)
                    left_y = int(landmarks[50].y * h)
                    right_x = int(landmarks[280].x * w)
                    right_y = int(landmarks[280].y * h)

                    regions = [
                        frame[max(0, forehead_y-12):min(h, forehead_y+12), max(0, forehead_x-12):min(w, forehead_x+12)],
                        frame[max(0, left_y-12):min(h, left_y+12), max(0, left_x-12):min(w, left_x+12)],
                        frame[max(0, right_y-12):min(h, right_y+12), max(0, right_x-12):min(w, right_x+12)],
                    ]

                    valid_patches = [r for r in regions if r.size > 0]
                    if valid_patches:
                        skin = np.concatenate([r.reshape(-1, 3) for r in valid_patches], axis=0)
                        b, g, r = np.mean(skin, axis=0)

                        green_buffer.append(float(g))
                        rgb_buffer.append((float(r), float(g), float(b)))
                        respiration_buffer.append(float(g))
                        if len(respiration_buffer) > 900:
                            respiration_buffer.pop(0)
                        time_buffer.append(elapsed)
                        if len(green_buffer) > buffer_len:
                            green_buffer.pop(0)
                            rgb_buffer.pop(0)
                            time_buffer.pop(0)

                        # POS-style chrominance projection (inspired by rPPG-Toolbox).
                        # It combines normalized RGB channels to reduce shared lighting changes.
                        pulse_signal = None
                        dominant_freq = None
                        rgb_oxygenation_index = None
                        if len(green_buffer) >= 60:
                            rgb = np.asarray(rgb_buffer, dtype=float)
                            normalized = rgb / np.maximum(np.mean(rgb, axis=0), 1.0)
                            x = normalized[:, 1] - normalized[:, 2]
                            y = normalized[:, 1] + normalized[:, 2] - 2.0 * normalized[:, 0]
                            alpha = np.std(x) / max(float(np.std(y)), 1e-8)
                            pulse_signal = x + alpha * y
                            pulse_signal -= np.mean(pulse_signal)
                            pulse_signal *= np.hanning(len(pulse_signal))
                            fft_vals = np.abs(np.fft.rfft(pulse_signal))
                            freqs = np.fft.rfftfreq(len(pulse_signal), d=1.0/max(15.0, current_fps))
                            # Mask to physiological heart rate range (45 - 180 bpm => 0.75 - 3.0 Hz)
                            mask = (freqs >= 0.75) & (freqs <= 3.0)
                            if np.any(mask):
                                peak_idx = np.argmax(fft_vals[mask])
                                dominant_freq = freqs[mask][peak_idx]
                                target_bpm = round(dominant_freq * 60.0, 1)

                                # RGB ratio-of-ratios feature. This is a color index only:
                                # it is not calibrated and must never be presented as SpO2.
                                ac_dc = []
                                for channel in (0, 2):  # red and blue
                                    dc = float(np.mean(rgb[:, channel]))
                                    channel_signal = rgb[:, channel] - dc
                                    channel_signal *= np.hanning(len(channel_signal))
                                    channel_spectrum = np.abs(np.fft.rfft(channel_signal))
                                    channel_freqs = np.fft.rfftfreq(len(channel_signal), d=1.0/max(15.0, current_fps))
                                    bin_index = int(np.argmin(np.abs(channel_freqs - dominant_freq)))
                                    ac_dc.append(float(channel_spectrum[bin_index]) / max(dc, 1.0))
                                if ac_dc[1] > 1e-8:
                                    rgb_oxygenation_index = round(ac_dc[0] / ac_dc[1], 3)

                        # Exploratory respiratory estimate from slow green-channel variation.
                        # A 20-second window gives a little better resolution than the HR window.
                        respiration_rate = None
                        if len(respiration_buffer) >= 600:
                            slow = np.asarray(respiration_buffer[-600:], dtype=float)
                            slow -= np.mean(slow)
                            slow *= np.hanning(len(slow))
                            slow_fft = np.abs(np.fft.rfft(slow))
                            slow_freqs = np.fft.rfftfreq(len(slow), d=1.0/max(15.0, current_fps))
                            breath_mask = (slow_freqs >= 0.1) & (slow_freqs <= 0.5)
                            if np.any(breath_mask):
                                breath_hz = slow_freqs[breath_mask][np.argmax(slow_fft[breath_mask])]
                                respiration_rate = round(float(breath_hz * 60.0), 1)

                        relative_pulse_amplitude = None
                        if pulse_signal is not None:
                            relative_pulse_amplitude = round(float(np.std(pulse_signal) / max(float(np.mean(rgb[:, 1])), 1.0) * 100.0), 3)

                        # Emit telemetry at ~20 Hz
                        if now - last_emit >= 0.05:
                            last_emit = now
                            emit({
                                "type": "telemetry",
                                "timestamp": round(elapsed, 3),
                                "faceDetected": True,
                                "simulated": False,
                                "confidence": None,
                                "fps": current_fps,
                                "r": round(float(r), 1),
                                "g": round(float(g), 1),
                                "b": round(float(b), 1),
                                "estimatedBpm": target_bpm,
                                "respirationRate": respiration_rate,
                                "faceSignalSeconds": round(len(respiration_buffer) / max(15.0, current_fps), 1),
                                "relativePulseAmplitude": relative_pulse_amplitude,
                                "rgbOxygenationIndex": rgb_oxygenation_index,
                                "snr": None,
                                "pulseValue": round(float(g - np.mean(green_buffer)), 2) if len(green_buffer) > 10 else 0.0,
                            })
                else:
                    green_buffer.clear()
                    time_buffer.clear()
                    rgb_buffer.clear()
                    respiration_buffer.clear()
                    target_bpm = None
                    if now - last_emit >= 0.2:
                        last_emit = now
                        emit({
                            "type": "telemetry",
                            "timestamp": round(elapsed, 3),
                            "faceDetected": False,
                            "confidence": 0.0,
                            "fps": current_fps,
                            "message": "Searching for astronaut face...",
                        })

                time.sleep(0.01)

            else:
                # High-fidelity physiological pulse synthesis
                time.sleep(0.033)  # ~30 fps
                # Cardiac pulse simulation (P-Q-R-S-T envelope)
                pulse_phase = (elapsed * (target_bpm / 60.0) * 2 * np.pi) % (2 * np.pi)
                # Primary systolic wave + dicrotic notch
                pulse = np.sin(pulse_phase) + 0.35 * np.sin(2 * pulse_phase + 0.5) + (np.random.rand() - 0.5) * 0.05
                # Subtle respiratory sinus arrhythmia (RSA)
                rsa = 2.5 * np.sin(elapsed * 0.25 * 2 * np.pi)
                current_bpm = round(target_bpm + rsa, 1)

                r_val = 142.0 + pulse * 1.5
                g_val = 118.0 + pulse * 3.8  # Hemoglobin absorption peaks in green
                b_val = 104.0 + pulse * 1.1

                if now - last_emit >= 0.05:
                    last_emit = now
                    emit({
                        "type": "telemetry",
                        "timestamp": round(elapsed, 3),
                        "faceDetected": True,
                        "simulated": True,
                        "confidence": None,
                        "fps": 30.0,
                        "r": round(float(r_val), 1),
                        "g": round(float(g_val), 1),
                        "b": round(float(b_val), 1),
                        "estimatedBpm": current_bpm,
                        "snr": None,
                        "pulseValue": round(float(pulse * 10.0), 2),
                    })

    except KeyboardInterrupt:
        pass
    finally:
        if cap is not None:
            cap.release()
        if detector is not None:
            detector.close()
        emit({"type": "status", "state": "stopped", "message": "rPPG optical stream terminated."})

if __name__ == "__main__":
    sys.exit(main() or 0)
