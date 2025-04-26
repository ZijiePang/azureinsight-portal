# app/services/cost_predictor.py

# this is AI generated, not connected to other part of the code

import tensorflow as tf
import numpy as np

# Simple cost prediction model (resource_type, is_active, region)
class CostPredictor:
    def __init__(self):
        self.model = self.build_model()
        self.resource_type_map = {
            "Virtual Machine": 0,
            "Storage Account": 1,
            "Azure SQL": 2,
            "App Service": 3,
            "CosmosDB": 4,
            "Azure Functions": 5
        }
        self.region_map = {
            "East US": 0,
            "West US": 1,
            "Europe North": 2,
            "Asia Southeast": 3,
            "": 4
        }
        self.load_weights()

    def build_model(self):
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(3,)),
            tf.keras.layers.Dense(16, activation='relu'),
            tf.keras.layers.Dense(1)  # Predict cost
        ])
        model.compile(optimizer='adam', loss='mse')
        return model

    def load_weights(self):
        # For now, random initialization (fake training)
        # In production, load pre-trained model weights
        pass

    def predict_cost(self, resource_type: str, is_active: bool, region: str) -> float:
        # Map categorical to numerical
        type_idx = self.resource_type_map.get(resource_type, 0)
        region_idx = self.region_map.get(region, 0)
        active_flag = 1 if is_active else 0
        
        input_vector = np.array([[type_idx, active_flag, region_idx]])
        cost = self.model.predict(input_vector, verbose=0)[0][0]
        
        # Post-process: ensure cost is positive and realistic
        cost = max(5, min(500, cost))
        return round(float(cost), 2)

# Create singleton
cost_predictor = CostPredictor()
