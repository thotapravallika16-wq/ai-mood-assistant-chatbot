// ════════════════════════════════════════════════════════════════════
// 🤖 AI AGENT CONFIGURATION
// ════════════════════════════════════════════════════════════════════
const AI_AGENT_NAME = "MindEase Wellness Agent™";
const AI_AGENT_MODEL = "claude-sonnet-4-20250514";
const AI_AGENT_ROLE = "Empathetic Mental Health Companion";
const ANTHROPIC_API_KEY = ""; // Add your Claude API key here if available

function getFallbackReply(text, sentiment) {
  const lower = text.toLowerCase();
  const prompts = {
    stressed: `I can hear how much pressure you're feeling right now. It's okay to take a breath and slow down a little bit. What would help you feel a bit more supported in this moment?`,
    anxious: `Anxiety can feel overwhelming, and you're not alone in this. Try a gentle breathing pause and tell me what is making you feel uneasy.`,
    sad: `I'm sorry you're feeling low. Your feelings are valid, and I'm here to listen. Would you like to share more about what's weighing on you?`,
    happy: `That's lovely to hear — I'm glad you're feeling good. What's been going well for you today?`,
    neutral: `Thanks for sharing. I'm here to listen and support you. What's on your mind today?`
  };

  if (prompts[sentiment.mood]) {
    return prompts[sentiment.mood];
  }

  if (lower.includes('help')) {
    return `I'm here to help you however I can. Tell me more about what you're experiencing right now.`;
  }

  return `I'm here for you. Could you share a little more about what's on your mind?`;
}

// This agent processes EVERY question with the following configuration
// ════════════════════════════════════════════════════════════════════

// ── PYTHON-STYLE SENTIMENT ANALYZER (JavaScript mirror of the Python code above) ──
const moodKeywords = {
  stressed:  { words: ["stress","overwhelmed","pressure","exam","deadline","assignment","test","grade","fail","behind","late","stuck"], color: "#e67e4d", emoji: "😰", label: "Stressed", barColor: "#e67e4d", score: 20 },
  anxious:   { words: ["anxious","worried","nervous","panic","scared","fear","dread","uneasy","restless","heart racing"], color: "#c17f55", emoji: "😟", label: "Anxious", barColor: "#c17f55", score: 25 },
  sad:       { words: ["sad","lonely","cry","hopeless","depressed","unhappy","miserable","empty","lost","alone","worthless","tired"], color: "#7a8f82", emoji: "😔", label: "Low mood", barColor: "#7a8f82", score: 15 },
  happy:     { words: ["happy","good","great","excited","amazing","wonderful","fantastic","joy","love","proud","motivated","awesome","fine","okay"], color: "#4a7c59", emoji: "😊", label: "Positive", barColor: "#4a7c59", score: 85 },
  neutral:   { words: ["okay","fine","alright","normal","meh","so-so","average"], color: "#a8b8b0", emoji: "😐", label: "Neutral", barColor: "#a8b8b0", score: 50 }
};

function analyzeSentiment(text) {
  const lower = text.toLowerCase();
  let scores = { stressed: 0, anxious: 0, sad: 0, happy: 0, neutral: 0 };

  for (const [mood, data] of Object.entries(moodKeywords)) {
    for (const word of data.words) {
      if (lower.includes(word)) scores[mood]++;
    }
  }

  let detected = "neutral";
  let maxScore = 0;
  for (const [mood, s] of Object.entries(scores)) {
    if (s > maxScore) { maxScore = s; detected = mood; }
  }

  return { mood: detected, data: moodKeywords[detected], rawScores: scores };
}

function updateMoodBar(sentiment) {
  const bar = document.getElementById('moodBar');
  const emoji = document.getElementById('moodEmoji');
  const label = document.getElementById('moodLabel');
  bar.style.width = sentiment.data.score + '%';
  bar.style.background = sentiment.data.barColor;
  emoji.textContent = sentiment.data.emoji;
  label.textContent = sentiment.data.label;
}

// ── CHAT LOGIC ──
const conversationHistory = [];
let isTyping = false;

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage(text, role, moodTag) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  let moodHtml = '';
  let agentHtml = '';
  
  if (role === 'bot') {
    agentHtml = `<div class="agent-badge">🤖 ${AI_AGENT_NAME}</div>`;
    if (moodTag) {
      moodHtml = `<div class="mood-indicator">🔍 Mood: ${moodTag}</div>`;
    }
  }

  div.innerHTML = `
      ${agentHtml}
      ${moodHtml}
      <div class="msg-bubble">${text.replace(/\n/g,'<br>')}</div>
      <div class="msg-time">${getTime()}</div>
    `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'typingIndicator';
  div.innerHTML = `<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || isTyping) return;

  input.value = '';
  input.style.height = 'auto';
  isTyping = true;

  // Sentiment analysis
  const sentiment = analyzeSentiment(text);
  updateMoodBar(sentiment);

  addMessage(text, 'user', null);

  conversationHistory.push({ role: 'user', content: text });

  // Hide quick replies after first message
  document.getElementById('quickReplies').style.display = 'none';

  showTyping();

  // Build system prompt with mood context
  const systemPrompt = `You are ${AI_AGENT_NAME} — ${AI_AGENT_ROLE}

Agent ID: ${AI_AGENT_NAME}
Model: ${AI_AGENT_MODEL}
Processing user input with mood detection...

The user's detected mood (via sentiment analysis): ${sentiment.mood.toUpperCase()} (${sentiment.data.label})

Guidelines:
- Be genuinely warm, empathetic, and non-judgmental
- Keep responses concise but meaningful (2-4 short paragraphs max)
- When mood is stressed/anxious: acknowledge their feelings, offer a quick calming tip or breathing exercise
- When mood is sad/lonely: validate their feelings deeply, remind them they matter, suggest small positive actions
- When mood is happy: celebrate with them, encourage positive momentum
- Occasionally suggest: breathing exercises (4-7-8 method), grounding techniques, journaling, or Pomodoro studying
- Never diagnose or replace professional help; gently recommend counselors for serious issues
- Use gentle emojis sparingly (1-2 per message)
- End messages with a question to keep the conversation going`;

  try {
    // ============================================
    // 🤖 AI AGENT PROCESSING - routed to Python backend
    // ============================================
    console.log(`[${AI_AGENT_NAME}] Processing question...`);
    console.log(`Agent: ${AI_AGENT_NAME}`);
    console.log(`Model: ${AI_AGENT_MODEL}`);
    console.log(`Role: ${AI_AGENT_ROLE}`);
    console.log(`Detected Mood: ${sentiment.mood}`);
    // ============================================

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        history: conversationHistory
      })
    });

    const data = await response.json();
    let reply = data.reply || getFallbackReply(text, sentiment);

    if (data.sentiment) {
      updateMoodBar(data.sentiment);
    }

    removeTyping();
    conversationHistory.push({ role: 'assistant', content: reply });
    console.log(`[${AI_AGENT_NAME}] Response generated successfully`);
    addMessage(reply, 'bot', sentiment.data.label);
  } catch (e) {
    removeTyping();
    console.error(`[${AI_AGENT_NAME}] Error:`, e);
    const fallback = getFallbackReply(text, sentiment);
    conversationHistory.push({ role: 'assistant', content: fallback });
    addMessage(fallback, 'bot', sentiment.data.label);
  }

  isTyping = false;
}

function sendQuick(text) {
  document.getElementById('chatInput').value = text;
  sendMessage();
}

function sendTip(topic) {
  document.getElementById('chatInput').value = `Tell me about ${topic}`;
  sendMessage();
  document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// Hero mood selector
const heroReplies = {
  sad:     "I hear you 💙 It's okay to feel sad. You're not alone — I'm right here with you. Want to talk about what's been heavy on your heart?",
  anxious: "Anxiety can be really tough 😟 Let's take a slow breath together first. Breathe in... and out. What's been making you feel uneasy?",
  neutral: "Hi there 🌿 I'm MindEase, your personal wellness companion. How's your day going so far?",
  good:    "That's wonderful to hear 🙂 Even good days can hide small worries. Is there anything on your mind you'd like to talk through?",
  happy:   "Love that energy! 😊✨ You're radiating good vibes. What's been making you smile today?"
};

function selectHeroMood(btn, emoji, mood) {
  document.querySelectorAll('.mood-emoji-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('hero-response').textContent = heroReplies[mood];
}

// ════════════════════════════════════════════════════════════════════
// 🤖 AI AGENT INITIALIZATION
// ════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  console.log(`✅ ${AI_AGENT_NAME} initialized and ready`);
  console.log(`🤖 Agent Model: ${AI_AGENT_MODEL}`);
  console.log(`📋 Agent Role: ${AI_AGENT_ROLE}`);
  console.log(`➤ Agent will process ALL user questions in the chatbot`);
  // Update agent name display
  const agentDisplay = document.getElementById('agentNameDisplay');
  if (agentDisplay) {
    agentDisplay.textContent = AI_AGENT_NAME;
  }
});
// ════════════════════════════════════════════════════════════════════
