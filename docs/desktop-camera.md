# Desktop camera setup and validation

Orbit's Tauri app can launch a local Python process to track facial landmarks, extract facial RGB values, and produce experimental pulse and breathing-rate estimates. Pulse extraction uses a lightweight POS-style RGB projection inspired by the unsupervised methods in [rPPG-Toolbox](https://github.com/ubicomplab/rPPG-Toolbox). The breathing-rate estimate comes from slow green-channel changes and needs about 20 seconds of continuous face signal. Relative pulse amplitude is a color-signal proxy, not a calibrated perfusion index. An RGB oxygenation index uses the red/blue pulse-amplitude ratio, but has no device-specific calibration and is not an SpO2 percentage. None of these estimates have been validated for medical use. Browser mode offers a labelled synthetic demonstration and does not connect to a camera.

## Python environment

Use a Python version supported by NumPy, OpenCV, and MediaPipe on your OS (a Python 3.11 environment is an example starting point). Create it in the repository:

```bash
python3 -m venv .venv-rppg
.venv-rppg/bin/python -m pip install -r rppg/requirements.txt
```

Windows PowerShell equivalents:

```powershell
py -3 -m venv .venv-rppg
.\.venv-rppg\Scripts\python.exe -m pip install -r rppg/requirements.txt
```

Prepare dependencies before going offline. No model download occurs at runtime: `face_landmarker.task` is included in the repository and packaged resources. Requirements specify compatibility ranges, not a reproducible per-platform environment; record exact versions after hardware qualification.

## Interpreter selection

The launcher first uses `ORBIT_PYTHON`, if set, as a full executable path (not a shell command with arguments), then checks the previously saved camera interpreter. In development it next checks `.venv-rppg`; otherwise it uses `python3` on macOS/Linux or `py -3` on Windows. A packaged app requires an installed interpreter and libraries; these are not bundled.

For an explicit interpreter on macOS/Linux:

```bash
ORBIT_PYTHON="$PWD/.venv-rppg/bin/python" npm run tauri -- dev
```

For a packaged Mac app launched from a terminal, use the full executable path, adapting the app name/location:

```bash
ORBIT_PYTHON="/absolute/path/to/.venv-rppg/bin/python" "/Applications/Orbit - Crew Health.app/Contents/MacOS/orbit-crew-health"
```

An environment variable set in a terminal is not automatically inherited by an app opened from Finder. Orbit now remembers the absolute interpreter path in `camera-python.json` in its per-user application configuration directory after a successful camera startup. Launch the updated app once with the command above and connect the camera, then quit it. Subsequent Finder launches reuse that path. Python and the virtual environment must remain at that location. If moved or deleted, launch with a new `ORBIT_PYTHON` path and reconnect to update the setting. An explicit override also replaces an invalid saved configuration after a successful connection. No health records are stored in this configuration file.

The native launcher resolves the script and model from application resources in packaged builds. Development can fall back to the repository location without depending on the current directory. It launches arguments directly, without a shell.

## Camera and permission checks

1. Start the Tauri app and open Real-Time. The initial waveform is explicitly a demo.
2. Choose Connect rPPG Feed. Allow camera access if macOS asks. Check System Settings → Privacy & Security → Camera if permission was denied. During development the permission may apply to the terminal/Python process; verify the installed app separately.
3. Startup errors appear in the panel. Missing libraries, a missing model, or unavailable hardware must not produce synthetic camera data.
4. The local preview shows a face box and sparse landmark overlay. Pulse and RGB color ratios may appear after a few seconds; the breathing estimate needs about 20 seconds of face signal. Missing faces clear current estimates. The RGB oxygenation index is not SpO2, and relative pulse amplitude is not perfusion index.
5. Disconnect and reconnect. Navigate away and verify the camera stops; close the application and verify no camera process remains.
6. Test a denied permission, busy camera, missing Python, missing dependencies, and app launch from another directory. Run these checks with the actual packaged app on every target OS.

The macOS bundle declares a camera usage description and camera entitlement. Release signing/notarization, runtime provisioning, OS permission behavior, and physical camera operation still require validation on the target machine. Configure those before distribution.

## Explicit command-line demonstration

```bash
.venv-rppg/bin/python rppg/rppg_streamer.py --simulate
```

This generates synthetic values for development only; stop with Ctrl+C. The app does not request this mode and rejects synthetic samples as camera measurements. Missing NumPy produces a structured error even in demo mode. No camera output is automatically saved into health check-ins.

## Hardware-free checks

```bash
python3 tests/rppg_test.py
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

These check failure reporting, frontend events, and bundled-path resolution, not measurement accuracy. Camera video is processed locally by this script, without network upload.
