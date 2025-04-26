# app/services/detect_anomalies.py

# this is AI generated, not connected to other part of the code

import tensorflow as tf
import numpy as np

async def detect_anomalies(self, start_date: datetime, end_date: datetime):
    """Detect cost anomalies using TensorFlow Autoencoder"""
    result = await self.get_cost_data(start_date, end_date)
    costs = result["costs"]
    
    daily_costs = {}
    for item in costs:
        if item["date"] not in daily_costs:
            daily_costs[item["date"]] = 0
        daily_costs[item["date"]] += item["cost"]
    
    dates = list(daily_costs.keys())
    dates.sort()
    costs_list = np.array([daily_costs[date] for date in dates], dtype=np.float32).reshape(-1, 1)

    # Build autoencoder
    input_layer = tf.keras.layers.Input(shape=(1,))
    encoded = tf.keras.layers.Dense(4, activation='relu')(input_layer)
    decoded = tf.keras.layers.Dense(1)(encoded)
    autoencoder = tf.keras.models.Model(input_layer, decoded)
    autoencoder.compile(optimizer='adam', loss='mse')

    # Train autoencoder on costs
    autoencoder.fit(costs_list, costs_list, epochs=50, batch_size=8, verbose=0)

    # Predict reconstructed costs
    reconstructed = autoencoder.predict(costs_list, verbose=0)
    reconstruction_error = np.abs(costs_list.flatten() - reconstructed.flatten())

    # Simple thresholding
    threshold = np.mean(reconstruction_error) + 2 * np.std(reconstruction_error)
    anomalies = []

    for i, error in enumerate(reconstruction_error):
        if error > threshold:
            date = dates[i]
            day_resources = [item for item in costs if item["date"] == date]
            day_resources.sort(key=lambda x: x["cost"], reverse=True)
            top_contributors = day_resources[:3]

            anomalies.append({
                "date": date,
                "normalCost": round(float(np.mean(costs_list)), 2),
                "anomalyCost": round(float(daily_costs[date]), 2),
                "percentageIncrease": round(((daily_costs[date] / np.mean(costs_list)) - 1) * 100),
                "reconstructionError": round(float(error), 2),
                "contributors": [
                    {
                        "resourceName": item["name"],
                        "resourceType": item["type"],
                        "cost": item["cost"]
                    } for item in top_contributors
                ]
            })
    
    return {
        "anomalies": anomalies,
        "anomalyDaysCount": len(anomalies),
        "averageDailyCost": round(float(np.mean(costs_list)), 2),
        "standardDeviation": round(float(np.std(costs_list)), 2)
    }
