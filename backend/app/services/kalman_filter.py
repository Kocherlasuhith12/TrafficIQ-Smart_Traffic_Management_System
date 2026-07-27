import numpy as np
from typing import Tuple

class KalmanFilter2D:
    def __init__(self, init_x: float, init_y: float, dt: float = 1.0):
        # Time step
        self.dt = dt
        
        # State vector: [x, y, vx, vy]^T
        self.x = np.array([[init_x], [init_y], [0.0], [0.0]], dtype=np.float32)
        
        # State transition matrix F
        self.F = np.array([
            [1.0, 0.0, dt,  0.0],
            [0.0, 1.0, 0.0, dt ],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0]
        ], dtype=np.float32)
        
        # Measurement matrix H (we measure position x and y directly)
        self.H = np.array([
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0]
        ], dtype=np.float32)
        
        # Estimate covariance matrix P
        self.P = np.eye(4, dtype=np.float32) * 10.0
        
        # Process noise covariance matrix Q
        q_var = 0.1
        self.Q = np.array([
            [(dt**4)/4, 0.0,       (dt**3)/2, 0.0      ],
            [0.0,       (dt**4)/4, 0.0,       (dt**3)/2],
            [(dt**3)/2, 0.0,       dt**2,     0.0      ],
            [0.0,       (dt**3)/2, 0.0,       dt**2    ]
        ], dtype=np.float32) * q_var
        
        # Measurement noise covariance matrix R
        r_var = 1.0
        self.R = np.eye(2, dtype=np.float32) * r_var
        
        # Identity matrix
        self.I = np.eye(4, dtype=np.float32)

    def predict(self) -> Tuple[float, float]:
        """Predict the next state of the vehicle."""
        self.x = np.dot(self.F, self.x)
        self.P = np.dot(np.dot(self.F, self.P), self.F.T) + self.Q
        return float(self.x[0, 0]), float(self.x[1, 0])

    def update(self, meas_x: float, meas_y: float) -> Tuple[float, float, float, float]:
        """Update the estimate with a new position measurement."""
        z = np.array([[meas_x], [meas_y]], dtype=np.float32)
        
        # Innovation (measurement residual)
        y = z - np.dot(self.H, self.x)
        
        # Innovation covariance
        S = np.dot(np.dot(self.H, self.P), self.H.T) + self.R
        
        # Kalman Gain
        K = np.dot(np.dot(self.P, self.H.T), np.linalg.inv(S))
        
        # Update state and covariance
        self.x = self.x + np.dot(K, y)
        self.P = np.dot(self.I - np.dot(K, self.H), self.P)
        
        # Return smoothed position (x, y) and velocity (vx, vy)
        return (
            float(self.x[0, 0]),
            float(self.x[1, 0]),
            float(self.x[2, 0]),
            float(self.x[3, 0])
        )
