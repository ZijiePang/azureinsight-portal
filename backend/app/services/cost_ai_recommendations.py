# app/services/cost_ai_recommendations.py

# this is AI generated, not connected to other part of the code

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

class CostItem(BaseModel):
    name: str
    type: str
    cost: float
    date: str
    resourceGroup: str
    tags: dict

class AnomalyItem(BaseModel):
    date: str
    normalCost: float
    anomalyCost: float
    percentageIncrease: float
    contributors: List[dict]

class AIInsightRequest(BaseModel):
    costs: List[CostItem]
    anomalies: List[AnomalyItem]

def build_prompt(costs, anomalies):
    # Clear instruction + specific examples + task framing
    prompt = """
    You are a cloud cost optimization assistant 🤖.

    Given the cloud cost records and anomaly detection results below,
    generate 3-5 actionable and concise recommendations to help reduce unnecessary spending.

    Rules:
    - Summarize clearly in human-friendly language (short sentences).
    - Prioritize based on severity (e.g., anomalies first, untagged resources next, idle resources last).
    - Each insight starts with an emoji (⚠️, 🔍, 🛑, ✅, etc.).
    - Focus on **actionable** steps, not generic advice.

    Example Output:
    - ⚠️ This week detected 3 days of abnormal spending, with the highest daily cost 250% above average. Review VM configurations.
    - 🛑 Found 39 resources without application_id tags, costing $6,820. Adding tags recommended.
    - 🔍 Detected unused database instances costing $112/day. Review necessity.

    Data:
    COSTS:
    """

    for cost in costs[:30]:  # limit number for safety
        prompt += f"- {cost.date} | {cost.name} | {cost.type} | ${cost.cost:.2f} | {cost.tags}\n"

    prompt += "\nANOMALIES:\n"
    for anomaly in anomalies[:10]:  # limit number
        prompt += f"- {anomaly.date}: {anomaly.percentageIncrease:.1f}% increase (${anomaly.anomalyCost:.2f} vs normal ${anomaly.normalCost:.2f})\n"

    prompt += "\nNow generate the insights:"

    return prompt

@app.post("/api/ai/recommendations")
def generate_ai_insights(request: AIInsightRequest):
    try:
        prompt = build_prompt(request.costs, request.anomalies)

        # System message shapes AI's role, User message is the actual task
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert cloud cost optimization assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=500,
        )

        # Get the AI-generated insights
        ai_text = response['choices'][0]['message']['content']

        # Optionally split into bullet points
        insights = [line.strip() for line in ai_text.split("\n") if line.strip()]

        return {"insights": insights}
    except Exception as e:
        return {"error": str(e)}
