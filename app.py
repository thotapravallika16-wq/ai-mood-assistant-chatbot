import os
import json
from typing import Any, Dict

try:
    import requests
except ImportError:  # requests is optional when API integration is not used
    requests = None

from flask import Flask, jsonify, request

app = Flask(__name__, static_folder='.', static_url_path='')

AI_AGENT_NAME = "MindEase Wellness Agent™"
AI_AGENT_MODEL = "claude-sonnet-4-20250514"
AI_AGENT_ROLE = "Empathetic Mental Health Companion"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

mood_keywords: Dict[str, Dict[str, Any]] = {
    "stressed": {
        "words": ["stress", "overwhelmed", "pressure", "exam", "deadline", "assignment", "test", "grade", "fail", "behind", "late", "stuck"],
        "color": "#e67e4d",
        "emoji": "😰",
        "label": "Stressed",
        "barColor": "#e67e4d",
        "score": 20,
    },
    "anxious": {
        "words": ["anxious", "worried", "nervous", "panic", "scared", "fear", "dread", "uneasy", "restless", "heart racing"],
        "color": "#c17f55",
        "emoji": "😟",
        "label": "Anxious",
        "barColor": "#c17f55",
        "score": 25,
    },
    "sad": {
        "words": ["sad", "lonely", "cry", "hopeless", "depressed", "unhappy", "miserable", "empty", "lost", "alone", "worthless", "tired"],
        "color": "#7a8f82",
        "emoji": "😔",
        "label": "Low mood",
        "barColor": "#7a8f82",
        "score": 15,
    },
    "happy": {
        "words": ["happy", "good", "great", "excited", "amazing", "wonderful", "fantastic", "joy", "love", "proud", "motivated", "awesome", "fine", "okay"],
        "color": "#4a7c59",
        "emoji": "😊",
        "label": "Positive",
        "barColor": "#4a7c59",
        "score": 85,
    },
    "neutral": {
        "words": ["okay", "fine", "alright", "normal", "meh", "so-so", "average"],
        "color": "#a8b8b0",
        "emoji": "😐",
        "label": "Neutral",
        "barColor": "#a8b8b0",
        "score": 50,
    },
}


def analyze_sentiment(text: str) -> Dict[str, Any]:
    lower = text.lower()
    scores = {mood: 0 for mood in mood_keywords}

    for mood, data in mood_keywords.items():
        for word in data["words"]:
            if word in lower:
                scores[mood] += 1

    detected = "neutral"
    max_score = 0
    for mood, score in scores.items():
        if score > max_score:
            max_score = score
            detected = mood

    return {"mood": detected, "data": mood_keywords[detected], "rawScores": scores}


def get_fallback_reply(text: str, sentiment: Dict[str, Any]) -> str:
    lower = text.lower()
    prompts = {
        "stressed": "I can hear how much pressure you're feeling right now. It's okay to take a breath and slow down a little bit. What would help you feel a bit more supported in this moment?",
        "anxious": "Anxiety can feel overwhelming, and you're not alone in this. Try a gentle breathing pause and tell me what is making you feel uneasy.",
        "sad": "I'm sorry you're feeling low. Your feelings are valid, and I'm here to listen. Would you like to share more about what's weighing on you?",
        "happy": "That's lovely to hear — I'm glad you're feeling good. What's been going well for you today?",
        "neutral": "Thanks for sharing. I'm here to listen and support you. What's on your mind today?",
    }

    if sentiment["mood"] in prompts:
        return prompts[sentiment["mood"]]

    if "help" in lower:
        return "I'm here to help you however I can. Tell me more about what you're experiencing right now."

    return "I'm here for you. Could you share a little more about what's on your mind?"


def build_system_prompt(sentiment: Dict[str, Any]) -> str:
    return f"""You are {AI_AGENT_NAME} — {AI_AGENT_ROLE}

Agent ID: {AI_AGENT_NAME}
Model: {AI_AGENT_MODEL}
Processing user input with mood detection...

The user's detected mood (via sentiment analysis): {sentiment['mood'].upper()} ({sentiment['data']['label']})

Guidelines:
- Be genuinely warm, empathetic, and non-judgmental
- Keep responses concise but meaningful (2-4 short paragraphs max)
- When mood is stressed/anxious: acknowledge their feelings, offer a quick calming tip or breathing exercise
- When mood is sad/lonely: validate their feelings deeply, remind them they matter, suggest small positive actions
- When mood is happy: celebrate with them, encourage positive momentum
- Occasionally suggest: breathing exercises (4-7-8 method), grounding techniques, journaling, or Pomodoro studying
- Never diagnose or replace professional help; gently recommend counselors for serious issues
- Use gentle emojis sparingly (1-2 per message)
- End messages with a question to keep the conversation going"""


def call_anthropic_api(payload: Dict[str, Any]) -> Dict[str, Any]:
    url = 'https://api.anthropic.com/v1/messages'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ANTHROPIC_API_KEY}',
    }

    if requests is not None:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        return response.json()

    from urllib import request as urllib_request
    from urllib.error import HTTPError, URLError

    request_body = json.dumps(payload).encode('utf-8')
    req = urllib_request.Request(url, data=request_body, headers=headers, method='POST')

    try:
        with urllib_request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        error_body = exc.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'HTTP error {exc.code}: {error_body}') from exc
    except URLError as exc:
        raise RuntimeError(f'Connection error: {exc.reason}') from exc


@app.route('/')
def index() -> Any:
    return app.send_static_file('mental_health_companion.html')


@app.route('/api/chat', methods=['POST'])
def chat() -> Any:
    payload = request.get_json(force=True)
    user_message = str(payload.get('message', '')).strip()
    history = payload.get('history', [])

    if not user_message:
        return jsonify({'error': 'Message is required.'}), 400

    sentiment = analyze_sentiment(user_message)
    reply = get_fallback_reply(user_message, sentiment)

    if ANTHROPIC_API_KEY:
        system_prompt = build_system_prompt(sentiment)
        payload = {
            'model': AI_AGENT_MODEL,
            'max_tokens': 1000,
            'system': system_prompt,
            'messages': history,
        }
        try:
            data = call_anthropic_api(payload)
            content = data.get('content')
            if isinstance(content, list) and content:
                reply = content[0].get('text') or reply
            elif isinstance(content, dict):
                reply = content.get('text') or reply

            completion = data.get('completion')
            if isinstance(completion, dict):
                completion_content = completion.get('content')
                if isinstance(completion_content, list) and completion_content:
                    reply = completion_content[0].get('text') or reply
                elif isinstance(completion_content, dict):
                    reply = completion_content.get('text') or reply
            elif isinstance(completion, str) and completion:
                reply = completion
        except Exception:
            pass

    return jsonify({
        'reply': reply,
        'sentiment': sentiment,
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
