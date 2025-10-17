from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

import numpy as np


@dataclass
class Detection:
    """Represents a high-level event detected for a specific person."""

    person_index: int
    label: str
    confidence: float
    description: str = ""


class ScenarioAnalyzer:
    """Base class for scene-specific logic built on top of the shared pipeline."""

    name: str = "base"

    def analyze(
        self,
        canonical_poses: Sequence[np.ndarray],
        raw_poses: Sequence[np.ndarray],
        poses_2d: Sequence[np.ndarray],
    ) -> List[Detection]:
        """Return scene-specific detections.

        Args:
            canonical_poses: Body keypoints (N x 19 x 3) in the canonical coordinate frame.
            raw_poses: Original pose tensors from the estimator for reference.
            poses_2d: 2D keypoints returned by the estimator.
        """

        raise NotImplementedError


def _safe_normalize(vector: np.ndarray) -> tuple[np.ndarray, float]:
    norm = np.linalg.norm(vector)
    if norm < 1e-6:
        return np.zeros_like(vector), 0.0
    return vector / norm, norm


def compute_body_basis(pose: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Compute body-centric axes from a canonical pose.

    Returns:
        (up, left_to_right, front) unit vectors. If computation fails, vectors of zeros are returned.
    """

    up, _ = _safe_normalize(pose[0] - (pose[6] + pose[12]) / 2)
    left_to_right, _ = _safe_normalize(pose[9] - pose[3])
    if np.linalg.norm(left_to_right) < 1e-6:
        # Fall back to shoulder-to-hip vector if shoulders overlap
        left_to_right, _ = _safe_normalize(pose[12] - pose[6])
    front = np.cross(up, left_to_right)
    front, _ = _safe_normalize(front)
    # Re-orthogonalise left_to_right in case of numerical drift
    left_to_right = np.cross(front, up)
    left_to_right, _ = _safe_normalize(left_to_right)
    return up, left_to_right, front


def joint_distance(p1: np.ndarray, p2: np.ndarray) -> float:
    return float(np.linalg.norm(p1 - p2))


def angle_between(v1: np.ndarray, v2: np.ndarray) -> float:
    """Return angle in degrees between two vectors."""

    x = np.array(v1)
    y = np.array(v2)
    denom = np.linalg.norm(x) * np.linalg.norm(y)
    if denom < 1e-6:
        return 0.0
    cos_theta = np.clip(np.dot(x, y) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_theta)))
