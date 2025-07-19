import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Button, TextField, Box, Typography, IconButton,
  List, ListItem, ListItemText, ListItemButton, Divider, Tooltip
} from '@mui/material';
import {
  Brightness4, Brightness7, ContentCopy, Send, Check, Add, Delete, Logout, Menu
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';

// --- Axios Setup ---
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(true);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// --- Helper Functions ---
const parseAIResponse = (text) => {
  if (!text) return [];
  const parts = text.split(/(```(?:\w+)?\n[\s\S]*?\n```)/);
  return parts.map(part => {
    const match = part.match(/```(\w+)?\n([\s\S]*?)\n```/);
    if (match) return { type: 'code', language: match[1] || 'javascript', content: match[2].trim() };
    return { type: 'text', content: part };
  }).filter(p => p.content.trim() !== '');
};

const CodeBlock = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Box sx={{ position: 'relative', my: 1, bgcolor: '#0d1117', borderRadius: 2, overflow: 'hidden' }}>
      <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, padding: '16px' }}>
        {code}
      </SyntaxHighlighter>
      <IconButton onClick={handleCopyCode} sx={{ position: 'absolute', top: 4, right: 4, color: '#e0e0e0' }}>
        <Tooltip title="Copy Code">
          {copied ? <Check fontSize="small" sx={{ color: '#4caf50' }} /> : <ContentCopy fontSize="small" />}
        </Tooltip>
      </IconButton>
    </Box>
  );
};

// --- GPT Typing Animation ---
const GPTTyping = () => {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, mb: 2,
      pl: 2, py: 1, bgcolor: '#222', borderRadius: 2, width: 'fit-content'
    }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
      }}>
        <GPTDot delay={0} />
        <GPTDot delay={0.3} />
        <GPTDot delay={0.6} />
      </Box>
      <Typography variant="body2" sx={{ color: '#a3e635', fontWeight: 500 }}>Jai is typing...</Typography>
    </Box>
  );
};

const GPTDot = ({ delay }) => (
  <Box sx={{
    width: 8, height: 8, borderRadius: '50%', bgcolor: '#a3e635',
    animation: `gptBlink 1.2s infinite ${delay}s`,
    '@keyframes gptBlink': {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.2 },
      '100%': { opacity: 1 },
    }
  }} />
);

// --- Main ChatBox Component ---
export default function ChatBox() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showTyping, setShowTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar toggle
  const chatEndRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    }
  }, [currentUser]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInput('');
  };

  const handleSelectConversation = async (id) => {
    if (id === currentConversationId) return;
    setLoading(true);
    handleNewChat();
    try {
      const res = await api.get(`/conversations/${id}`);
      const formattedMessages = res.data.messages.map(msg => ({
        sender: msg.sender,
        parts: parseAIResponse(msg.content),
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setMessages(formattedMessages);
      setCurrentConversationId(id);
    } catch (error) {
      console.error("Failed to fetch conversation", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/conversations/${id}`);
      if (id === currentConversationId) handleNewChat();
      fetchConversations();
    } catch (error) {
      console.error("Failed to delete conversation", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userPrompt = input;
    setInput('');
    setMessages(prev => [...prev, {
      sender: 'user',
      parts: [{ type: 'text', content: userPrompt }],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setShowTyping(true);
    setLoading(true);

    try {
      const res = await api.post('/chat', { prompt: userPrompt, conversationId: currentConversationId });
      const { aiMessage, newConversationId } = res.data;
      setMessages(prev => [...prev, {
        sender: 'ai',
        parts: parseAIResponse(aiMessage.content),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      if (!currentConversationId) {
        setCurrentConversationId(newConversationId);
        fetchConversations();
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        parts: [{ type: 'text', content: `⚠️ Error: ${err.response?.data?.error || 'Could not get response'}` }],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setShowTyping(false);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await auth.signOut(); }
    catch (error) { console.error("Logout failed", error); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.sender === 'user';
    const align = isUser ? 'flex-end' : 'flex-start';
    const bgColor = isUser ? (darkMode ? '#2563eb' : '#dbeafe') : (darkMode ? '#374151' : '#e5e7eb');
    const color = isUser ? (darkMode ? '#fff' : '#1e3a8a') : (darkMode ? '#e5e7eb' : '#1f2937');
    return (
      <Box key={index} sx={{ display: 'flex', justifyContent: align, mb: 2 }}>
        <Box sx={{ maxWidth: '80%', bgcolor: bgColor, color, p: 2, borderRadius: 2, boxShadow: 1 }}>
          {msg.parts.map((part, i) =>
            part.type === 'code'
              ? <CodeBlock key={i} language={part.language} code={part.content} />
              : <Typography key={i} variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{part.content}</Typography>
          )}
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 1, color: darkMode ? '#9ca3af' : '#6b7280' }}>{msg.timestamp}</Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', bgcolor: darkMode ? '#111827' : '#f3f4f6' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: { xs: isSidebarOpen ? '260px' : '0', sm: isSidebarOpen ? '260px' : '0' },
          bgcolor: darkMode ? '#1f2937' : '#fff',
          color: darkMode ? '#e5e7eb' : '#1f2937',
          p: isSidebarOpen ? 1 : 0,
          borderRight: isSidebarOpen ? `1px solid ${darkMode ? '#374151' : '#e5e7eb'}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease-in-out',
          overflowX: 'hidden',
          position: { xs: 'absolute', sm: 'relative' },
          zIndex: 1200,
          height: '100%',
        }}
      >
        {isSidebarOpen && (
          <>
            <Button onClick={handleNewChat} startIcon={<Add />} variant="outlined" sx={{ mb: 2, color: 'inherit', borderColor: 'inherit' }}>
              New Chat
            </Button>
            <Divider sx={{ bgcolor: darkMode ? '#374151' : '#e5e7eb' }} />
            <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {conversations.map(convo => (
                <ListItem key={convo._id} disablePadding sx={{ my: 0.5 }}>
                  <ListItemButton
                    onClick={() => {
                      handleSelectConversation(convo._id);
                      setIsSidebarOpen(false); // Close sidebar on mobile after selection
                    }}
                    selected={currentConversationId === convo._id}
                    sx={{ borderRadius: 1, '&.Mui-selected': { bgcolor: darkMode ? '#374151' : '#e5e7eb' } }}
                  >
                    <ListItemText primary={convo.title} primaryTypographyProps={{ noWrap: true, sx: { pr: 4 } }} />
                    <IconButton
                      onClick={(e) => handleDeleteConversation(e, convo._id)}
                      size="small"
                      sx={{ position: 'absolute', right: 8, color: darkMode ? '#9ca3af' : '#6b7280' }}
                    >
                      <Tooltip title="Delete Chat">
                        <Delete fontSize="small" />
                      </Tooltip>
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ bgcolor: darkMode ? '#374151' : '#e5e7eb' }} />
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" noWrap title={currentUser?.email || currentUser?.phoneNumber}>
                {currentUser?.email || currentUser?.phoneNumber || 'Logged In'}
              </Typography>
              <Button
                fullWidth
                variant="text"
                startIcon={<Logout />}
                onClick={handleLogout}
                sx={{ color: darkMode ? '#f87171' : '#ef4444', justifyContent: 'flex-start', mt: 1, p: 1 }}
              >
                Logout
              </Button>
            </Box>
          </>
        )}
      </Box>

      {/* Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={toggleSidebar}
              sx={{ color: darkMode ? '#fff' : '#000', mr: 1 }}
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <Menu />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: darkMode ? '#fff' : '#000' }}>
              Jai - Coding Assistant
            </Typography>
          </Box>
          <IconButton onClick={() => setDarkMode(p => !p)} sx={{ color: darkMode ? '#fff' : '#000' }}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, sm: 3 }, bgcolor: darkMode ? '#1f2937' : '#fff', borderRadius: 2, mb: 2, boxShadow: 1 }}>
          {messages.length === 0 && !loading && (
            <Typography sx={{ textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280', fontStyle: 'italic' }}>
              Start a new conversation or select one from the history.
            </Typography>
          )}
          {messages.map((msg, idx) => renderMessage(msg, idx))}
          {showTyping && <GPTTyping />}
          <div ref={chatEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: darkMode ? '#374151' : '#fff', borderRadius: 2, p: 1, boxShadow: 1 }}>
          <TextField
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Jai anything..."
            multiline
            maxRows={5}
            fullWidth
            variant="standard"
            InputProps={{ disableUnderline: true, sx: { p: 1, color: darkMode ? '#fff' : '#000' } }}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            variant="contained"
            sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, borderRadius: 2, ml: 1, p: '10px' }}
            aria-label="send message"
          >
            <Send />
          </Button>
        </Box>

        {/* Footer */}
        <Typography variant="caption" sx={{ mt: 2, textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>
          Created by <a href="https://jairisys.tech" target="_blank" rel="noopener noreferrer" style={{ color: darkMode ? '#60a5fa' : '#2563eb' }}>Jairisys.tech</a>, Crafted with ❤️.
        </Typography>
      </Box>
    </Box>
  );
}