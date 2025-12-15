"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

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
  const [rateLimitReset, setRateLimitReset] = useState(null);
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
      if (conv && JSON.stringify(conv.messages) !== JSON.stringify(messages)) {
        setMessages([...conv.messages]);
        setSelectedModel(conv.model);
      }
    }
  }, [currentConversationId]);

  const freeModels = [
    {
      id: "mistralai/mistral-7b-instruct:free",
      name: "⭐ Mistral 7B",
    },
    {
      id: "google/gemini-2.0-flash-exp:free",
      name: "⚡ Gemini 2.0",
    },
    {
      id: "openai/gpt-5-image-mini",
      name: "🎨 GPT-5 Image (Test)",
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

    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel,
        }),
      });

      const data = await res.json();

      let finalMessages = updatedMessages;
      if (data.error) {
        console.error("Erreur API:", data);

        // Extraire le timestamp de réinitialisation si disponible
        if (data.error.includes("Rate limit exceeded")) {
          setRateLimitReset(Date.now() + 3600000); // 1 heure par défaut
        }

        finalMessages = [
          ...updatedMessages,
          { role: "assistant", content: `❌ Erreur: ${data.error}` },
        ];
        setMessages(finalMessages);
      } else if (!data.content) {
        console.error("Pas de contenu dans la réponse:", data);
        finalMessages = [
          ...updatedMessages,
          {
            role: "assistant",
            content: "❌ Réponse vide du serveur. Réessayez.",
          },
        ];
        setMessages(finalMessages);
      } else {
        console.log(
          "✅ Réponse reçue:",
          data.content.substring(0, 100) + "..."
        );
        finalMessages = [
          ...updatedMessages,
          { role: "assistant", content: data.content },
        ];
        setMessages(finalMessages);
      }

      // Sauvegarder automatiquement après chaque réponse
      autoSaveConversation(finalMessages);
    } catch (error) {
      const finalMessages = [
        ...updatedMessages,
        {
          role: "assistant",
          content: "❌ Erreur de connexion. Veuillez réessayer.",
        },
      ];
      setMessages(finalMessages);
      autoSaveConversation(finalMessages);
    }

    setLoading(false);
  };

  const autoSaveConversation = (messagesToSave) => {
    if (messagesToSave.length === 0) return;

    const title =
      messagesToSave[0]?.content.substring(0, 50) +
      (messagesToSave[0]?.content.length > 50 ? "..." : "");
    const conv = {
      id: currentConversationId || Date.now().toString(),
      title,
      messages: messagesToSave,
      date: new Date().toISOString(),
      model: selectedModel,
    };

    if (currentConversationId) {
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConversationId ? conv : c))
      );
    } else {
      setConversations((prev) => [conv, ...prev]);
      setCurrentConversationId(conv.id);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const saveConversation = () => {
    if (messages.length === 0) return;

    const title =
      messages[0]?.content.substring(0, 50) +
      (messages[0]?.content.length > 50 ? "..." : "");
    const conv = {
      id: currentConversationId || Date.now().toString(),
      title,
      messages,
      date: new Date().toISOString(),
      model: selectedModel,
    };

    if (currentConversationId) {
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConversationId ? conv : c))
      );
    } else {
      setConversations((prev) => [conv, ...prev]);
      setCurrentConversationId(conv.id);
    }
  };

  const loadConversation = (id) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setCurrentConversationId(id);
      setMessages([...conv.messages]); // Créer une copie pour éviter les références
      setSelectedModel(conv.model);
    }
  };

  const deleteConversation = (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      newConversation();
    }
  };

  const clearAllHistory = () => {
    if (confirm("Voulez-vous vraiment supprimer tout l'historique ?")) {
      setConversations([]);
      localStorage.removeItem("aiChatConversations");
      newConversation();
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  const exportConversation = () => {
    if (messages.length === 0) return;
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
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Header Fine - Style ChatGPT */}
      <header className="flex-shrink-0 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo et titre */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center text-lg">
              🤖
            </div>
            <span className="font-semibold text-white text-sm hidden sm:inline">
              AI Chat
            </span>
          </div>

          {/* Contrôles */}
          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500 hover:bg-white/10 transition-all"
            >
              {freeModels.map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  className="bg-slate-800"
                >
                  {model.name}
                </option>
              ))}
            </select>

            <button
              onClick={newConversation}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white"
              title="Nouvelle conversation"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white relative"
              title="Historique"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {conversations.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white">
                  {conversations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowPromptLibrary(!showPromptLibrary)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white"
              title="Prompts"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </button>

            <button
              onClick={exportConversation}
              disabled={messages.length === 0}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white disabled:opacity-30"
              title="Exporter"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebars */}
      {showHistory && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/98 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Historique</h2>
              <div className="flex items-center gap-2">
                {conversations.length > 0 && (
                  <button
                    onClick={clearAllHistory}
                    className="px-3 py-1.5 text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 rounded-lg transition-all border border-rose-500/30"
                    title="Tout supprimer"
                  >
                    🗑️ Tout effacer
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 hover:bg-white/10 rounded-lg flex items-center justify-center text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">
                  Aucune conversation
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/10"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <button
                        onClick={() => {
                          loadConversation(conv.id);
                          setShowHistory(false);
                        }}
                        className="flex-1 text-left"
                      >
                        <p className="text-white text-sm font-medium truncate">
                          {conv.title}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          {new Date(conv.date).toLocaleDateString("fr-FR")} •{" "}
                          {conv.messages.length} msgs
                        </p>
                      </button>
                      <button
                        onClick={() => deleteConversation(conv.id)}
                        className="p-1 hover:bg-rose-500/20 rounded text-rose-400"
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

      {showPromptLibrary && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowPromptLibrary(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-96 bg-slate-900/98 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">
                Bibliothèque de Prompts
              </h2>
              <button
                onClick={() => setShowPromptLibrary(false)}
                className="w-8 h-8 hover:bg-white/10 rounded-lg flex items-center justify-center text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {promptTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => usePromptTemplate(template.prompt)}
                  className="w-full bg-white/5 hover:bg-white/10 p-3 rounded-lg text-left border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  <p className="text-white text-sm font-medium mb-1">
                    {template.title}
                  </p>
                  <p className="text-white/40 text-xs line-clamp-2">
                    {template.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Zone de messages - Prend tout l'espace */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">
                  💬
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Comment puis-je vous aider ?
                </h2>
                <p className="text-white/50 text-sm">
                  Posez n'importe quelle question à l'IA
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                      🤖
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800/80 text-white border border-white/10"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content}
                      </p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            h1: ({ node, ...props }) => (
                              <h1
                                className="text-xl font-bold mb-2 text-white"
                                {...props}
                              />
                            ),
                            h2: ({ node, ...props }) => (
                              <h2
                                className="text-lg font-bold mb-2 text-white"
                                {...props}
                              />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3
                                className="text-base font-bold mb-1 text-white"
                                {...props}
                              />
                            ),
                            p: ({ node, ...props }) => (
                              <p
                                className="mb-2 text-white/90 leading-relaxed"
                                {...props}
                              />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong
                                className="font-bold text-white"
                                {...props}
                              />
                            ),
                            em: ({ node, ...props }) => (
                              <em className="italic text-white/95" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul
                                className="list-disc list-inside mb-2 space-y-1"
                                {...props}
                              />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol
                                className="list-decimal list-inside mb-2 space-y-1"
                                {...props}
                              />
                            ),
                            li: ({ node, ...props }) => (
                              <li className="text-white/90" {...props} />
                            ),
                            code: ({ node, inline, ...props }) =>
                              inline ? (
                                <code
                                  className="bg-slate-700/50 px-1.5 py-0.5 rounded text-sm text-violet-300"
                                  {...props}
                                />
                              ) : (
                                <code
                                  className="block bg-slate-700/50 p-3 rounded-lg text-sm overflow-x-auto text-violet-300"
                                  {...props}
                                />
                              ),
                            blockquote: ({ node, ...props }) => (
                              <blockquote
                                className="border-l-4 border-violet-500 pl-4 italic text-white/80"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => copyMessage(msg.content)}
                        className="mt-2 text-xs text-white/40 hover:text-white/80 transition-colors"
                      >
                        📋 Copier
                      </button>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                      👤
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center text-lg">
                    🤖
                  </div>
                  <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-white/10">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixé en bas */}
      <div className="flex-shrink-0 border-t border-white/10 bg-slate-900/80 backdrop-blur-xl">
        {rateLimitReset && (
          <div className="max-w-3xl mx-auto px-4 pt-3">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
              <p className="text-amber-300 text-sm">
                ⚠️ Limite journalière atteinte (50 requêtes/jour).
                <a
                  href="https://openrouter.ai/settings/credits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold hover:text-amber-200 ml-1"
                >
                  Ajoutez 10$ pour débloquer 1000 req/jour
                </a>
              </p>
            </div>
          </div>
        )}
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    sendMessage(e);
                  }
                }}
                placeholder="Envoyez un message..."
                rows="1"
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                style={{ minHeight: "48px", maxHeight: "200px" }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-2xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <span>Envoyer</span>
                  <span>📤</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
            <span>Ctrl+Enter pour envoyer</span>
            {currentConversationId && (
              <>
                <span>•</span>
                <span className="text-emerald-400">✓ Sauvegardée</span>
              </>
            )}
            <button
              type="button"
              onClick={saveConversation}
              disabled={messages.length === 0}
              className="ml-auto text-white/60 hover:text-white disabled:opacity-30 transition-colors"
            >
              💾 Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
