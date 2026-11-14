"""Hardware-free checks: python3 tests/rppg_test.py"""
import json
import contextlib
import importlib.util
import io
import types
from unittest.mock import patch
from pathlib import Path
import subprocess
import sys
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'rppg/rppg_streamer.py'

class CameraStartupTests(unittest.TestCase):
    def test_help_does_not_require_camera_dependencies(self):
        result = subprocess.run([sys.executable, '-I', '-S', str(SCRIPT), '--help'], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('--simulate', result.stdout)

    def test_missing_dependencies_fail_without_synthetic_telemetry(self):
        # -S disables installed site packages, providing a deterministic missing-NumPy case.
        result = subprocess.run([sys.executable, '-I', '-S', str(SCRIPT)], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 1, result.stderr)
        messages = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertTrue(any(m['type'] == 'error' for m in messages))
        self.assertFalse(any(m['type'] == 'telemetry' for m in messages))
        self.assertIn('NumPy', messages[-1]['message'])

    def test_unavailable_camera_fails_instead_of_simulating(self):
        spec = importlib.util.spec_from_file_location('orbit_streamer', SCRIPT)
        streamer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(streamer)
        class ClosedCamera:
            def isOpened(self): return False
            def release(self): pass
        class Detector:
            def close(self): pass
        vision = types.SimpleNamespace(
            FaceLandmarkerOptions=lambda **kwargs: None,
            RunningMode=types.SimpleNamespace(VIDEO=1),
            FaceLandmarker=types.SimpleNamespace(create_from_options=lambda _: Detector()),
        )
        python = types.ModuleType('mediapipe.tasks.python')
        python.vision = vision
        python.BaseOptions = lambda **kwargs: None
        tasks = types.ModuleType('mediapipe.tasks')
        tasks.python = python
        modules = {
            'numpy': types.ModuleType('numpy'),
            'cv2': types.SimpleNamespace(VideoCapture=lambda _: ClosedCamera()),
            'mediapipe': types.ModuleType('mediapipe'),
            'mediapipe.tasks': tasks,
            'mediapipe.tasks.python': python,
        }
        output = io.StringIO()
        with patch.dict(sys.modules, modules), patch.object(sys, 'argv', [str(SCRIPT)]), contextlib.redirect_stdout(output):
            result = streamer.main()
        self.assertEqual(result, 1)
        messages = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertTrue(any(m['type'] == 'error' for m in messages))
        self.assertFalse(any(m['type'] == 'telemetry' for m in messages))

if __name__ == '__main__':
    unittest.main()
