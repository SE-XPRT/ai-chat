"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    "mistralai/mistral-7b-instruct:free"
  );
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const messagesEndRef = useRef(null);

  // Bibliothèque de prompts
  const promptTemplates = [
    {
      id: 1,
      title: "📝 Résumé de texte",
      prompt: "Résume ce texte de manière concise et claire :",
    },
    {
      id: 2,
      title: "💻 Débugger du code",
      prompt:
        "Trouve et corrige les erreurs dans ce code :\n\n```\n[Colle ton code ici]\n```",
    },
    {
      id: 3,
      title: "✍️ Améliorer un texte",
      prompt: "Améliore ce texte en le rendant plus professionnel et clair :",
    },
    {
      id: 4,
      title: "🌍 Traduction",
      prompt: "Traduis ce texte en [langue] :",
    },
    {
      id: 5,
      title: "💡 Brainstorming",
      prompt: "Génère 10 idées créatives pour :",
    },
    {
      id: 6,
      title: "📧 Email professionnel",
      prompt: "Écris un email professionnel pour :",
    },
    {
      id: 7,
      title: "🎓 Expliquer simplement",
      prompt: "Explique ce concept comme si j'avais 10 ans :",
    },
    {
      id: 8,
      title: "🔍 Analyse critique",
      prompt: "Fais une analyse critique approfondie de :",
    },
  ];

  // Charger les conversations depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("aiChatConversations");
    if (saved) {
      const parsed = JSON.parse(saved);
      setConversations(parsed);
    }
  }, []);

  // Sauvegarder les conversations
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(
        "aiChatConversations",
        JSON.stringify(conversations)
      );
    }
  }, [conversations]);

  // Charger une conversation
  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find((c) => c.id === currentConversationId);
      if (conv) {
        setMessages(conv.messages);
        setSelectedModel(conv.model);
      }
    }
  }, [currentConversationId, conversations]);

  const freeModels = [
    {
      id: "mistralai/mistral-7b-instruct:free",
      name: "⭐ Mistral 7B (Ultra Stable)",
      description: "Le plus fiable - Toujours disponible",
    },
    {
      id: "huggingfaceh4/zephyr-7b-beta:free",
      name: "💬 Zephyr 7B Beta",
      description: "Assistant conversationnel - Très stable",
    },
    {
      id: "google/gemini-2.0-flash-exp:free",
      name: "🚀 Gemini 2.0 Flash",
      description: "Puissant mais peut être limité",
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          model: selectedModel,
        }),
      });

      const data = await response.json();

      // Vérifier s'il y a une erreur dans la réponse
      if (data.error) {
        throw new Error(
          data.error + (data.details ? ` (${data.details})` : "")
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Erreur de réponse du serveur");
      }

      let assistantContent = data.choices[0].message.content;

      // Ajouter une note si un modèle de secours a été utilisé
      if (data.usedFallback && data.usedModel) {
        assistantContent = `ℹ️ _Modèle de secours utilisé: ${data.usedModel}_\n\n${assistantContent}`;
      }

      const assistantMessage = {
        role: "assistant",
        content: assistantContent,
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error("Erreur:", error);
      let errorMessage = "❌ Erreur: Impossible de communiquer avec l'IA.";

      if (
        error.message.includes("rate-limited") ||
        error.message.includes("429")
      ) {
        errorMessage =
          "⚠️ Tous les modèles sont temporairement surchargés. Veuillez réessayer dans quelques secondes.";
      } else if (error.message.includes("404")) {
        errorMessage =
          "❌ Erreur: Le service API n'est pas disponible. Vérifiez que le serveur est démarré.";
      } else if (error.message) {
        errorMessage = `❌ Erreur: ${error.message}`;
      }

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const saveConversation = () => {
    if (messages.length === 0) return;

    const title = messages[0]?.content.substring(0, 50) + "...";
    const newConv = {
      id: Date.now(),
      title,
      messages,
      model: selectedModel,
      date: new Date().toISOString(),
    };

    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
  };

  const loadConversation = (id) => {
    setCurrentConversationId(id);
    setShowHistory(false);
  };

  const deleteConversation = (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      setMessages([]);
      setCurrentConversationId(null);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    alert("Copié dans le presse-papier !");
  };

  const exportConversation = () => {
    const text = messages
      .map((m) => `${m.role === "user" ? "Vous" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${Date.now()}.txt`;
    a.click();
  };

  const usePromptTemplate = (prompt) => {
    setInput(prompt);
    setShowPromptLibrary(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtMS4xLjktMiAyLTJoNGMxLjEgMCAyIC45IDIgMnY0YzAgMS4xLS45IDItMiAyaC00Yy0xLjEgMC0yLS45LTItMnYtNHpNMCA0NmMwLTEuMS45LTIgMi0yaDRjMS4xIDAgMiAuOSAyIDJ2NGMwIDEuMS0uOSAyLTIgMkg4Yy0xLjEgMC0yLS45LTItMnYtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse-slow delay-200"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl h-[92vh] glass-morphism-strong rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header with Gradient */}
          <div className="relative bg-gradient-to-r from-violet-600/90 via-purple-600/90 to-fuchsia-600/90 backdrop-blur-xl">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
            <div className="relative p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-3xl shadow-lg hover-lift">
                    🤖
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                      AI Chat Assistant
                    </h1>
                    <p className="text-white/70 text-sm mt-1">
                      Propulsé par les meilleurs modèles IA gratuits
                    </p>
                  </div>
                </div>
              </div>

              {/* Model Selector - Enhanced */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                <div className="lg:col-span-2">
                  <label className="text-white/90 text-xs font-semibold mb-2 block uppercase tracking-wider">
                    Modèle IA
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-white/10 backdrop-blur-xl px-5 py-3.5 rounded-xl text-white text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all duration-300 hover:bg-white/15 cursor-pointer shadow-lg"
                  >
                    {freeModels.map((model) => (
                      <option
                        key={model.id}
                        value={model.id}
                        className="bg-slate-800 text-white"
                      >
                        {model.name}
                      </option>
                    ))}
                  </select>
                  {freeModels.find((m) => m.id === selectedModel) && (
                    <p className="text-white/60 text-xs mt-2 italic">
                      {
                        freeModels.find((m) => m.id === selectedModel)
                          .description
                      }
                    </p>
                  )}
                </div>

                <div className="flex items-end">
                  <div className="bg-emerald-500/20 backdrop-blur-xl px-4 py-3 rounded-xl border border-emerald-400/30 w-full">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-emerald-100 text-sm font-semibold">
                        Disponible 24/7
                      </span>
                    </div>
                    <p className="text-emerald-200/60 text-xs mt-1">
                      Fallback automatique
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Enhanced */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={newConversation}
                  className="group relative px-4 py-2.5 bg-white/10 backdrop-blur-xl hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-all duration-300 border border-white/20 hover:border-white/40 hover-lift shadow-lg"
                  title="Nouvelle conversation"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">➕</span>
                    <span>Nouveau</span>
                  </span>
                </button>

                <button
                  onClick={saveConversation}
                  className="group relative px-4 py-2.5 bg-blue-500/20 backdrop-blur-xl hover:bg-blue-500/30 rounded-xl text-blue-100 text-sm font-medium transition-all duration-300 border border-blue-400/30 hover:border-blue-400/50 hover-lift shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Sauvegarder la conversation"
                  disabled={messages.length === 0}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">💾</span>
                    <span>Sauvegarder</span>
                  </span>
                </button>

                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="group relative px-4 py-2.5 bg-purple-500/20 backdrop-blur-xl hover:bg-purple-500/30 rounded-xl text-purple-100 text-sm font-medium transition-all duration-300 border border-purple-400/30 hover:border-purple-400/50 hover-lift shadow-lg"
                  title="Historique"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">📚</span>
                    <span>Historique</span>
                    {conversations.length > 0 && (
                      <span className="bg-purple-400/40 px-2 py-0.5 rounded-full text-xs font-bold">
                        {conversations.length}
                      </span>
                    )}
                  </span>
                </button>

                <button
                  onClick={() => setShowPromptLibrary(!showPromptLibrary)}
                  className="group relative px-4 py-2.5 bg-amber-500/20 backdrop-blur-xl hover:bg-amber-500/30 rounded-xl text-amber-100 text-sm font-medium transition-all duration-300 border border-amber-400/30 hover:border-amber-400/50 hover-lift shadow-lg"
                  title="Bibliothèque de prompts"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <span>Prompts</span>
                  </span>
                </button>

                <button
                  onClick={exportConversation}
                  className="group relative px-4 py-2.5 bg-indigo-500/20 backdrop-blur-xl hover:bg-indigo-500/30 rounded-xl text-indigo-100 text-sm font-medium transition-all duration-300 border border-indigo-400/30 hover:border-indigo-400/50 hover-lift shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Exporter"
                  disabled={messages.length === 0}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">📥</span>
                    <span>Export</span>
                  </span>
                </button>

                <button
                  onClick={clearChat}
                  className="group relative px-4 py-2.5 bg-rose-500/20 backdrop-blur-xl hover:bg-rose-500/30 rounded-xl text-rose-100 text-sm font-medium transition-all duration-300 border border-rose-400/30 hover:border-rose-400/50 hover-lift shadow-lg"
                  title="Effacer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🗑️</span>
                    <span>Effacer</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* History Sidebar - Enhanced */}
          {showHistory && (
            <div className="bg-gradient-to-r from-purple-600/95 via-violet-600/95 to-fuchsia-600/95 backdrop-blur-xl border-b border-white/20 animate-slide-in-up">
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">📚</span>
                    Historique des conversations
                  </h2>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center border border-white/20 hover:border-white/40"
                  >
                    ✖️
                  </button>
                </div>
                <div className="max-h-[35vh] overflow-y-auto pr-2 space-y-3">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">
                        💭
                      </div>
                      <p className="text-white/70 text-sm">
                        Aucune conversation sauvegardée
                      </p>
                      <p className="text-white/50 text-xs mt-2">
                        Commencez à discuter et sauvegardez vos conversations
                      </p>
                    </div>
                  ) : (
                    conversations.map((conv, index) => (
                      <div
                        key={conv.id}
                        className="group bg-white/10 backdrop-blur-xl hover:bg-white/20 p-4 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/40 hover-lift cursor-pointer animate-slide-in-right"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <button
                            onClick={() => loadConversation(conv.id)}
                            className="flex-1 text-left"
                          >
                            <p className="font-semibold text-white truncate group-hover:text-white/90">
                              {conv.title}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-white/60">
                                {new Date(conv.date).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                              <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70">
                                {conv.messages.length} messages
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => deleteConversation(conv.id)}
                            className="w-9 h-9 bg-rose-500/20 hover:bg-rose-500/40 backdrop-blur-xl rounded-lg flex items-center justify-center transition-all duration-300 border border-rose-400/30 hover:border-rose-400/60"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Prompt Library - Enhanced */}
          {showPromptLibrary && (
            <div className="bg-gradient-to-r from-amber-600/95 via-orange-600/95 to-rose-600/95 backdrop-blur-xl border-b border-white/20 animate-slide-in-up">
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">⚡</span>
                    Bibliothèque de Prompts
                  </h2>
                  <button
                    onClick={() => setShowPromptLibrary(false)}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center border border-white/20 hover:border-white/40"
                  >
                    ✖️
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-2">
                  {promptTemplates.map((template, index) => (
                    <button
                      key={template.id}
                      onClick={() => usePromptTemplate(template.prompt)}
                      className="group bg-white/10 backdrop-blur-xl hover:bg-white/20 p-4 rounded-xl transition-all duration-300 text-left border border-white/20 hover:border-white/40 hover-lift animate-slide-in-right"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <p className="font-bold text-white mb-2 flex items-center gap-2">
                        <span>{template.title.split(" ")[0]}</span>
                        <span>
                          {template.title.substring(
                            template.title.indexOf(" ") + 1
                          )}
                        </span>
                      </p>
                      <p className="text-sm text-white/70 line-clamp-2 group-hover:text-white/90 transition-colors">
                        {template.prompt}
                      </p>
                      <div className="mt-3 flex items-center text-xs text-white/50 group-hover:text-white/70">
                        <span>Cliquez pour utiliser</span>
                        <span className="ml-auto">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages Area - Enhanced */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center animate-fade-in">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="w-24 h-24 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-6 text-6xl border border-white/10 animate-pulse-slow">
                    💬
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">
                    Commencez une nouvelle conversation
                  </h2>
                  <p className="text-white/60 text-lg mb-8">
                    Posez n'importe quelle question à l'IA
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-400/20 rounded-2xl p-5 hover-lift">
                      <div className="text-3xl mb-3">⚡</div>
                      <h3 className="text-white font-semibold mb-2">
                        Ultra Rapide
                      </h3>
                      <p className="text-white/60 text-sm">
                        Réponses en quelques secondes avec fallback automatique
                      </p>
                    </div>

                    <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-400/20 rounded-2xl p-5 hover-lift">
                      <div className="text-3xl mb-3">🎯</div>
                      <h3 className="text-white font-semibold mb-2">
                        3 Modèles
                      </h3>
                      <p className="text-white/60 text-sm">
                        Basculement automatique entre les meilleurs modèles IA
                      </p>
                    </div>

                    <div className="bg-purple-500/10 backdrop-blur-xl border border-purple-400/20 rounded-2xl p-5 hover-lift">
                      <div className="text-3xl mb-3">💾</div>
                      <h3 className="text-white font-semibold mb-2">
                        Sauvegarde
                      </h3>
                      <p className="text-white/60 text-sm">
                        Historique illimité et export de vos conversations
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } message-bubble`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div
                  className={`max-w-[85%] lg:max-w-[75%] relative group ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-3xl rounded-br-lg shadow-lg shadow-purple-500/20"
                      : "glass-morphism-strong text-white rounded-3xl rounded-bl-lg"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                          msg.role === "user"
                            ? "bg-white/20 backdrop-blur-xl"
                            : "bg-gradient-to-br from-amber-400 to-orange-500"
                        }`}
                      >
                        {msg.role === "user" ? "👤" : "🤖"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold opacity-90 mb-2">
                          {msg.role === "user" ? "Vous" : "Assistant IA"}
                        </p>
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    </div>

                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                        <button
                          onClick={() => copyMessage(msg.content)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-lg text-xs font-medium text-white/80 hover:text-white transition-all duration-300 border border-white/10 hover:border-white/30"
                          title="Copier"
                        >
                          <span>📋</span>
                          <span>Copier</span>
                        </button>
                        <div className="text-xs text-white/40 ml-auto">
                          {new Date().toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-slide-in-up">
                <div className="glass-morphism-strong rounded-3xl rounded-bl-lg p-5 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-lg">
                      🤖
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce delay-100"></div>
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce delay-200"></div>
                      <span className="ml-3 text-white/80 text-sm font-medium">
                        L'IA réfléchit...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Enhanced */}
          <div className="relative bg-gradient-to-r from-slate-900/80 via-purple-900/80 to-slate-900/80 backdrop-blur-xl border-t border-white/10">
            <form onSubmit={sendMessage} className="p-6 lg:p-8">
              <div className="flex gap-3 flex-col sm:flex-row items-stretch">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Posez votre question à l'IA..."
                    className="w-full px-6 py-4 lg:py-5 rounded-2xl glass-morphism-strong text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-300 text-[15px]"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        sendMessage(e);
                      }
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {input.length > 0 && (
                      <span className="text-xs text-white/40 font-medium">
                        {input.length}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="group relative px-8 py-4 lg:py-5 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 text-white rounded-2xl font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-95 min-w-[140px]"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span className="animate-spin text-xl">⏳</span>
                        <span className="hidden sm:inline">Envoi...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">📤</span>
                        <span>Envoyer</span>
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Info Bar */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/50">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg backdrop-blur-xl border border-white/10">
                  <span className="text-purple-400">⌨️</span>
                  <span>Ctrl+Enter pour envoyer</span>
                </div>

                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg backdrop-blur-xl border border-white/10">
                  <span className="text-blue-400">💬</span>
                  <span>{messages.length} messages</span>
                </div>

                {currentConversationId && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg backdrop-blur-xl border border-emerald-400/20">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-emerald-300">Sauvegardée</span>
                  </div>
                )}

                <div className="ml-auto hidden sm:flex items-center gap-2 text-white/40">
                  <span>Propulsé par</span>
                  <span className="font-bold text-white/60">OpenRouter AI</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
