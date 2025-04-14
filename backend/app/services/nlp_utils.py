def parse_natural_query(query: str):
    # Mock behavior
    if "may" in query.lower():
        return {"interpreted": "secrets expiring in May", "results": [
            {"name": "SecretMay", "type": "secret", "expiresOn": "2025-05-15"}
        ]}
    return {"interpreted": "no match", "results": []}