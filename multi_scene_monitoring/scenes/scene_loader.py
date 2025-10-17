from __future__ import annotations

import importlib
from typing import List

from .base import Detection, ScenarioAnalyzer


_SCENE_REGISTRY = {
    "basketball": "scenes.basketball.analyzer",
    "classroom": "scenes.classroom.analyzer",
}


def load_analyzer(scene_name: str | None) -> ScenarioAnalyzer | None:
    if not scene_name:
        return None
    scene_name = scene_name.strip().lower()
    module_path = _SCENE_REGISTRY.get(scene_name)
    if not module_path:
        print(f"[SceneLoader] Unknown scene '{scene_name}', available: {list(_SCENE_REGISTRY.keys())}")
        return None
    try:
        module = importlib.import_module(module_path)
    except ImportError as exc:
        print(f"[SceneLoader] Failed to import analyzer '{scene_name}': {exc}")
        return None
    if not hasattr(module, "create_analyzer"):
        print(f"[SceneLoader] Module '{module_path}' does not expose create_analyzer()")
        return None
    analyzer = module.create_analyzer()
    if not isinstance(analyzer, ScenarioAnalyzer):
        print(f"[SceneLoader] Analyzer for '{scene_name}' is not an instance of ScenarioAnalyzer")
        return None
    return analyzer


def summarize_detections(detections: List[Detection], max_items: int = 5) -> List[str]:
    lines: List[str] = []
    for detection in detections[:max_items]:
        prefix = f"[#{detection.person_index}] {detection.label}" if detection.label else f"[#{detection.person_index}]"
        confidence = f"{detection.confidence:.2f}" if detection.confidence >= 0 else "--"
        if detection.description:
            lines.append(f"{prefix} ({confidence}) {detection.description}")
        else:
            lines.append(f"{prefix} ({confidence})")
    return lines
