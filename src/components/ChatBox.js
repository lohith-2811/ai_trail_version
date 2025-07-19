import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Button, TextField, Box, Typography, IconButton,
  List, ListItem, ListItemText, ListItemButton, Divider, Tooltip, Drawer, useMediaQuery, useTheme
} from '@mui/material';
import {
  Brightness4, Brightness7, ContentCopy, Send, Check, Add, Delete, Logout, Menu, ChevronLeft
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
      <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, padding: '12px', fontSize: '12px' }}>
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
      display: 'flex', alignItems: 'center', gap: 0.5, mb: 1,
      pl: 1, py: 0.5, bgcolor: '#222', borderRadius: 1, width: 'fit-content'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
        <GPTDot delay={0} />
        <GPTDot delay={0.3} />
        <GPTDot delay={0.6} />
      </Box>
      <Typography variant="body2" sx={{ color: '#a3e635', fontWeight: 500, fontSize: '12px' }}>Jai is typing...</Typography>
    </Box>
  );
};

const GPTDot = ({ delay }) => (
  <Box sx={{
    width: 6, height: 6, borderRadius: '50%', bgcolor: '#a3e635',
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open for desktop
  const [isMiniSidebar, setIsMiniSidebar] = useState(false); // Mini state for desktop
  const chatEndRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.get('/conversations');
      console.log('Fetched conversations:', res.data); // Debug log
      if (res.data && Array.isArray(res.data)) {
        setConversations(res.data);
      } else {
        setConversations([]);
        console.log('No valid conversation data received');
      }
    } catch (error) {
      console.error("Failed to fetch conversations", error);
      setConversations([]);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchConversations();
    // Lock body scroll on mobile when sidebar is open
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [fetchConversations, isMobile, isSidebarOpen]);

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
    if (isMobile) {
      setIsSidebarOpen(prev => !prev);
    } else {
      setIsMiniSidebar(prev => !prev);
    }
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.sender === 'user';
    const align = isUser ? 'flex-end' : 'flex-start';
    const bgColor = isUser ? (darkMode ? '#2563eb' : '#dbeafe') : (darkMode ? '#374151' : '#e5e7eb');
    const color = isUser ? (darkMode ? '#fff' : '#1e3a8a') : (darkMode ? '#e5e7eb' : '#1f2937');
    return (
      <Box key={index} sx={{ display: 'flex', justifyContent: align, mb: 1 }}>
        <Box sx={{ maxWidth: '90%', bgcolor: bgColor, color, p: 1, borderRadius: 1, boxShadow: 1 }}>
          {msg.parts.map((part, i) =>
            part.type === 'code'
              ? <CodeBlock key={i} language={part.language} code={part.content} />
              : <Typography key={i} variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{part.content}</Typography>
          )}
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '10px' }}>{msg.timestamp}</Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', bgcolor: darkMode ? '#111827' : '#f3f4f6', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={isMobile ? isSidebarOpen : !isMiniSidebar}
        onClose={toggleSidebar}
        sx={{
          width: isMobile ? '70%' : (isMiniSidebar ? 60 : 260),
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: isMobile ? '70%' : (isMiniSidebar ? 60 : 260),
            boxSizing: 'border-box',
            bgcolor: darkMode ? '#1f2937' : '#fff',
            color: darkMode ? '#e5e7eb' : '#1f2937',
            borderRight: !isMobile && !isMiniSidebar ? `1px solid ${darkMode ? '#374151' : '#e5e7eb'}` : 'none',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease-in-out',
          },
        }}
        ModalProps={{
          keepMounted: true,
          onBackdropClick: () => setIsSidebarOpen(false),
          style: { overflow: 'hidden' },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '40px' }}>
            <Button onClick={handleNewChat} startIcon={<Add />} variant="outlined" sx={{ mb: 0, color: 'inherit', borderColor: 'inherit', fontSize: '12px' }}>
              New Chat
            </Button>
            {!isMobile && (
              <IconButton onClick={toggleSidebar} sx={{ color: darkMode ? '#fff' : '#000' }}>
                <ChevronLeft />
              </IconButton>
            )}
          </Box>
          <Divider sx={{ bgcolor: darkMode ? '#374151' : '#e5e7eb' }} />
          <List sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 180px)', p: 0 }}>
            {conversations.length > 0 ? (
              conversations.map(convo => (
                <ListItem key={convo._id} disablePadding sx={{ my: 0.5 }}>
                  <ListItemButton
                    onClick={() => {
                      handleSelectConversation(convo._id);
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                    selected={currentConversationId === convo._id}
                    sx={{ borderRadius: 1, '&.Mui-selected': { bgcolor: darkMode ? '#374151' : '#e5e7eb' }, py: 0.5 }}
                  >
                    <ListItemText primary={convo.title} primaryTypographyProps={{ noWrap: true, sx: { pr: 4, fontSize: '12px' } }} />
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
              ))
            ) : (
              <Typography sx={{ p: 1, color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>No conversations yet.</Typography>
            )}
          </List>
          <Divider sx={{ bgcolor: darkMode ? '#374151' : '#e5e7eb' }} />
          <Box sx={{ p: 0.5, flexShrink: 0, minHeight: '80px' }}>
            <Typography variant="body2" noWrap title={currentUser?.email || currentUser?.phoneNumber} sx={{ fontSize: '10px', mb: 0.5 }}>
              {currentUser?.email || currentUser?.phoneNumber || 'Logged In'}
            </Typography>
            <Button
              fullWidth
              variant="text"
              startIcon={<Logout />}
              onClick={handleLogout}
              sx={{ color: darkMode ? '#f87171' : '#ef4444', justifyContent: 'flex-start', p: 0.5, fontSize: '10px' }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: { xs: 0.5, sm: 2 }, width: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={toggleSidebar}
              sx={{ color: darkMode ? '#fff' : '#000', mr: 0.5 }}
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <Menu />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: darkMode ? '#fff' : '#000', fontSize: { xs: '16px', sm: '20px' } }}>
              Jai - Coding Assistant
            </Typography>
          </Box>
          <IconButton onClick={() => setDarkMode(p => !p)} sx={{ color: darkMode ? '#fff' : '#000' }}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 1, sm: 3 }, bgcolor: darkMode ? '#1f2937' : '#fff', borderRadius: 2, mb: 1, boxShadow: 1, maxWidth: '100%' }}>
          {messages.length === 0 && !loading && (
            <Typography sx={{ textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280', fontStyle: 'italic', fontSize: '12px' }}>
              Start a new conversation or select one from the history.
            </Typography>
          )}
          {messages.map((msg, idx) => renderMessage(msg, idx))}
          {showTyping && <GPTTyping />}
          <div ref={chatEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: darkMode ? '#374151' : '#fff', borderRadius: 2, p: 0.5, boxShadow: 1, mb: 1 }}>
          <TextField
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Jai anything..."
            multiline
            maxRows={3}
            fullWidth
            variant="standard"
            InputProps={{ disableUnderline: true, sx: { p: 0.5, color: darkMode ? '#fff' : '#000', fontSize: '14px' } }}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            variant="contained"
            sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, borderRadius: 2, ml: 0.5, p: '6px', minWidth: '40px' }}
            aria-label="send message"
          >
            <Send />
          </Button>
        </Box>

        {/* Footer */}
        <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '10px', pb: 1 }}>
          Created by <a href="https://jairisys.tech" target="_blank" rel="noopener noreferrer" style={{ color: darkMode ? '#60a5fa' : '#2563eb' }}>Jairisys.tech</a>, Crafted with ❤️.
        </Typography>
      </Box>
    </Box>
  );
}
